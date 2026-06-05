import React, { useState, useEffect } from 'react';
import { UserProfile, Bet, BalloonResult } from '../types';
import { Sparkles, Coins, AlertTriangle, ArrowRight, ShieldAlert, Trophy } from 'lucide-react';

interface BalloonGameViewProps {
  user: UserProfile;
  onUpdateBalance: (newBalance: number) => void;
  onAddBetHistory: (bet: Bet) => void;
  onSelectTab: (tab: any) => void;
}

export default function BalloonGameView({ user, onUpdateBalance, onAddBetHistory, onSelectTab }: BalloonGameViewProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(24);
  const [periodNo, setPeriodNo] = useState(1036);
  const [betAmount, setBetAmount] = useState('');
  const [selectedBalloon, setSelectedBalloon] = useState<'A' | 'B' | null>(null); // A: Green, B: Red

  const [history, setHistory] = useState<BalloonResult[]>([
    { period: 1035, winnerColor: 'green', timestamp: '10:35' },
    { period: 1034, winnerColor: 'red', timestamp: '10:34' },
    { period: 1033, winnerColor: 'green', timestamp: '10:33' },
    { period: 1032, winnerColor: 'red', timestamp: '10:32' },
    { period: 1031, winnerColor: 'red', timestamp: '10:31' },
  ]);

  const [activeWagers, setActiveWagers] = useState<{ amount: number; balloon: 'A' | 'B' }[]>([]);
  
  // Deduction 2-second animation overlay
  const [deductionAnim, setDeductionAnim] = useState<{ active: boolean; amount: number; selection: string } | null>(null);
  
  // Notification state to replace alerts
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Overlay modals
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [showLossOverlay, setShowLossOverlay] = useState(false);
  const [lastWagerDetails, setLastWagerDetails] = useState({
    wagered: 0,
    won: 0,
    color: 'green' as 'green' | 'red'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (secondsRemaining <= 1) {
        setSecondsRemaining(24); // Reset to standard 24 seconds as shown in Screen 7, 10
        resolveRound();
      } else {
        setSecondsRemaining(secondsRemaining - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining, activeWagers]);

  const resolveRound = () => {
    // Generate result randomly with option to override
    let winnerColor: 'green' | 'red' = Math.random() > 0.5 ? 'green' : 'red';

    // Read synchronous local storage presets (representing 'the save panel outcome')
    const localOverrideStr = localStorage.getItem('tampa_result_presets');
    if (localOverrideStr) {
      try {
        const overrides = JSON.parse(localOverrideStr);
        if (overrides.balloon && overrides.balloon !== 'random') {
          winnerColor = overrides.balloon as 'green' | 'red';
          
          // Reset this preset back to 'random'
          overrides.balloon = 'random';
          localStorage.setItem('tampa_result_presets', JSON.stringify(overrides));
          
          // Asynchronously clear preset on Firestore
          import('../firebase').then(({ db }) => {
            import('firebase/firestore').then(({ doc, setDoc }) => {
              setDoc(doc(db, 'presets', 'result_override'), overrides).catch(e => {
                console.warn("Could not sync cleared preset to Firestore:", e);
              });
            });
          });
        }
      } catch (err) {
        console.warn(err);
      }
    }

    const nextPeriod = periodNo + 1;

    const newResult: BalloonResult = {
      period: periodNo,
      winnerColor: winnerColor,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setHistory((prev) => [newResult, ...prev]);
    setPeriodNo(nextPeriod);

    // Check multiple active wagers
    if (activeWagers.length > 0) {
      let totalWagered = 0;
      let totalWon = 0;

      activeWagers.forEach(wager => {
        totalWagered += wager.amount;
        const predictedWinner = wager.balloon === 'A' ? 'green' : 'red';
        const isWin = predictedWinner === winnerColor;
        const profit = isWin ? wager.amount * 2 : 0;
        totalWon += profit;

        onAddBetHistory({
          period: periodNo,
          type: predictedWinner === 'green' ? 'balloon-green' : 'balloon-red',
          amount: wager.amount,
          timestamp: new Date().toLocaleTimeString()
        });
      });

      setLastWagerDetails({
        wagered: totalWagered,
        won: totalWon,
        color: winnerColor
      });

      if (totalWon > 0) {
        onUpdateBalance(user.balance + totalWon);
        setShowWinOverlay(true);
        setShowLossOverlay(false);
        setTimeout(() => {
          setShowWinOverlay(false);
        }, 2000);
      } else {
        setShowLossOverlay(true);
        setShowWinOverlay(false);
        setTimeout(() => {
          setShowLossOverlay(false);
         }, 2000);
      }

      setActiveWagers([]);
    }
  };

  const handleConfirmBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('error', 'Please enter a valid bet amount.');
      return;
    }
    if (!selectedBalloon) {
      showNotification('error', 'Please select either BALLOON A or BALLOON B.');
      return;
    }

    const fee = amount * 0.02;
    const totalCost = amount + fee;

    if (totalCost > user.balance) {
      showNotification('error', `Insufficient wallet balance! (Required: BD ${totalCost.toFixed(3)} including 2% fee)`);
      return;
    }

    // Deduct wager and 2% fee instantly
    onUpdateBalance(user.balance - totalCost);
    setActiveWagers(prev => [
      ...prev,
      {
        amount: amount,
        balloon: selectedBalloon
      }
    ]);
    setBetAmount('');
    showNotification('success', `Quest bet of BD •••• placed instantly on Balloon ${selectedBalloon}! (2% Fee BD •••• deducted)`);
  };

  return (
    <div className="space-y-6 pb-24 relative">
      
      {/* Inline Notification Alert Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-sm transition-all animate-in fade-in duration-350 flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-950 text-emerald-200 border border-emerald-900/40' 
            : notification.type === 'error'
            ? 'bg-rose-950 text-rose-250 border border-rose-900/40'
            : 'bg-indigo-950 text-indigo-200 border border-indigo-900/40'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-black text-sm opacity-70 hover:opacity-100 ml-3 shrink-0">×</button>
        </div>
      )}

      {/* 1. Top Balance Card */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Abstract circuits background */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-[linear-gradient(to_right,#00A79D_1px,transparent_1px)] bg-[size:10px_10px] opacity-[0.05]" />
        
        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-1">
            <p className="text-[10px] font-black tracking-widest text-[#00A79D] uppercase">
              Aqua Quest Wallet
            </p>
            <h4 className="text-3xl font-black text-[#FFA07A] leading-none">
              BD {user.balance.toFixed(3)}
            </h4>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => onSelectTab('wallet')}
              className="bg-teal-500/10 hover:bg-teal-500/20 text-[#43C6AC] text-[10px] font-black tracking-widest px-3 py-2 rounded-xl uppercase border border-teal-500/10"
            >
              Deposit
            </button>
            <button
              onClick={() => onSelectTab('wallet')}
              className="bg-orange-500/10 hover:bg-orange-500/20 text-[#FF6B53] text-[10px] font-black tracking-widest px-3 py-2 rounded-xl uppercase border border-orange-500/10"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Game Stage (Symmetric Balloons with visual states as Screen 10) */}
      <div className="bg-[#e9eff2] p-6 rounded-3xl border border-slate-200/60 shadow-inner relative space-y-6">
        
        {/* Absolute Header Ribbon */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-[#00A79D] uppercase tracking-widest bg-white/80 py-1 px-3 rounded-full border border-teal-100">
            🎈 Duel Circuit
          </span>
          <div className="bg-[#1e293b] text-white font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining} SEC</span>
          </div>
        </div>

        {/* Outer Arena representation */}
        <div className="grid grid-cols-2 gap-4 items-center">
          
          {/* BALLOON A - Green */}
          <div 
            onClick={() => setSelectedBalloon('A')}
            className={`cursor-pointer rounded-2xl bg-white/90 p-4 border transition-all flex flex-col items-center justify-between h-48 relative overflow-hidden ${
              selectedBalloon === 'A' 
                ? 'border-emerald-500 ring-4 ring-emerald-500/10 scale-102 shadow-lg' 
                : 'border-slate-200 hover:border-emerald-200'
            }`}
          >
            {/* Glossy Green Balloon Asset using absolute element CSS */}
            <div className="relative w-16 h-20 flex items-center justify-center">
              <div className="absolute w-14 h-16 bg-gradient-to-tr from-emerald-600 via-green-400 to-emerald-100 rounded-full shadow-lg shadow-green-500/20" />
              <div className="absolute bottom-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-emerald-600" />
              <div className="absolute bottom-[-18px] w-0.5 h-6 bg-slate-300" />
            </div>

            <div className="text-center space-y-1 relative z-10 w-full">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">BALLOON A</span>
              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 py-0.5 px-3 rounded-full uppercase tracking-widest">
                GREEN
              </span>
            </div>
          </div>

          {/* BALLOON B - Red */}
          <div 
            onClick={() => setSelectedBalloon('B')}
            className={`cursor-pointer rounded-2xl bg-white/90 p-4 border transition-all flex flex-col items-center justify-between h-48 relative overflow-hidden ${
              selectedBalloon === 'B' 
                ? 'border-red-500 ring-4 ring-red-500/10 scale-102 shadow-lg' 
                : 'border-slate-200 hover:border-red-200'
            }`}
          >
            {/* Red balloon drawing */}
            <div className="relative w-16 h-20 flex items-center justify-center">
              <div className="absolute w-14 h-16 bg-gradient-to-tr from-red-600 via-rose-400 to-orange-100 rounded-full shadow-lg shadow-red-500/20" />
              <div className="absolute bottom-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-600" />
              <div className="absolute bottom-[-18px] w-0.5 h-6 bg-slate-300" />
            </div>

            <div className="text-center space-y-1 relative z-10 w-full">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">BALLOON B</span>
              <span className="text-[11px] font-black text-red-600 bg-red-50 py-0.5 px-3 rounded-full uppercase tracking-widest">
                RED
              </span>
            </div>
          </div>

        </div>

        {/* Central Wager Details display */}
        <div className="bg-slate-900/5 p-4 rounded-2xl border border-slate-200/50 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selected Object</span>
            <p className="text-sm font-extrabold text-slate-700">
              {selectedBalloon ? `Balloon ${selectedBalloon} (${selectedBalloon === 'A' ? 'Green' : 'Red'})` : 'No selection'}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Multiplier</span>
            <p className="text-sm font-black text-emerald-600">2.0x Double</p>
          </div>
        </div>
      </div>

      {/* 3. Bet Input Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-md space-y-4">
        {activeWagers.length > 0 && (
          <div className="bg-teal-950/40 border border-teal-900/40 p-4 rounded-[20px] space-y-2 text-xs text-teal-200">
            <span className="font-bold flex items-center gap-1.5 text-teal-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              Activated Quest Bets ({activeWagers.length}):
            </span>
            <div className="divide-y divide-teal-900/40 max-h-24 overflow-y-auto pr-1">
              {activeWagers.map((w, index) => (
                <div key={index} className="flex justify-between items-center py-1 font-mono text-[11px] font-bold text-teal-100">
                  <span>Bet #{index + 1}: Balloon {w.balloon} ({w.balloon === 'A' ? 'Green' : 'Red'})</span>
                  <span className="text-teal-300">BD •••• (+2% fee)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">
            Wagered Amount (BD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Coins size={16} />
            </span>
            <input
              type="number"
              placeholder="Enter Bet Amount"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A79D] focus:border-transparent transition-all font-mono font-bold"
            />
          </div>
        </div>

        <button
          onClick={handleConfirmBet}
          className="w-full bg-gradient-to-r from-[#00A79D] to-[#43C6AC] hover:from-[#43C6AC] hover:to-[#00A79D] text-white font-black py-4.5 rounded-2xl shadow-lg shadow-teal-500/15 text-sm uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
        >
          CONFIRM QUEST BET
        </button>
      </div>

      {/* 4. Column displays for Last 10 Balloon Results */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
        <h4 className="text-xs font-black tracking-widest text-[#00A79D] uppercase px-1">
          Last 5 Balloon Results
        </h4>

        <div className="overflow-hidden border border-slate-100 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider text-left border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Period No</th>
                <th className="py-2.5 px-4">Winning Color</th>
                <th className="py-2.5 px-4 text-right">Revealed Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold">{h.period}</td>
                  <td className="py-3 px-4 uppercase font-black text-xs">
                    <span className={h.winnerColor === 'green' ? 'text-emerald-600' : 'text-red-500'}>
                      {h.winnerColor}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-block py-1 px-3.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      h.winnerColor === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {h.winnerColor === 'green' ? 'Victory' : 'Explosion'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Congratulations Result modal representing Victory */}
      {showWinOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#0b0f19] to-[#111827] text-white rounded-[32px] p-8 max-w-sm w-full border border-teal-500 shadow-2xl text-center space-y-6 transform scale-100 animate-in zoom-in-95 duration-300">
            {/* Spinning Golden Trophy indicator */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#00A79D]/25 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-teal-500/30 border-t-[#00A79D] animate-spin" />
              <div className="w-16 h-16 bg-gradient-to-tr from-[#00A79D] to-[#43C6AC] rounded-full flex items-center justify-center shadow-lg transform -rotate-12 animate-bounce">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#00A79D] uppercase bg-teal-950 text-teal-300 px-3.5 py-1 rounded-full border border-teal-900/40">
                ⭐ BALLOON VICTORY ⭐
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                BID COINS COLLECTED
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-normal">
                Wager match on <span className="text-teal-400 font-black underline">{lastWagerDetails.color.toUpperCase()}</span> succeeded. 
                Your wager of <span className="text-[#FFA07A] font-mono">BD ••••</span> got doubled!
              </p>
            </div>

            <div className="bg-teal-950/40 p-4 rounded-2xl border border-teal-900/40 flex items-center justify-between text-left font-mono">
              <span className="text-[10px] font-bold text-slate-405 uppercase">INSTANT CREATION</span>
              <span className="text-[#00A79D] font-black text-sm">+BD ••••</span>
            </div>

            <div className="bg-slate-900 py-2 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse border border-slate-800">
              ⚡ Closing automatically in 2s
            </div>
          </div>
        </div>
      )}

      {/* 6. Loss Result Modal representing Explosion */}
      {showLossOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#0b0f19] to-[#111827] text-white rounded-[32px] p-8 max-w-sm w-full border border-red-500 shadow-2xl text-center space-y-6 transform scale-100 animate-in zoom-in-95 duration-300">
            {/* Exploded Ball Icon indicators */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
              <div className="w-16 h-16 bg-gradient-to-tr from-[#FF6B53] to-rose-600 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#FF6B53] uppercase bg-red-950 text-red-300 px-3.5 py-1 rounded-full border border-red-900/40">
                💥 BALLOON POPPED 💥
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                EXPLOSION TRIGGERED
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-normal">
                Perfect pop resolution occurred: {lastWagerDetails.color.toUpperCase()} exploded. 
                Your wager of <span className="text-rose-400 font-mono">BD ••••</span> was deducted.
              </p>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-center gap-1.5 font-mono text-[9.5px] font-bold text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>BD SECURE DISMISSAL SUCCESS</span>
            </div>

            <div className="bg-slate-900 py-2 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-widest border border-slate-800 animate-pulse">
              ⌛ Closing automatically in 2s
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
