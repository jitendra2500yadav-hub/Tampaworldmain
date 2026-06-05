import React, { useState } from 'react';
import { UserProfile, Tab } from '../types';
import { RefreshCw, Network, Gift, Wallet, Settings, ArrowRight, Gamepad2, Info, Sparkles, Trophy } from 'lucide-react';

interface HomeViewProps {
  user: UserProfile;
  onSelectTab: (tab: Tab) => void;
  onRefreshBalance: () => void;
  isRefreshing: boolean;
}

export default function HomeView({ user, onSelectTab, onRefreshBalance, isRefreshing }: HomeViewProps) {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const games = [
    {
      id: 'play-tapbox' as Tab,
      title: 'Tap Box Predictor',
      subtitle: 'Double Box Multiplier',
      desc: 'Predict Left vs Right high scores and match support digits for large payouts.',
      badge: 'NEW',
      color: 'from-[#00A79D] to-[#FF6B53]',
      icon: '📦'
    },
    {
      id: 'play-bigly' as Tab,
      title: 'The Great Bigly Adventure',
      subtitle: 'Digit Prediction',
      desc: 'Predict Small (1-4) vs Big (5-9) digits for 2x multipliers.',
      badge: 'POPULAR',
      color: 'from-[#FF6B53] to-[#FF8C7A]',
      icon: '🎯'
    },
    {
      id: 'play-balloon' as Tab,
      title: 'City Explorer: Aqua Quest',
      subtitle: 'Balloon POP! Duel',
      desc: 'Wager on Green vs Red Balloons. Avoid the TNT Bomb Explosion!',
      badge: 'ACTION',
      color: 'from-[#00A79D] to-[#43C6AC]',
      icon: '🎈'
    },
    {
      id: 'trivia' as Tab,
      title: 'Trivia Master',
      subtitle: 'Quick Quiz Duel',
      desc: 'Answer rapid Tampa culture queries for instant cash prizes.',
      badge: 'HOT',
      color: 'from-amber-500 to-orange-400',
      icon: '👑'
    }
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Dynamic Profile Section matching Screenshot 3 */}
      <div className="bg-gradient-to-r from-teal-500/5 via-violet-500/5 to-coral-500/5 border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center space-x-4">
          {/* Circular colored network nodes icon avatar */}
          <div className="relative w-16 h-16 rounded-2xl bg-white border border-teal-100 shadow-md flex items-center justify-center p-2.5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-50/40 via-white to-orange-50/50" />
            <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
              <circle cx="50" cy="50" r="16" fill="#00A79D" />
              <circle cx="20" cy="30" r="10" fill="#FF6B53" />
              <circle cx="80" cy="30" r="10" fill="#FFA07A" />
              <circle cx="30" cy="75" r="10" fill="#3CCF4E" />
              <circle cx="70" cy="75" r="10" fill="#43C6AC" />
              
              <line x1="50" y1="50" x2="20" y2="30" stroke="#00A79D" strokeWidth="3.5" opacity="0.6" />
              <line x1="50" y1="50" x2="80" y2="30" stroke="#00A79D" strokeWidth="3.5" opacity="0.6" />
              <line x1="50" y1="50" x2="30" y2="75" stroke="#00A79D" strokeWidth="3.5" opacity="0.6" />
              <line x1="50" y1="50" x2="70" y2="75" stroke="#00A79D" strokeWidth="3.5" opacity="0.6" />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              Profile
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <div className="text-xs text-slate-500 font-mono space-y-0.5">
              <p className="font-bold text-gray-700">6-DIGIT UID: <span className="text-[#FF6B53] font-extrabold">{user.uid}</span></p>
              <p className="opacity-85 text-[10px]">LAST ONLINE: {user.lastOnline}</p>
            </div>
          </div>
        </div>

        {/* Level Banner */}
        <div className="bg-white/95 px-3.5 py-1.5 rounded-full border border-teal-100/50 shadow-sm flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-50" />
          <span className="text-[10px] font-black uppercase text-teal-800 tracking-widest">Level 1</span>
        </div>
      </div>

      {/* DASHBOARDS HEADER */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black tracking-widest text-[#00A79D] uppercase">
          4 DASHBOARDS
        </h3>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
          Live Sync
        </span>
      </div>

      {/* Wallet Balance widget matching Screenshot 3 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-lg shadow-slate-100/40 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-24 h-24 bg-coral-50 rounded-full opacity-30 select-none pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-black tracking-widest text-gray-400 uppercase">
              Wallet Balance
            </p>
            <h4 className="text-4xl font-black text-[#FF6B53] tracking-tight animate-in zoom-in-50 duration-300">
              BD {user.balance.toFixed(3)}
            </h4>
          </div>

          {/* Refresh Tool Button with spin state animation */}
          <button
            onClick={onRefreshBalance}
            disabled={isRefreshing}
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all active:scale-95 group cursor-pointer"
          >
            <RefreshCw
              size={18}
              className={`text-[#FF6B53] ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-45'} transition-all`}
            />
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase mt-1">
              REFRESH
            </span>
          </button>
        </div>

        {/* Quick action shortcuts to balance */}
        <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
          <button
            onClick={() => onSelectTab('wallet')}
            className="bg-teal-500/5 hover:bg-teal-500/10 text-[#00A79D] text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            Deposit Funds
          </button>
          <button
            onClick={() => onSelectTab('wallet')}
            className="bg-coral-500/5 hover:bg-coral-500/10 text-[#FF6B53] text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            Withdraw to Bank
          </button>
        </div>
      </div>

      {/* FEATURED GAMES SECTION matching Screenshot 3 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase">
            FEATURED GAMES
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">Tap Card to Play</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {games.map((g) => {
            const isTarget = hoveredGame === g.id;
            return (
              <div
                key={g.id}
                onClick={() => onSelectTab(g.id)}
                onMouseEnter={() => setHoveredGame(g.id)}
                onMouseLeave={() => setHoveredGame(null)}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[170px]"
              >
                {/* Dynamic colored top background banner */}
                <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${g.color}`} />
                
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl">{g.icon}</span>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 tracking-wider">
                      {g.badge}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <h5 className="text-sm font-extrabold text-slate-800 leading-tight">
                      {g.title}
                    </h5>
                    <p className="text-[11px] font-bold text-[#00A79D] uppercase tracking-wide">
                      {g.subtitle}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2 line-clamp-2">
                  {g.desc}
                </p>

                <div className="flex justify-end mt-3 items-center text-[#FF6B53] text-xs font-extrabold gap-1">
                  <span>Enter</span>
                  <ArrowRight size={12} className={g.id === hoveredGame ? "translate-x-1 transition-transform" : "transition-transform"} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK SUB-DASHBOARD ACCESS WIDGETS matching Screenshot 3 bottom */}
      <div className="space-y-3">
        <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase px-1">
          Network & Settings
        </h3>

        <div className="space-y-3">
          {/* Dashboard 2: REFER */}
          <div 
            onClick={() => onSelectTab('refer')}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-teal-200 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100/50 flex items-center justify-center text-[#FF6B53]">
                <Gift size={20} />
              </div>
              <div>
                <h6 className="text-[11px] font-black tracking-widest uppercase text-slate-400">DASHBOARD 2: REFER</h6>
                <p className="text-sm font-bold text-slate-800">Referral Code & Network</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white bg-[#00A79D] px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px]">
                ABCD
              </span>
              <ArrowRight size={16} className="text-slate-400" />
            </div>
          </div>

          {/* Dashboard 3: WALLET HISTORY */}
          <div 
            onClick={() => onSelectTab('wallet')}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-teal-200 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100/50 flex items-center justify-center text-[#00A79D]">
                <Wallet size={20} />
              </div>
              <div>
                <h6 className="text-[11px] font-black tracking-widest uppercase text-slate-400">DASHBOARD 3: WALLET</h6>
                <p className="text-sm font-bold text-slate-800">Withdrawals & Ledger</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-500 font-mono">
                Recent Txs
              </span>
              <ArrowRight size={16} className="text-slate-400" />
            </div>
          </div>

          {/* Dashboard 4: SETTINGS */}
          <div 
            onClick={() => onSelectTab('account')}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-teal-200 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Settings size={20} />
              </div>
              <div>
                <h6 className="text-[11px] font-black tracking-widest uppercase text-slate-400">DASHBOARD 4: SETTINGS</h6>
                <p className="text-sm font-bold text-slate-800">Limits & Security</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
