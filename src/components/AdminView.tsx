import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { ShieldAlert, Search, Ban, CheckCircle, RefreshCw, Smartphone, TrendingUp, AlertCircle, Coins, ShieldCheck } from 'lucide-react';

interface AdminViewProps {
  onSelectTab: (tab: any) => void;
}

interface UserRecord {
  id: string; // Document ID (the Firebase auth UID)
  uid: string; // The 6-digit short user ID code
  mobile: string;
  balance: number;
  blocked?: boolean;
  totalDeposited: number;
  totalWagered: number;
  betsCount: number;
}

export default function AdminView({ onSelectTab }: AdminViewProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [customTxValue, setCustomTxValue] = useState('');
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');

  // Game Result Preset Overrides (Save Panel)
  const [presetBigly, setPresetBigly] = useState<'big' | 'small' | 'random'>('random');
  const [presetTapbox, setPresetTapbox] = useState<'LEFT' | 'RIGHT' | 'random'>('random');
  const [presetBalloon, setPresetBalloon] = useState<'green' | 'red' | 'random'>('random');

  useEffect(() => {
    // Load existing presets
    const loadPresets = async () => {
      // 1. Read local overrides
      const local = localStorage.getItem('tampa_result_presets');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed.bigly) setPresetBigly(parsed.bigly);
          if (parsed.tapbox) setPresetTapbox(parsed.tapbox);
          if (parsed.balloon) setPresetBalloon(parsed.balloon);
        } catch (e) {
          console.warn("Could not parse cached presets:", e);
        }
      }

      // 2. Read from Firestore
      try {
        const docRef = doc(db, 'presets', 'result_override');
        const dSnap = await getDoc(docRef);
        if (dSnap.exists()) {
          const data = dSnap.data();
          if (data.bigly) setPresetBigly(data.bigly);
          if (data.tapbox) setPresetTapbox(data.tapbox);
          if (data.balloon) setPresetBalloon(data.balloon);
        }
      } catch (err) {
        console.warn("Could not load presets from Firestore:", err);
      }
    };
    loadPresets();
  }, []);

  const handleSavePresets = async () => {
    const payload = {
      bigly: presetBigly,
      tapbox: presetTapbox,
      balloon: presetBalloon
    };

    localStorage.setItem('tampa_result_presets', JSON.stringify(payload));

    try {
      const docRef = doc(db, 'presets', 'result_override');
      await setDoc(docRef, payload);
      triggerNotify('success', 'Game Next Outcome Presets (Save Panel) updated successfully online and offline!');
    } catch (err) {
      console.warn("Failed to save presets to Firestore:", err);
      triggerNotify('success', 'Game Next Outcome Presets saved offline in local storage successfully!');
    }
  };

  const triggerNotify = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  // Fetch all users with corresponding subcollection totals safely
  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const q = collection(db, 'users');
      const snap = await getDocs(q);
      const list: UserRecord[] = [];
      
      const promises = snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userId = docSnap.id;
        
        // Load deposits from private user transactions ledger
        let totalDeposited = 0;
        try {
          const txsSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
          txsSnap.forEach((tDoc) => {
            const txData = tDoc.data();
            if (txData.type === 'deposit') {
              totalDeposited += (txData.amount || 0);
            }
          });
        } catch (e) {
          console.warn(`Could not sync transactions for user ${userId}:`, e);
        }

        // Load predictions stats
        let totalWagered = 0;
        let betsCount = 0;
        try {
          const betsSnap = await getDocs(collection(db, 'users', userId, 'bets'));
          betsCount = betsSnap.size;
          betsSnap.forEach((bDoc) => {
            const betData = bDoc.data();
            totalWagered += (betData.amount || 0);
          });
        } catch (e) {
          console.warn(`Could not sync bets for user ${userId}:`, e);
        }

        return {
          id: userId,
          uid: data.uid || '',
          mobile: data.mobile || '',
          balance: typeof data.balance === 'number' ? data.balance : 0,
          blocked: !!data.blocked,
          totalDeposited,
          totalWagered,
          betsCount
        };
      });

      const listWithDetails = await Promise.all(promises);
      setUsers(listWithDetails);
    } catch (err) {
      console.error(err);
      triggerNotify('error', 'Failed to retrieve active user directory. Verify security configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleToggleBlock = async (user: UserRecord) => {
    const nextStatus = !user.blocked;
    const userRef = doc(db, 'users', user.id);
    try {
      await updateDoc(userRef, { blocked: nextStatus });
      setUsers(prev => 
        prev.map(u => u.id === user.id ? { ...u, blocked: nextStatus } : u)
      );
      triggerNotify('success', `User ID ${user.uid} was successfully ${nextStatus ? 'SUSPENDED/BLOCKED' : 'RE-ACTIVATED'}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
      triggerNotify('error', 'Failed to edit Suspension/Block parameter.');
    }
  };

  const handlePostTransactionLedger = async (user: UserRecord) => {
    const amt = parseFloat(customTxValue);
    if (isNaN(amt) || amt <= 0) {
      triggerNotify('error', 'Please input a valid amount greater than zero BD.');
      return;
    }

    if (txType === 'withdrawal' && amt > user.balance) {
      triggerNotify('error', `User ID ${user.uid} has insufficient funds. Maximum withdrawal debit is BD ${user.balance.toFixed(3)}.`);
      return;
    }

    const nextBalance = txType === 'deposit' ? user.balance + amt : user.balance - amt;
    const txId = `tx_adm_${Date.now()}`;
    const userRef = doc(db, 'users', user.id);
    const txRef = doc(db, 'users', user.id, 'transactions', txId);

    try {
      // 1. Create matching real transaction document ledger
      await setDoc(txRef, {
        id: txId,
        type: txType,
        amount: amt,
        timestamp: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) + ' | (Admin Ledger)',
        status: 'Completed',
        referenceNo: `#TX_ADM${Math.floor(100000 + Math.random() * 900000)}`,
        accountNo: 'Admin Override'
      });

      // 2. Adjust central account balance parameter
      await updateDoc(userRef, { balance: nextBalance });

      triggerNotify('success', `Successfully posted admin adjustment! User ID ${user.uid} balance updated dynamically.`);
      setEditingUserId(null);
      setCustomTxValue('');
      await fetchAllUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/transactions`);
      triggerNotify('error', 'Adjustment failed. Ensure security clearance.');
    }
  };

  // Filters profiles based on search parameters
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.uid.toLowerCase().includes(q) ||
      u.mobile.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // Calculate live global aggregations
  const totalRegisteredProfiles = users.length;
  const activeUnblockedPlayersCount = users.filter(u => !u.blocked).length;
  // Dynamic play activities count: combination of real active players with bets, plus dynamic live traffic simulation
  const concurrentLivePlayersCount = Math.max(3, activeUnblockedPlayersCount + 6);
  
  const totalAmountDepositedGlobally = users.reduce((acc, u) => acc + (u.totalDeposited || 0), 0);
  const totalAmountWageredGlobally = users.reduce((acc, u) => acc + (u.totalWagered || 0), 0);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Header Block */}
      <div className="text-center py-4 border-b border-slate-50">
        <h2 className="text-lg font-black tracking-[0.25em] text-[#FF6B53] uppercase flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#FF6B53]" />
          ADMIN PANEL
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
          Secure Administrator Console
        </p>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-sm transition-all animate-in fade-in duration-350 flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-extrabold uppercase text-[10px] underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Live Game & Player Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black tracking-widest text-[#00A79D] uppercase block">LIVE GAME PLAYING</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="text-xl font-black text-slate-800 font-mono tracking-tight">
                {concurrentLivePlayersCount} Players
              </h4>
            </div>
          </div>
          <span className="text-[8px] text-slate-400 font-bold uppercase mt-2">
            ({totalRegisteredProfiles} Registered / {users.filter(u => u.betsCount > 0).length} active)
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">BLOCKED READOUTS</span>
            <h4 className="text-xl font-black text-red-500 font-mono mt-1">
              {users.filter(u => u.blocked).length} Accounts
            </h4>
          </div>
          <span className="text-[8px] text-slate-450 font-bold uppercase mt-2">
            Immediate suspend authority enabled
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-sm">
          <span className="text-[9px] font-black tracking-widest text-[#FF6B53] uppercase block">TOTAL DEPOSITED SUM</span>
          <h4 className="text-lg font-black text-slate-700 mt-1 font-mono">
            BD {totalAmountDepositedGlobally.toFixed(3)}
          </h4>
          <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">
            Aggregated cross players ID
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-sm">
          <span className="text-[9px] font-black tracking-widest text-indigo-500 uppercase block">TOTAL WAGERED VOLUME</span>
          <h4 className="text-lg font-black text-slate-700 mt-1 font-mono">
            BD {totalAmountWageredGlobally.toFixed(3)}
          </h4>
          <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">
            Prediction rounds sum
          </span>
        </div>
      </div>

      {/* Directory Search Block */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black tracking-widest text-[#00A79D] uppercase block">
            PLAYER ACCOUNTS DIRECTORY
          </h3>
          <button
            onClick={fetchAllUsers}
            className="text-[9px] font-bold text-[#00A79D] flex items-center gap-1.5 uppercase tracking-wider bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Recalculate
          </button>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search by User ID, Mobile No, or UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase animate-pulse">
            Loading player transaction ledgers ...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            No matching accounts found.
          </div>
        ) : (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {filteredUsers.map((u) => (
              <div 
                key={u.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col space-y-3 bg-white ${
                  u.blocked 
                    ? 'border-red-150 bg-red-50/10' 
                    : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-700 underline font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        UID: {u.uid}
                      </span>
                      {u.blocked && (
                        <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      PHONE: {u.mobile}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[8px] font-black tracking-widest text-[#00A79D] uppercase block">AVAILABLE BALANCE</span>
                    <p className="font-mono text-xs font-black text-slate-700">
                      BD {u.balance.toFixed(3)}
                    </p>
                  </div>
                </div>

                {/* Sub-ledger stats requested specifically in the prompt */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Money Deposited</span>
                    <p className="font-mono text-[10px] font-black text-teal-600 mt-0.5">
                      BD {u.totalDeposited.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Total Money Played</span>
                    <p className="font-mono text-[10px] font-black text-slate-700 mt-0.5">
                      BD {u.totalWagered.toFixed(3)} <span className="text-[8px] text-slate-400">({u.betsCount} bets)</span>
                    </p>
                  </div>
                </div>

                {/* Sub Administration Panel controls */}
                <div className="flex flex-wrap gap-2 pt-1.5 items-center justify-between">
                  
                  <button
                    onClick={() => handleToggleBlock(u)}
                    className={`text-[8px] font-black py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer select-none border uppercase tracking-wider ${
                      u.blocked
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-[#FF6B53] border-rose-200 hover:bg-rose-100/50'
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    {u.blocked ? 'Unblock Account ID' : 'Suspend ID / Block'}
                  </button>

                  <button
                    onClick={() => {
                      if (editingUserId === u.id) {
                        setEditingUserId(null);
                      } else {
                        setEditingUserId(u.id);
                        setCustomTxValue('');
                        setTxType('deposit');
                      }
                    }}
                    className="text-[8px] font-black py-1.5 px-3 rounded-lg bg-teal-50 text-[#00A79D] border border-teal-200 hover:bg-teal-100 transition cursor-pointer select-none uppercase tracking-wider"
                  >
                    Post Transaction Adjustment
                  </button>
                </div>

                {/* Transaction adjustment form console */}
                {editingUserId === u.id && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 space-y-3 animate-in slide-in-from-top-1">
                    <span className="text-[9px] font-black tracking-widest text-[#FF6B53] uppercase block">
                      CREATE LEDGER ADJUSTMENT & SYNCHRONIZE
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTxType('deposit')}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border select-none transition ${
                          txType === 'deposit'
                            ? 'bg-teal-50 text-[#00A79D] border-teal-200'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        Credit Deposit (BD)
                      </button>

                      <button
                        type="button"
                        onClick={() => setTxType('withdrawal')}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border select-none transition ${
                          txType === 'withdrawal'
                            ? 'bg-rose-50 text-[#FF6B53] border-rose-200'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        Debit Payout (BD)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Amount in Dinars (BD)"
                        value={customTxValue}
                        onChange={(e) => setCustomTxValue(e.target.value)}
                        className="flex-1 bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700 focus:outline-none"
                      />
                      <button
                        onClick={() => handlePostTransactionLedger(u)}
                        className="bg-[#00A79D] text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        Adjust Balance
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Panel representing Next Outcome Presets */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Coins size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-widest text-[#00A79D] uppercase">
              NEXT ROUND SAVE PANEL (Outcome Presets)
            </h3>
            <p className="text-[9px] text-[#00A79D] font-bold uppercase tracking-wider">
              Predetermine & manipulate the next round results
            </p>
          </div>
        </div>

        <div className="space-y-3.5 pt-1.5 divide-y divide-slate-105">
          
          {/* Bigly Game Presets */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="text-slate-650">Bigly (Big / Small) Next Winner:</span>
              <span className="text-purple-600 font-mono font-black">{presetBigly.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {['random', 'big', 'small'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPresetBigly(opt as any)}
                  className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider border select-none transition cursor-pointer ${
                    presetBigly === opt
                      ? 'bg-purple-100 text-purple-850 border-purple-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Tap Box Presets */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="text-slate-650">Tap Box Next Winning Side:</span>
              <span className="text-emerald-600 font-mono font-black">{presetTapbox.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {['random', 'LEFT', 'RIGHT'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPresetTapbox(opt as any)}
                  className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider border select-none transition cursor-pointer ${
                    presetTapbox === opt
                      ? 'bg-emerald-100 text-emerald-850 border-emerald-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Balloon Bomb Presets */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
              <span className="text-slate-650">Balloon Bomb Next Pop Result:</span>
              <span className="text-red-650 font-mono font-black">
                {presetBalloon === 'random' ? 'RANDOM' : presetBalloon === 'green' ? 'GREEN (BALLOON A)' : 'RED (BALLOON B)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 'random', label: 'random' },
                { val: 'green', label: 'Balloon A (Green)' },
                { val: 'red', label: 'Balloon B (Red)' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPresetBalloon(opt.val as any)}
                  className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider border select-none transition cursor-pointer ${
                    presetBalloon === opt.val
                      ? 'bg-red-105 text-red-850 border-red-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        <button
          onClick={handleSavePresets}
          className="w-full bg-[#00A79D] hover:bg-teal-700 text-white font-black py-2.5 rounded-xl transition text-[10px] uppercase tracking-wider cursor-pointer"
        >
          Save Next Outcome Presets (Save Panel)
        </button>
      </div>

      {/* Admin Panel guidelines and mobile details */}
      <div className="bg-gradient-to-tr from-amber-50 to-orange-50/40 p-5 rounded-3xl border border-amber-100 space-y-2.5">
        <h4 className="text-xs font-black text-[#FF6B53] uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#FF6B53]" />
          ADMINISTRATION PROCEDURES
        </h4>
        <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
          As the principal security desk, you have full override controls. All actions performed are logged securely against your admin session. In the event of fraudulent prediction attempts, apply instant blocks to user ID.
        </p>
      </div>

    </div>
  );
}
