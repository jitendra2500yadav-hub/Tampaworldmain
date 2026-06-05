import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, ShieldCheck, HelpCircle, FileText, Smartphone, Ban, LogOut, ArrowRight, Activity, Users, Settings } from 'lucide-react';

interface AccountViewProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function AccountView({ user, onLogout }: AccountViewProps) {
  const [showSupport, setShowSupport] = useState(false);

  return (
    <div className="space-y-6 pb-24">
      
      {/* 1. Header block */}
      <div className="text-center py-4 border-b border-slate-50">
        <h2 className="text-lg font-black tracking-[0.25em] text-[#00A79D] uppercase">
          My Account
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
          Settings, Limits, and Support Options
        </p>
      </div>

      {/* 2. Compact User Identification banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-[#00A79D]">
          <User size={24} />
        </div>
        <div>
          <p className="text-xs font-black tracking-widest text-[#00A79D] uppercase">MOBILE PROFILE</p>
          <h4 className="text-sm font-bold text-slate-800">
            {(() => {
              const num = user.mobile || '+1 234 567 8900';
              if (num.length <= 4) return '****';
              return num.substring(0, 3) + '*****' + num.substring(num.length - 2);
            })()}
          </h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            UID: <span className="text-[#FF6B53] font-mono tracking-widest">{user.uid}</span>
          </p>
        </div>
      </div>

      {/* 3. Real developer parameters & system limits */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 className="text-xs font-black tracking-widest text-[#00A79D] uppercase px-1">
          System Account Metrics
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center animate-in fade-in">
            <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">Daily Limit</span>
            <p className="text-sm font-extrabold text-slate-700">1,500 BD</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center animate-in fade-in">
            <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">Account tier</span>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider">
              Standard
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center animate-in fade-in">
            <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">Verification</span>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider">
              Fully Verified
            </span>
          </div>

          <div className="bg-[#FF6B53]/5 p-3 rounded-2xl border border-[#FF6B53]/10 text-center animate-in fade-in">
            <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">Commission tier</span>
            <p className="text-sm font-black text-[#FF6B53]">Direct 1.50%</p>
          </div>
        </div>
      </div>

      {/* 4. Settings Directory List links */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-5 space-y-3">
        <h3 className="text-xs font-black tracking-widest text-[#00A79D] uppercase px-1">
          Safety and Security
        </h3>

        {/* Security Parameters */}
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold">
              <ShieldCheck size={16} className="text-[#00A79D]" />
              <span>Two-Factor Authentication</span>
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              ENABLED
            </span>
          </div>

          {/* Connected Device */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold">
              <Smartphone size={16} className="text-slate-400" />
              <span>Registered Region</span>
            </div>
            <span className="text-[9px] font-mono text-slate-450 font-bold uppercase bg-slate-50 px-2 py-0.5 rounded-md">
              Manama, Bahrain
            </span>
          </div>

          {/* Fair Bet Policy */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold">
              <FileText size={16} className="text-slate-400" />
              <span>Fair Multiplier Rule Book</span>
            </div>
            <ArrowRight size={14} className="text-slate-450" />
          </div>

          {/* Responsible Gambling limits */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold">
              <Ban size={16} className="text-orange-400" />
              <span>Time-out & Auto Exclusion</span>
            </div>
            <ArrowRight size={14} className="text-slate-450" />
          </div>
        </div>
      </div>

      {/* 5. Helpful contact / Help Center button */}
      <div className="p-4 rounded-3xl bg-[#00A79D]/5 border border-[#00A79D]/10 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#00A79D]/20 flex items-center justify-center text-[#00A79D]">
              <HelpCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase">Need assistance?</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Our support team is online 24/7</p>
            </div>
          </div>
          <button
            onClick={() => setShowSupport(!showSupport)}
            className="text-[10px] font-black bg-[#00A79D] hover:bg-teal-700 text-white uppercase px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            {showSupport ? 'Hide' : 'Contact'}
          </button>
        </div>

        {showSupport && (
          <div className="p-4 bg-white border border-teal-100 rounded-2xl text-xs space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <p className="font-extrabold text-[#00A79D] uppercase tracking-wider text-[10px]">Live Support Options:</p>
            <p className="text-slate-600 font-medium font-bold">For rapid deposit or withdrawal releases, contact the Administration Desk via Telegram:</p>
            <p className="font-mono font-black text-[#FF6B53] bg-orange-50/50 p-2 rounded-xl border border-orange-100 select-all text-center text-sm">
              Telegram Support ID: @rihu2020
            </p>
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider">
              Official Admin ID Coordinator
            </p>
          </div>
        )}
      </div>

      {/* 6. Logout trigger */}
      <button
        onClick={onLogout}
        className="w-full bg-slate-100 hover:bg-slate-200 text-rose-500 font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest cursor-pointer"
      >
        <LogOut size={16} />
        <span>SIGN OUT OF ACCOUNT</span>
      </button>

    </div>
  );
}
