import React, { useState } from 'react';
import { UserProfile, Transaction } from '../types';
import { Wallet, ArrowDownLeft, ArrowUpRight, History, Shield, CheckCircle, Clock, AlertCircle, Sparkles } from 'lucide-react';

interface WalletViewProps {
  user: UserProfile;
  onUpdateBalance: (newBalance: number) => void;
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
}

export default function WalletView({ user, onUpdateBalance, transactions, onAddTransaction }: WalletViewProps) {
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [copiedUID, setCopiedUID] = useState(false);
  const [errorAndInfo, setErrorAndInfo] = useState({ error: '', info: '' });

  const handleCopySupport = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUID(true);
    setTimeout(() => setCopiedUID(false), 2500);
    setErrorAndInfo({ error: '', info: `Profile UID ${user.uid} copied to clipboard! Share this with Support Telegram @rihu2020 to coordinate.` });
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Dynamic Header */}
      <div className="text-center py-4 border-b border-slate-50">
        <h2 className="text-lg font-black tracking-[0.25em] text-[#00A79D] uppercase">
          Wallet History
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
          Ledgers and Secure Settlements
        </p>
      </div>

      {/* Main Balance Display matching Wallet History layout */}
      <div className="bg-[#f0f5f7] border border-slate-200/60 p-6 rounded-3xl text-center space-y-4 shadow-sm relative overflow-hidden">
        <div className="space-y-1">
          <p className="text-xs font-black tracking-widest text-[#00A79D] uppercase">
            Current Wallet Balance
          </p>
          <h3 className="text-4xl font-black text-slate-800 tracking-tight">
            BD {user.balance.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </h3>
        </div>

        {/* Action button rows with orange and teal palettes */}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <button
            onClick={() => {
              setIsDepositing(true);
              setIsWithdrawing(false);
              setErrorAndInfo({ error: '', info: '' });
            }}
            className={`py-3 rounded-2xl font-black tracking-wider uppercase text-xs transition-all active:scale-[0.98] border cursor-pointer flex items-center justify-center space-x-1.5 ${
              isDepositing
                ? 'bg-[#00A79D] text-white border-transparent shadow-md shadow-teal-500/10'
                : 'bg-white hover:bg-slate-50 text-[#00A79D] border-teal-200'
            }`}
          >
            <ArrowDownLeft size={14} />
            <span>Deposit</span>
          </button>

          <button
            onClick={() => {
              setIsWithdrawing(true);
              setIsDepositing(false);
              setErrorAndInfo({ error: '', info: '' });
            }}
            className={`py-3 rounded-2xl font-black tracking-wider uppercase text-xs transition-all active:scale-[0.98] border cursor-pointer flex items-center justify-center space-x-1.5 ${
              isWithdrawing
                ? 'bg-[#FF6B53] text-white border-transparent shadow-md shadow-coral-500/10'
                : 'bg-white hover:bg-slate-50 text-[#FF6B53] border-coral-200'
            }`}
          >
            <ArrowUpRight size={14} />
            <span>Withdrawal</span>
          </button>
        </div>
      </div>

      {/* Info / Message Banner */}
      {errorAndInfo.error && (
        <div className="bg-red-50 text-red-600 text-xs py-3 px-4 rounded-2xl border border-red-100 flex items-center space-x-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorAndInfo.error}</span>
        </div>
      )}
      {errorAndInfo.info && (
        <div className="bg-teal-50 text-teal-700 text-xs py-3 px-4 rounded-2xl border border-teal-100 flex items-center space-x-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{errorAndInfo.info}</span>
        </div>
      )}

      {/* Interactive Deposit form view */}
      {isDepositing && (
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50/30 p-5 rounded-3xl border border-teal-100 space-y-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
          <h4 className="text-xs font-black text-[#00A79D] uppercase tracking-widest block">ADMIN-ASSISTED SECURITIES DEPOSIT</h4>
          <p className="text-xs text-slate-600 font-bold leading-normal">
            To fund your wallet balance securely with Bahraini Dinars (BD), please copy your unique <span className="text-[#FF6B53] font-black">6-Digit UID</span> and coordinate with the Admin Desk Mobile.
          </p>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Account UID</span>
              <p className="font-mono text-sm font-black text-slate-700">{user.uid}</p>
            </div>
            <button
               type="button"
               onClick={handleCopySupport}
               className="bg-[#00A79D] text-white hover:bg-teal-700 font-extrabold text-[10px] tracking-wider px-3.5 py-2 rounded-xl transition uppercase cursor-pointer"
            >
              {copiedUID ? 'COPIED' : 'COPY UID'}
            </button>
          </div>
          <div className="text-[10px] text-[#00A79D] font-black bg-white/60 p-2.5 rounded-xl border border-slate-100 text-center uppercase tracking-wider">
            Admin Support Telegram: @rihu2020
          </div>
        </div>
      )}

      {/* Interactive Withdrawal form view */}
      {isWithdrawing && (
        <div className="bg-gradient-to-br from-rose-50 to-orange-50/30 p-5 rounded-3xl border border-rose-100 space-y-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
          <h4 className="text-xs font-black text-[#FF6B53] uppercase tracking-widest block">ADMIN-ASSISTED WITHDRAWAL REQUEST</h4>
          <p className="text-xs text-slate-600 font-bold leading-normal">
            To withdraw your balance in Bahraini Dinars (BD), copy your Account <span className="text-[#00A79D] font-black">UID</span> and send withdrawal details to our Support Telegram desk. Payouts undergo direct authorization.
          </p>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Account UID</span>
              <p className="font-mono text-sm font-black text-slate-700">{user.uid}</p>
            </div>
            <button
              type="button"
              onClick={handleCopySupport}
              className="bg-[#FF6B53] text-white hover:bg-orange-600 font-extrabold text-[10px] tracking-wider px-3.5 py-2 rounded-xl transition uppercase cursor-pointer"
            >
              {copiedUID ? 'COPIED' : 'COPY UID'}
            </button>
          </div>
          <div className="text-[10px] text-[#FF6B53] font-black bg-white/60 p-2.5 rounded-xl border border-slate-100 text-center uppercase tracking-wider">
            Admin Support Telegram: @rihu2020
          </div>
        </div>
      )}

      {/* Ledger History List matching Screen 14 precisely */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-black tracking-widest text-[#00A79D] uppercase flex items-center gap-1.5">
            <History size={14} />
            RECENT TRANSACTION HISTORY
          </h4>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
            Click for details
          </span>
        </div>

        {/* Ledger */}
        <div className="space-y-3">
          {transactions.map((tx) => {
            const isWithdrawal = tx.type === 'withdrawal';
            return (
              <div
                key={tx.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  {/* Colored circular arrow matching screenshot 14 */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isWithdrawal
                      ? 'bg-rose-50 text-rose-500 border border-rose-100/30'
                      : 'bg-emerald-50 text-emerald-500 border border-emerald-100/30'
                  }`}>
                    {isWithdrawal ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-800 leading-snug">
                      {isWithdrawal ? 'Withdrawal to Bank' : 'Deposit Completed'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {tx.timestamp}
                    </p>
                    <p className="text-[9px] text-[#00A79D] font-mono font-bold tracking-wider uppercase">
                      #{tx.referenceNo}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className={`text-sm font-black font-mono tracking-tight ${
                    isWithdrawal ? 'text-rose-500' : 'text-emerald-500'
                  }`}>
                    {isWithdrawal ? '-' : '+'}BD {tx.amount.toFixed(3)}
                  </p>
                  
                  {/* Real-life status pill tags badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    tx.status === 'Completed'
                      ? 'bg-emerald-100/80 text-emerald-700'
                      : tx.status === 'Pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {tx.status === 'Pending' && <Clock size={8} />}
                    {tx.status === 'Completed' && <CheckCircle size={8} />}
                    <span>{tx.status}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Note badge */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 flex items-start space-x-2.5 max-w-sm mx-auto">
          <Shield size={16} className="text-[#00A79D] shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400 font-bold leading-normal uppercase">
            All system transactions are cryptographically signed and secured directly through standard Bay gateway protocols.
          </p>
        </div>
      </div>

    </div>
  );
}
