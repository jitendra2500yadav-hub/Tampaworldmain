import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Bet, GameResult } from '../types';
import { RefreshCw, Coins, ArrowUpRight, ArrowDownLeft, AlertCircle, Sparkles, AlertTriangle, Trophy } from 'lucide-react';

interface BiglyGameViewProps {
  user: UserProfile;
  onUpdateBalance: (newBalance: number) => void;
  onAddBetHistory: (bet: Bet) => void;
  onSelectTab: (tab: any) => void;
}

export default function BiglyGameView({ user, onUpdateBalance, onAddBetHistory, onSelectTab }: BiglyGameViewProps) {
  // Game state
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [periodNo, setPeriodNo] = useState(1036);
  const [betAmount, setBetAmount] = useState('');
  const [selectedSize, setSelectedSize] = useState<'small' | 'big' | null>(null);
  
  // Game histories
  const [history, setHistory] = useState<GameResult[]>([
    { period: 1035, digit: 3, size: 'small', timestamp: '10:35' },
    { period: 1034, digit: 8, size: 'big', timestamp: '10:34' },
    { period: 1033, digit: 2, size: 'small', timestamp: '10:33' },
    { period: 1032, digit: 9, size: 'big', timestamp: '10:32' },
    { period: 1031, digit: 4, size: 'small', timestamp: '10:31' },
    { period: 1030, digit: 7, size: 'big', timestamp: '10:30' },
  ]);

  // Active wager info
  const [activeWagers, setActiveWagers] = useState<{ amount: number; size: 'small' | 'big' }[]>([]);

  // Deduction 2-second animation overlay
  const [deductionAnim, setDeductionAnim] = useState<{ active: boolean; amount: number; selection: string } | null>(null);

  // Notification state to replace browser alerts
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Overlay state
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [showLossOverlay, setShowLossOverlay] = useState(false);
  const [lastOverlayDetails, setLastOverlayDetails] = useState({
    wagered: 0,
    won: 0,
    size: 'small' as 'small' | 'big'
  });

  // Current temporary digit generated during round end
  const [currentResult, setCurrentResult] = useState<GameResult>({
    period: 1035,
    digit: 3,
    size: 'small',
    timestamp: '10:35'
  });

  // Timer simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (secondsRemaining <= 1) {
        setSecondsRemaining(30); // Reset countdown to 30
        resolveRound();
      } else {
        setSecondsRemaining(secondsRemaining - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining, activeWagers]);

  const resolveRound = () => {
    let size: 'small' | 'big' = Math.random() > 0.5 ? 'big' : 'small';
    let randomDigit = size === 'small' ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 5) + 5; // 1-4 small, 5-9 big

    // Read synchronous local storage presets (representing 'the save panel outcome')
    const localOverrideStr = localStorage.getItem('tampa_result_presets');
    if (localOverrideStr) {
      try {
        const overrides = JSON.parse(localOverrideStr);
        if (overrides.bigly && overrides.bigly !== 'random') {
          size = overrides.bigly as 'small' | 'big';
          randomDigit = size === 'small' ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 5) + 5;
          
          // Reset this preset back to 'random'
          overrides.bigly = 'random';
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
    
    const newResult: GameResult = {
      period: periodNo,
      digit: randomDigit,
      size: size,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update history
    setHistory(prev => [newResult, ...prev]);
    setCurrentResult(newResult);
    setPeriodNo(nextPeriod);

    // Check custom wager outcome for all placed bets
    if (activeWagers.length > 0) {
      let totalWagered = 0;
      let totalWon = 0;

      activeWagers.forEach(wager => {
        totalWagered += wager.amount;
        const isWin = wager.size === size;
        const profit = isWin ? wager.amount * 2 : 0;
        totalWon += profit;

        onAddBetHistory({
          period: periodNo,
          type: wager.size,
          amount: wager.amount,
          timestamp: new Date().toLocaleTimeString()
        });
      });

      setLastOverlayDetails({
        wagered: totalWagered,
        won: totalWon,
        size: activeWagers.map(w => w.size.toUpperCase()).join(' & ')
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

      // Clear active wagers
      setActiveWagers([]);
    }
  };

  const handleConfirmBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('error', 'Please enter a valid bet amount.');
      return;
    }
    if (!selectedSize) {
      showNotification('error', 'Please select either SMALL or BIG.');
      return;
    }

    const fee = amount * 0.02;
    const totalCost = amount + fee;

    if (totalCost > user.balance) {
      showNotification('error', `Insufficient wallet balance! (Required: BD ${totalCost.toFixed(3)} including 2% fee)`);
      return;
    }

    // Deduct wager & fee instantly with zero wait times
    onUpdateBalance(user.balance - totalCost);
    setActiveWagers(prev => [
      ...prev,
      {
        amount: amount,
        size: selectedSize
      }
    ]);
    setBetAmount('');
    showNotification('success', `Wager of BD •••• placed instantly on ${selectedSize.toUpperCase()}! (2% Fee BD •••• deducted)`);
  };

  return (
    <div className="space-y-6 pb-24 relative">
      
      {/* Inline Notification Alert Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-sm transition-all animate-in fade-in duration-350 flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-250'
            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-black text-sm opacity-70 hover:opacity-100 ml-3 shrink-0">×</button>
        </div>
      )}
      
      {/* 1. Wallet Balance / Top Panel */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-xs font-black tracking-widest text-[#00A79D] uppercase">
              Predictive Wallet Balance
            </p>
            <h4 className="text-3xl font-black text-[#FF6B53]">
              BD {user.balance.toFixed(3)}
            </h4>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => onSelectTab('wallet')}
              className="bg-teal-50 hover:bg-teal-100 text-[#00A79D] text-[10px] font-black tracking-widest px-3 py-2 rounded-xl flex items-center gap-1 uppercase"
            >
              Deposit
            </button>
            <button
              onClick={() => onSelectTab('wallet')}
              className="bg-coral-50 hover:bg-coral-100 text-[#FF6B53] text-[10px] font-black tracking-widest px-3 py-2 rounded-xl flex items-center gap-1 uppercase"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-time Circular Countdown Timer */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Countdown circular SVG gradient track */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-slate-100"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-[#00A79D] transition-all duration-1000"
                strokeWidth="5"
                strokeDasharray={176}
                strokeDashoffset={176 - (176 * secondsRemaining) / 30}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-sm font-black text-slate-800">{secondsRemaining}</span>
              <p className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">Sec</p>
            </div>
          </div>

          <div>
            <span className="text-[10px] tracking-widest font-black text-slate-400 uppercase">ACTIVE PERIOD</span>
            <h5 className="text-xl font-bold text-slate-800">No. {periodNo}</h5>
          </div>
        </div>

        <div className="text-right">
          <h5 className="text-2xl font-black text-[#FF6B53] font-mono tracking-wider">
            00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
          </h5>
          <p className="text-[9px] font-black tracking-widest text-[#00A79D] uppercase">
            Seconds Remaining
          </p>
        </div>
      </div>

      {/* 3. Number/Digits Selection matching Screenshot 4 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
            DIGIT CLASSIFIER
          </span>
          <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
            1-9 System
          </span>
        </div>

        {/* Big digits rows */}
        <div className="grid grid-cols-9 gap-1.5 justify-center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
            const isSmall = digit <= 4;
            const bgClass = isSmall 
              ? 'bg-gradient-to-br from-orange-400 to-[#FF6B53] text-white' 
              : 'bg-gradient-to-br from-teal-400 to-[#00A79D] text-white';
            const shadowColor = isSmall ? 'shadow-orange-500/10' : 'shadow-teal-500/10';

            return (
              <div key={digit} className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-full ${bgClass} ${shadowColor} shadow-md flex items-center justify-center font-black text-xs select-none relative`}>
                  {digit}
                  <span className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSmall ? 'bg-orange-600' : 'bg-teal-600'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Current / Last result readout */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>CURRENT RESULT:</span>
          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-xs ${currentResult.size === 'small' ? 'bg-[#FF6B53]' : 'bg-[#00A79D]'}`}>
              {currentResult.digit}
            </span>
            <span className={`uppercase font-black tracking-widest text-xs ${currentResult.size === 'small' ? 'text-[#FF6B53]' : 'text-[#00A79D]'}`}>
              {currentResult.size}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-center text-slate-400 font-bold tracking-wide uppercase">
          Result Classification: <span className="text-[#FF6B53]">1-4 Small</span>, <span className="text-[#00A79D]">5-9 Big</span>
        </p>
      </div>

      {/* 4. Betting Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
        {activeWagers.length > 0 && (
          <div className="bg-purple-50 border border-purple-100 text-purple-700 text-xs py-3 px-4 rounded-2xl space-y-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              Active Prediction Bets ({activeWagers.length}):
            </span>
            <div className="divide-y divide-purple-100/50 max-h-24 overflow-y-auto pr-1">
              {activeWagers.map((w, index) => (
                <div key={index} className="flex justify-between items-center py-1 font-mono text-[11px] font-bold">
                  <span>Bet #{index + 1}: {w.size.toUpperCase()}</span>
                  <span className="text-purple-900">BD •••• (+2% fee)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selection buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedSize('small')}
            className={`py-3.5 text-center font-black rounded-2xl select-none transition-all cursor-pointer ${
              selectedSize === 'small'
                ? 'bg-gradient-to-br from-orange-400 to-[#FF6B53] text-white scale-[1.02] shadow-lg shadow-orange-500/25 ring-4 ring-orange-500/10'
                : 'bg-orange-50 text-[#FF6B53] hover:bg-orange-100'
            }`}
          >
            SMALL (1-4)
          </button>
          <button
            onClick={() => setSelectedSize('big')}
            className={`py-3.5 text-center font-black rounded-2xl select-none transition-all cursor-pointer ${
              selectedSize === 'big'
                ? 'bg-gradient-to-br from-teal-400 to-[#00A79D] text-white scale-[1.02] shadow-lg shadow-teal-500/25 ring-4 ring-teal-500/10'
                : 'bg-teal-50 text-[#00A79D] hover:bg-teal-100'
            }`}
          >
            BIG (5-9)
          </button>
        </div>

        {/* Bet amount input */}
        <div className="space-y-1">
          <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">
            Wager Amount (BD)
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
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-100 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B53] focus:border-transparent transition-all font-mono font-bold"
            />
          </div>
        </div>

        {/* Confirm Bid Button */}
        <button
          onClick={handleConfirmBet}
          className="w-full bg-gradient-to-r from-[#FF6B53] to-[#ff5237] hover:from-[#ff5237] hover:to-[#ff3f21] text-white font-black py-4.5 rounded-2xl shadow-lg shadow-coral-500/15 text-sm uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
        >
          CONFIRM BET
        </button>
      </div>

      {/* 5. Period History Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h4 className="text-xs font-black tracking-widest text-[#00A79D] uppercase px-1">
          Game Result History
        </h4>

        <div className="overflow-hidden border border-slate-100 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider text-left border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Period No</th>
                <th className="py-2.5 px-4 text-right">Result Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{h.period}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${h.size === 'small' ? 'bg-[#FF6B53]' : 'bg-[#00A79D]'}`}>
                        {h.digit}
                      </span>
                      <span className={`font-black text-xs uppercase tracking-wide ${h.size === 'small' ? 'text-[#FF6B53]' : 'text-[#00A79D]'}`}>
                        {h.size}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CONGRATULATIONS WIN RESULT MODAL OVERLAY */}
      {showWinOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-slate-900 to-[#111827] text-white rounded-[32px] p-8 max-w-sm w-full border border-emerald-500 shadow-2xl text-center space-y-6 transform scale-100 animate-in zoom-in-95 duration-300">
            {/* Pulsing Trophy / Win Circle */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-full flex items-center justify-center shadow-lg transform -rotate-6 animate-bounce">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#00A79D] uppercase bg-emerald-950 text-emerald-300 px-3.5 py-1 rounded-full border border-emerald-900/40">
                ⭐ WINNER CONGRATULATIONS ⭐
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
                BD DOUBLE PAYOUT!
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-normal">
                Your prediction on <span className="text-yellow-300 underline font-black">{lastOverlayDetails.size.toUpperCase()}</span> succeeded. 
                Your wager of <span className="text-teal-400 font-mono">BD ••••</span> was doubled and instantly credited.
              </p>
            </div>

            <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-900/40 flex items-center justify-between text-left font-mono">
              <span className="text-[10px] font-bold text-slate-400 uppercase">INSTANT REWARD</span>
              <span className="text-emerald-400 font-black text-sm">+BD ••••</span>
            </div>

            <div className="bg-slate-900 py-2 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse border border-slate-800">
              ⚡ Closing automatically in 2s
            </div>
          </div>
        </div>
      )}

      {/* 7. SO SAD LOSS RESULT MODAL OVERLAY */}
      {showLossOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-slate-900 to-[#111827] text-white rounded-[32px] p-8 max-w-sm w-full border border-rose-500 shadow-2xl text-center space-y-6 transform scale-100 animate-in zoom-in-95 duration-300">
            {/* Broken Bet Icon */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-500/10 animate-pulse" />
              <div className="w-16 h-16 bg-gradient-to-tr from-[#FF6B53] to-rose-600 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#FF6B53] uppercase bg-rose-950 text-rose-300 px-3.5 py-1 rounded-full border border-rose-900/40">
                😓 BETTER LUCK NEXT TIME 😓
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
                PROGNOSIS LOST
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-normal">
                Your prediction on <span className="text-orange-300 decoration-dotted underline font-black">{lastOverlayDetails.size.toUpperCase()}</span> didn't match the result. 
                Wager of <span className="text-rose-400 font-mono">BD ••••</span> was deducted.
              </p>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-center gap-1.5 font-mono text-[9.5px] font-bold text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>BD WALLET UPDATED SUCCESSFULLY</span>
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
