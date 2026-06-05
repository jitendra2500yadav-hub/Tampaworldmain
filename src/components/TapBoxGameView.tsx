import React, { useState, useEffect } from 'react';
import { UserProfile, Bet, Tab } from '../types';
import { RefreshCw, Navigation, Play, History, Shield, TrendingUp, Sparkles, Coins, Trophy, AlertTriangle } from 'lucide-react';

interface TapBoxGameViewProps {
  user: UserProfile;
  onUpdateBalance: (newBalance: number) => void;
  onAddBetHistory: (bet: Bet) => void;
  onSelectTab: (tab: Tab) => void;
}

interface TapResult {
  period: number;
  winningBox: 'LEFT' | 'RIGHT';
  multiplier: string; // e.g. "3x Winner", "2x"
  winningDigit: number;
}

export default function TapBoxGameView({ user, onUpdateBalance, onAddBetHistory, onSelectTab }: TapBoxGameViewProps) {
  // Config state
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [periodNo, setPeriodNo] = useState(1046);
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');

  // Interactive gameplay state
  const [selectedBox, setSelectedBox] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [activeWagers, setActiveWagers] = useState<{
    box: 'LEFT' | 'RIGHT';
    digit: number;
    amount: number;
    period: number;
  }[]>([]);

  // Overlays
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [showLossOverlay, setShowLossOverlay] = useState(false);
  
  // Deduction 2-second animation overlay
  const [deductionAnim, setDeductionAnim] = useState<{ active: boolean; amount: number; selection: string } | null>(null);

  const [lastWagerDetails, setLastWagerDetails] = useState({
    wagered: 0,
    won: 0,
    box: 'LEFT',
    digit: 0,
    winningBox: 'LEFT',
    winningDigit: 0,
    winningScore: '0x'
  });

  // Game static & simulated histories matching the screenshot precisely
  const [resultsLedger, setResultsLedger] = useState<TapResult[]>([
    { period: 1045, winningBox: 'LEFT', multiplier: '1x Winner', winningDigit: 4 },
    { period: 1044, winningBox: 'RIGHT', multiplier: '3x Winner', winningDigit: 5 },
    { period: 1042, winningBox: 'RIGHT', multiplier: '6x Winner', winningDigit: 8 },
    { period: 1041, winningBox: 'LEFT', multiplier: '2x Winner', winningDigit: 3 },
  ]);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Timer loop
  useEffect(() => {
    const timer = setTimeout(() => {
      if (secondsRemaining <= 1) {
        setSecondsRemaining(30); // Reset
        resolveRound();
      } else {
        setSecondsRemaining(secondsRemaining - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsRemaining, activeWagers]);

  const resolveRound = () => {
    let winningBox: 'LEFT' | 'RIGHT' = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';

    // Read synchronous local storage presets (representing 'the save panel outcome')
    const localOverrideStr = localStorage.getItem('tampa_result_presets');
    if (localOverrideStr) {
      try {
        const overrides = JSON.parse(localOverrideStr);
        if (overrides.tapbox && overrides.tapbox !== 'random') {
          winningBox = overrides.tapbox as 'LEFT' | 'RIGHT';
          
          // Reset this preset back to 'random'
          overrides.tapbox = 'random';
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

    const multiplierVal = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const multiplierText = `${multiplierVal}x Winner`;
    const winningDigit = winningBox === 'LEFT'
      ? [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)]
      : [1, 2, 3, 8, 9][Math.floor(Math.random() * 5)];

    const newResult: TapResult = {
      period: periodNo,
      winningBox,
      multiplier: multiplierText,
      winningDigit
    };

    setResultsLedger(prev => [newResult, ...prev]);
    setPeriodNo(prev => prev + 1);

    // Resolve active wagers
    if (activeWagers.length > 0) {
      let totalWagered = 0;
      let totalWon = 0;

      // Keep details of the first wager for visual matching
      let lastWagerBox = 'LEFT';
      let lastWagerDigit = 0;

      activeWagers.forEach(wager => {
        totalWagered += wager.amount;
        lastWagerBox = wager.box;
        lastWagerDigit = wager.digit;

        const isBoxMatch = wager.box === winningBox;
        const isDigitMatch = wager.digit === winningDigit;

        let wonVal = 0;
        if (isBoxMatch) {
          let rate = 2;
          if (isDigitMatch) {
            rate = multiplierVal * 2;
          }
          wonVal = wager.amount * rate;
        }
        totalWon += wonVal;

        onAddBetHistory({
          period: wager.period,
          type: wager.box === 'LEFT' ? 'small' : 'big', // Match schema
          amount: wager.amount,
          timestamp: new Date().toLocaleTimeString()
        });
      });

      setLastWagerDetails({
        wagered: totalWagered,
        won: totalWon,
        box: lastWagerBox,
        digit: lastWagerDigit,
        winningBox,
        winningDigit,
        winningScore: multiplierText
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

  const handlePlaceWager = () => {
    if (!selectedBox) {
      triggerNotification('error', 'Select a Tap Box (LEFT or RIGHT) to place bet.');
      return;
    }
    if (selectedDigit === null) {
      triggerNotification('error', 'Please select a support digit badge first.');
      return;
    }
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerNotification('error', 'Enter a valid positive wager amount.');
      return;
    }

    const fee = amount * 0.02;
    const totalCost = amount + fee;

    if (totalCost > user.balance) {
      triggerNotification('error', `Insufficient wallet balance! (Required: BD ${totalCost.toFixed(3)} including 2% fee)`);
      return;
    }

    // Deduct wager instantly with 2% fee
    onUpdateBalance(user.balance - totalCost);
    setActiveWagers(prev => [
      ...prev,
      {
        box: selectedBox,
        digit: selectedDigit,
        amount,
        period: periodNo
      }
    ]);
    setBetAmount('');
    triggerNotification('success', `Placed BD •••• wager on ${selectedBox} for Digit [${selectedDigit}] instantly! (2% Fee BD •••• deducted)`);
  };

  const forceStartRound = () => {
    // Fast-track resolution manually
    resolveRound();
    setSecondsRemaining(30);
    triggerNotification('info', 'Forced instant round prediction resolution.');
  };

  return (
    <div className="space-y-6 pb-28">
      
      {/* 1. TOP DYNAMIC BALANCE BANNER MATCHING SCREEN 14 EXACTLY */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm relative overflow-hidden text-center space-y-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
            AVAILABLE BALANCE
          </p>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            BD {user.balance.toFixed(3)}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3.5 max-w-xs mx-auto">
          <button
            onClick={() => onSelectTab('wallet')}
            className="bg-[#00A79D] hover:bg-teal-700 text-white font-extrabold py-2.5 rounded-xl uppercase text-[10px] tracking-wider transition cursor-pointer"
          >
            DEPOSIT
          </button>
          <button
            onClick={() => onSelectTab('wallet')}
            className="bg-[#FF6B53] hover:bg-rose-600 text-white font-extrabold py-2.5 rounded-xl uppercase text-[10px] tracking-wider transition cursor-pointer"
          >
            WITHDRAWAL
          </button>
        </div>
      </div>

      {/* Play Alerts Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-sm transition-all animate-in fade-in duration-300 flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-100'
            : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-[10px] uppercase underline opacity-80 cursor-pointer ml-2">Dismiss</button>
        </div>
      )}

      {/* 2. GAME TIMER WIDGET */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-md">
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block text-center mb-3">
          GAME TIMER
        </span>
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <button 
            onClick={forceStartRound}
            className="text-[10px] font-extrabold text-[#00A79D] uppercase tracking-wider py-1.5 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition cursor-pointer shrink-0"
          >
            Click to start round
          </button>

          {/* Glowing Timer Countdown Circle */}
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-slate-50 border-4 border-[#00A79D] shadow-inner select-none animate-pulse">
            <div className="text-center space-y-0.5">
              <span className="font-mono text-lg font-black text-slate-800 tracking-tighter">
                00:{secondsRemaining.toString().padStart(2, '0')}
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                {secondsRemaining > 0 ? 'COUNTDOWN' : 'ROUND ENDED'}
              </span>
            </div>
          </div>

          <button 
            onClick={forceStartRound}
            className="text-[10px] font-extrabold text-[#FF6B53] uppercase tracking-wider py-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition cursor-pointer shrink-0"
          >
            Click to start round
          </button>
        </div>
      </div>

      {/* 3. INTERACTIVE TAP BOX GAME SHEET */}
      <div className="bg-white p-5 rounded-s-3xl rounded-e-3xl border border-slate-150 shadow-md space-y-5">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-black text-[#00A79D] uppercase tracking-wider">TAP BOX PREDICTOR</span>
          <span className="text-[9px] font-black bg-slate-100 text-slate-500 py-1 px-3.5 rounded-full font-mono uppercase tracking-widest">
            PERIOD {periodNo}
          </span>
        </div>

        {/* Dual Interactive Box Panels */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* LEFT TAP BOX CONTAINER */}
          <div 
            onClick={() => {
              setSelectedBox('LEFT');
              setSelectedDigit(null); // Reset digit
            }}
            className={`cursor-pointer group relative p-4 rounded-3xl border-2 transition-all flex flex-col justify-between aspect-[1/1.1] ${
              selectedBox === 'LEFT'
                ? 'border-[#0000FF] bg-gradient-to-tr from-teal-50 to-emerald-50/50 shadow-md'
                : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[#00A79D] uppercase tracking-wider block">LEFT BOX</span>
                {selectedBox === 'LEFT' && (
                  <span className="text-[8px] font-black uppercase text-[#00A79D] tracking-widest bg-teal-150 px-1.5 py-0.5 rounded-md">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
                Digits 1, 2, 3, 4, 5 Available
              </p>
            </div>

            {/* Digit options badge container */}
            <div className="flex flex-wrap gap-1 mt-1 justify-center relative z-10">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBox('LEFT');
                    setSelectedDigit(d);
                  }}
                  className={`w-5 h-5 rounded-full text-[9px] font-black font-mono flex items-center justify-center transition-transform hover:scale-115 ${
                    selectedBox === 'LEFT' && selectedDigit === d
                      ? 'bg-[#00A79D] text-white shadow-sm'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white border border-slate-200/80 p-3 flex flex-col items-center justify-center shadow-sm select-none">
              {selectedBox === 'LEFT' && selectedDigit !== null ? (
                <div className="text-center">
                  <span className="text-[8px] text-[#00A79D] font-black tracking-widest uppercase">GUESS DIGIT</span>
                  <p className="text-2xl font-extrabold text-[#00A79D] font-mono leading-none mt-1">
                    {selectedDigit}
                  </p>
                </div>
              ) : (
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  NO DIGIT
                </span>
              )}
            </div>
          </div>

          {/* RIGHT TAP BOX CONTAINER */}
          <div 
            onClick={() => {
              setSelectedBox('RIGHT');
              setSelectedDigit(null); // Reset digit
            }}
            className={`cursor-pointer group relative p-4 rounded-3xl border-2 transition-all flex flex-col justify-between aspect-[1/1.1] ${
              selectedBox === 'RIGHT'
                ? 'border-[#0000FF] bg-gradient-to-tr from-rose-50 to-coral-50/50 shadow-md'
                : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[#FF6B53] uppercase tracking-wider block">RIGHT BOX</span>
                {selectedBox === 'RIGHT' && (
                  <span className="text-[8px] font-black uppercase text-[#FF6B53] tracking-widest bg-rose-150 px-1.5 py-0.5 rounded-md">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
                Digits 1, 2, 3, 8, 9 Available
              </p>
            </div>

            {/* Digit options badge container */}
            <div className="flex flex-wrap gap-1 mt-1 justify-center relative z-10">
              {[1, 2, 3, 8, 9].map((d) => (
                <button
                  key={d}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBox('RIGHT');
                    setSelectedDigit(d);
                  }}
                  className={`w-5 h-5 rounded-full text-[9px] font-black font-mono flex items-center justify-center transition-transform hover:scale-115 ${
                    selectedBox === 'RIGHT' && selectedDigit === d
                      ? 'bg-[#FF6B53] text-white shadow-sm'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white border border-slate-200/80 p-3 flex flex-col items-center justify-center shadow-sm select-none">
              {selectedBox === 'RIGHT' && selectedDigit !== null ? (
                <div className="text-center">
                  <span className="text-[8px] text-[#FF6B53] font-black tracking-widest uppercase">GUESS DIGIT</span>
                  <p className="text-2xl font-extrabold text-[#FF6B53] font-mono leading-none mt-1">
                    {selectedDigit}
                  </p>
                </div>
              ) : (
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  NO DIGIT
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Bet Placement Controls */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Bet Amount (BD)"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
            <button
              onClick={handlePlaceWager}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition select-none cursor-pointer bg-gradient-to-r from-[#00A79D] to-[#43C6AC] text-white hover:opacity-90 active:scale-98"
            >
              PLACE WAGER
            </button>
          </div>
          
          {activeWagers.length > 0 && (
            <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl space-y-2 text-xs text-teal-800">
              <span className="font-extrabold flex items-center gap-1.5 text-[#00A79D]">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                Active Tap Box Predictions ({activeWagers.length}):
              </span>
              <div className="divide-y divide-teal-100/50 max-h-24 overflow-y-auto pr-1">
                {activeWagers.map((w, index) => (
                  <div key={index} className="flex justify-between items-center py-1 font-mono text-[11px] font-bold">
                    <span>Bet #{index + 1}: {w.box} Box (Digit {w.digit})</span>
                    <span className="text-teal-900">BD •••• (+2% fee)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. GAME RESULT LEDGERS AND TABLES (COVERING SCREEN 12 AND 13 OF BOTH MODAL REPRESENTATIONS) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-md space-y-4">
        
        {/* LEDGER TAB GROUP SELECTOR */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-150/50">
          <button
            onClick={() => setActiveTab('results')}
            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer text-center ${
              activeTab === 'results'
                ? 'bg-white text-[#00A79D] shadow-sm font-black border border-slate-100'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            TAP BOX GAME RESULTS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer text-center ${
              activeTab === 'history'
                ? 'bg-white text-[#00A79D] shadow-sm font-black border border-slate-100'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            GAME RESULT HISTORY
          </button>
        </div>

        {activeTab === 'results' ? (
          /* TAB A: TAP BOX GAME RESULTS (RIGHT SCREEN BOTTOM) */
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
            <div className="flex justify-between items-center bg-slate-50/60 py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>PERIOD NO.</span>
              <span>WINNING BOX</span>
              <span>RESULT SCORE</span>
            </div>
            {resultsLedger.map((r, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 px-3.5 text-xs">
                <span className="font-mono font-black text-slate-700">{r.period}</span>
                <span className={`font-extrabold uppercase font-mono px-2 py-0.5 rounded-lg text-[9.5px] ${
                  r.winningBox === 'LEFT' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {r.winningBox} x{r.winningDigit}
                </span>
                <span className="font-mono text-slate-650 font-extrabold">{r.winningDigit}</span>
              </div>
            ))}
          </div>
        ) : (
          /* TAB B: GAME RESULT HISTORY TABLE (LEFT SCREEN UPPER) */
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
            <div className="flex justify-between items-center bg-slate-50/60 py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>PERIOD NO.</span>
              <span>LEFT BOX SCORE</span>
              <span>RIGHT BOX SCORE</span>
            </div>
            {resultsLedger.map((r, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 px-4 text-xs">
                <span className="font-mono font-black text-slate-700">{r.period}</span>
                <span className={`font-mono text-[10.5px] font-bold ${
                  r.winningBox === 'LEFT' ? 'text-emerald-500 font-extrabold underline' : 'text-slate-400'
                }`}>
                  {r.winningBox === 'LEFT' ? r.multiplier : '1x'}
                </span>
                <span className={`font-mono text-[10.5px] font-bold ${
                  r.winningBox === 'RIGHT' ? 'text-rose-500 font-extrabold underline' : 'text-slate-400'
                }`}>
                  {r.winningBox === 'RIGHT' ? r.multiplier : '1x'}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 5. Congratulations Result Banner OVERLAY ON WIN */}
      {showWinOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#0b0f19] to-[#111827] text-white rounded-[32px] p-8 max-w-sm w-full border border-emerald-500 shadow-2xl text-center space-y-6 transform scale-100 animate-in zoom-in-95 duration-300">
            {/* Spinning Golden Trophy indicator */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#00A79D]/25 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-emerald-500/30 border-t-[#00A79D] animate-spin" />
              <div className="w-16 h-16 bg-gradient-to-tr from-[#00A79D] to-teal-400 rounded-full flex items-center justify-center shadow-lg transform -rotate-12 animate-bounce">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#00A79D] uppercase bg-teal-950 text-teal-300 px-3.5 py-1 rounded-full border border-teal-900/40">
                ⭐ TAP BOX SUCCESS ⭐
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                BID COINS COLLECTED
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-normal">
                Wager match on <span className="text-teal-400 font-black underline">{lastWagerDetails.winningBox} ({lastWagerDetails.winningScore})</span> succeeded. 
                Your wager of <span className="text-[#FFA07A] font-mono">BD ••••</span> was paid out dynamically!
              </p>
            </div>

            <div className="bg-teal-950/40 p-4 rounded-2xl border border-teal-900/40 flex items-center justify-between text-left font-mono">
              <span className="text-[10px] font-bold text-slate-401 uppercase">DIVIDEND PAYOUT</span>
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
                💥 ROUND RESOLVED 💥
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                ROUND MISSED
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-normal">
                Winning result was: {lastWagerDetails.winningBox} Box with Digit [{lastWagerDetails.winningDigit}]. 
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
