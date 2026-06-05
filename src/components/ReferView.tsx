import React, { useState } from 'react';
import { UserProfile, ReferredPlayer } from '../types';
import { Copy, Users, TrendingUp, HelpCircle, Sparkles, Check, Share2 } from 'lucide-react';

interface ReferViewProps {
  user: UserProfile;
}

export default function ReferView({ user }: ReferViewProps) {
  const [copied, setCopied] = useState(false);

  const team: ReferredPlayer[] = [
    { id: '1', username: 'user_alpha', level: 1, earnings: 0.15, joinedAt: '2026-05-15' },
    { id: '2', username: 'user_beta', level: 1, earnings: 0.22, joinedAt: '2026-05-18' },
    { id: '3', username: 'user_moka', level: 1, earnings: 0.22, joinedAt: '2026-05-20' },
    { id: '4', username: 'user_gamma', level: 1, earnings: 0.35, joinedAt: '2026-05-22' },
    { id: '5', username: 'user_omega', level: 1, earnings: 0.88, joinedAt: '2026-05-24' },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(user.referCode || 'ABCD');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Tampa Connecting the Bay',
        text: `Use my invite code ${user.referCode || 'ABCD'} and start predicting with double multipliers!`,
        url: window.location.href,
      }).catch((err) => console.log(err));
    } else {
      navigator.clipboard.writeText(`${window.location.href}?ref=${user.referCode || 'ABCD'}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* 1. Brand Banner Header */}
      <div className="text-center py-4 border-b border-slate-50 relative">
        <h2 className="text-lg font-black tracking-[0.25em] text-[#00A79D] uppercase">
          REFER & EARN
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
          Tampa Direct Network Affiliate
        </p>
      </div>

      {/* 2. UID Banner */}
      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100/85 text-center">
        <p className="text-xs font-bold text-gray-500 font-mono text-center">
          MY ACCOUNT UID: <span className="font-black text-[#FF6B53]">{user.uid}</span>
        </p>
      </div>

      {/* 3. My Referral Code Box matching Screen 13 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md relative overflow-hidden text-center space-y-4">
        <p className="text-xs font-black tracking-widest text-[#00A79D] uppercase">
          MY REFER CODE: 4-digit code
        </p>

        <div className="flex items-center justify-center space-x-3 max-w-xs mx-auto">
          <div className="flex-1 bg-slate-50 border border-slate-150 rounded-2xl py-4.5 px-6 font-mono font-black text-3xl tracking-widest text-slate-800 select-all">
            {user.referCode || 'ABCD'}
          </div>

          <button
            onClick={handleCopy}
            className="p-4 rounded-2xl bg-[#FF6B53] text-white hover:bg-[#ff573c] active:scale-95 transition-all shadow-md shadow-coral-500/10 cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check size={22} className="text-emerald-200" /> : <Copy size={22} />}
          </button>
        </div>

        <button
          onClick={handleShare}
          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold py-3.5 px-6 rounded-2xl border border-dashed border-slate-300 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider cursor-pointer"
        >
          <Share2 size={16} className="text-[#FF6B53]" />
          <span>{copied ? 'LINK COPIED TO CLIPBOARD' : 'SHARE CODE'}</span>
        </button>
      </div>

      {/* 4. Commission progress tiers structure matching Screen 13 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase">
            COMMISSION BONUS RATE
          </h4>
          <TrendingUp size={16} className="text-[#00A79D]" />
        </div>

        <div className="p-4 bg-teal-50/50 border border-teal-100/30 rounded-2.5xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-black text-[#00A79D] uppercase tracking-wider block">Unified Multipliers</span>
            <p className="text-[11px] text-slate-600 font-bold leading-normal">Earn extra bonuses on all wagers settled inside your direct network.</p>
          </div>
          <span className="text-xl font-black text-[#FF6B53] font-mono whitespace-nowrap bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 text-center">
            1.50%
          </span>
        </div>
      </div>

      {/* 5. Team Directory Table Network */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-black tracking-widest text-[#00A79D] uppercase">
            MY TEAM / PLAYER NETWORK ({team.length})
          </h4>
          <Users size={16} className="text-slate-400" />
        </div>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2.5xl overflow-hidden bg-white">
          <div className="flex justify-between items-center bg-slate-50/60 py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100/80">
            <span>Player Username</span>
            <span>Accumulated Earnings</span>
          </div>
          {team.map((p, i) => (
            <div key={i} className="flex justify-between items-center py-3.5 px-4 text-xs hover:bg-slate-50/30">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="font-mono font-bold text-slate-700">{p.username}</span>
              </div>
              <span className="font-mono text-emerald-600 font-extrabold">+${p.earnings.toFixed(2)}</span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
