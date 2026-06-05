import React, { useState, useEffect } from 'react';
import { Tab, UserProfile, Bet, Transaction } from './types';
import RegistrationView from './components/RegistrationView';
import HomeView from './components/HomeView';
import BiglyGameView from './components/BiglyGameView';
import BalloonGameView from './components/BalloonGameView';
import TapBoxGameView from './components/TapBoxGameView';
import ReferView from './components/ReferView';
import WalletView from './components/WalletView';
import AccountView from './components/AccountView';
import TampaLogo from './components/TampaLogo';
import AdminView from './components/AdminView';
import { Home, Users, Wallet, User, MessageCircle, Gamepad2, Loader2, ShieldAlert } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('tampa_fallback_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [betHistory, setBetHistory] = useState<Bet[]>(() => {
    const cached = localStorage.getItem('tampa_fallback_bets');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem('tampa_fallback_transactions');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [loadingApp, setLoadingApp] = useState(true);

  // Connection timeout fallback: If Firestore does not answer within 1.5s, proceed with our local-state/offline mode
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingApp) {
        console.log("Firestore connection timeout fallback - operating in secure local storage mode.");
        setLoadingApp(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [loadingApp]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid);
        
        // 1. Real-time User Profile documents watcher
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const loadedUser: UserProfile = {
              uid: data.uid || fbUser.uid.substring(0, 6).toUpperCase(),
              referCode: data.referCode || 'ABCD',
              balance: typeof data.balance === 'number' ? data.balance : 120.50,
              mobile: data.mobile || 'Guest Account',
              lastOnline: 'Just now',
              blocked: !!data.blocked
            };
            setUser(loadedUser);
            localStorage.setItem('tampa_fallback_user', JSON.stringify(loadedUser));
          }
          setLoadingApp(false);
        }, (error) => {
          console.warn("User profile remote subscription failed (offline mode fallback):", error);
          setLoadingApp(false);
        });

        // 2. Real-time Bets records subcollection watcher
        const betsRef = collection(db, 'users', fbUser.uid, 'bets');
        const unsubBets = onSnapshot(betsRef, (snap) => {
          const list: Bet[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              period: data.period,
              type: data.type,
              amount: data.amount,
              timestamp: data.timestamp
            });
          });
          list.sort((a, b) => b.period - a.period);
          setBetHistory(list);
          localStorage.setItem('tampa_fallback_bets', JSON.stringify(list));
        }, (error) => {
          console.warn("User bets remote subscription failed (offline fallback):", error);
        });

        // 3. Real-time Transactions accounts subcollection watcher
        const txsRef = collection(db, 'users', fbUser.uid, 'transactions');
        const unsubTxs = onSnapshot(txsRef, (snap) => {
          const list: Transaction[] = [];
          snap.forEach((d) => {
            list.push(d.data() as Transaction);
          });
          setTransactions(list);
          localStorage.setItem('tampa_fallback_transactions', JSON.stringify(list));
        }, (error) => {
          console.warn("User transactions remote subscription failed (offline fallback):", error);
        });

        return () => {
          unsubProfile();
          unsubBets();
          unsubTxs();
        };
      } else {
        // No authenticated user, do not clear local states if we are operating in offline mock-development mode
        if (!localStorage.getItem('tampa_fallback_user')) {
          setUser(null);
          setBetHistory([]);
          setTransactions([]);
        }
        setLoadingApp(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleRegisterSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('tampa_fallback_user', JSON.stringify(profile));
    setActiveTab('home');
  };

  const handleLogout = async () => {
    setLoadingApp(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out remote failed:", e);
    }
    setUser(null);
    localStorage.removeItem('tampa_fallback_user');
    localStorage.removeItem('tampa_fallback_bets');
    localStorage.removeItem('tampa_fallback_transactions');
    setActiveTab('home');
    setLoadingApp(false);
  };

  const handleUpdateBalance = async (newBalance: number) => {
    // 1. Update React state & Client local cache immediately
    if (user) {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('tampa_fallback_user', JSON.stringify(updatedUser));
    }

    // 2. Perform optimistic Firebase sync background save
    const fbUser = auth.currentUser;
    if (fbUser) {
      const userRef = doc(db, 'users', fbUser.uid);
      try {
        await updateDoc(userRef, { balance: newBalance });
      } catch (err) {
        console.warn("Failed to update user balance on Firestore (offline mode):", err);
      }
    }
  };

  const handleAddTransaction = async (newTx: Transaction) => {
    // 1. Update React state & Client local cache immediately
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    localStorage.setItem('tampa_fallback_transactions', JSON.stringify(updatedTxs));

    // 2. Perform optimistic Firebase sync background save
    const fbUser = auth.currentUser;
    if (fbUser) {
      const txRef = doc(db, 'users', fbUser.uid, 'transactions', newTx.id || Math.random().toString());
      try {
        await setDoc(txRef, newTx);
      } catch (err) {
        console.warn("Failed to upload transaction to Firestore (offline mode):", err);
      }
    }
  };

  const handleRefreshBalance = () => {
    if (!user) return;
    setIsRefreshing(true);
    setTimeout(async () => {
      setIsRefreshing(false);
      const bonus = Math.random() > 0.82 ? 5.00 : 0;
      if (bonus > 0) {
        const nextBalance = user.balance + bonus;
        handleUpdateBalance(nextBalance);
      }
    }, 1200);
  };

  const handleAddBetHistory = async (newBet: Bet) => {
    // 1. Update React state & Client local cache immediately
    const updatedBets = [newBet, ...betHistory];
    setBetHistory(updatedBets);
    localStorage.setItem('tampa_fallback_bets', JSON.stringify(updatedBets));

    // 2. Perform optimistic Firebase sync background save
    const fbUser = auth.currentUser;
    if (fbUser) {
      const betRef = doc(db, 'users', fbUser.uid, 'bets', `bet_${newBet.period}_${Date.now()}`);
      try {
        await setDoc(betRef, newBet);
      } catch (err) {
        console.warn("Failed to upload bet to Firestore (offline mode):", err);
      }
    }
  };

  // Render authentic screen views
  const renderTabContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            user={user}
            onSelectTab={(tab) => setActiveTab(tab)}
            onRefreshBalance={handleRefreshBalance}
            isRefreshing={isRefreshing}
          />
        );
      case 'play-bigly':
        return (
          <BiglyGameView
            user={user}
            onUpdateBalance={handleUpdateBalance}
            onAddBetHistory={handleAddBetHistory}
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'play-balloon':
        return (
          <BalloonGameView
            user={user}
            onUpdateBalance={handleUpdateBalance}
            onAddBetHistory={handleAddBetHistory}
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'play-tapbox':
        return (
          <TapBoxGameView
            user={user}
            onUpdateBalance={handleUpdateBalance}
            onAddBetHistory={handleAddBetHistory}
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'refer':
        return <ReferView user={user} />;
      case 'wallet':
        return (
          <WalletView
            user={user}
            onUpdateBalance={handleUpdateBalance}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
          />
        );
      case 'account':
        return (
          <AccountView
            user={user}
            onLogout={handleLogout}
          />
        );
      case 'admin':
        return (
          <AdminView
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        );
      default:
        return (
          <HomeView
            user={user}
            onSelectTab={(tab) => setActiveTab(tab)}
            onRefreshBalance={handleRefreshBalance}
            isRefreshing={isRefreshing}
          />
        );
    }
  };

  // If we are still syncing user logins or profile documents
  if (loadingApp) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8.5 h-8.5 animate-spin text-[#00A79D] mx-auto opacity-90" />
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase leading-none">Connecting Secure Database...</p>
        </div>
      </div>
    );
  }

  // If unauthorized / not logged in, show auth screens
  if (!user) {
    return <RegistrationView onRegisterSuccess={handleRegisterSuccess} />;
  }

  // Real-time block suspension screen matches prompt parameters (mobile 8709913752)
  if (user.blocked) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 p-8 rounded-[36px] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto animate-bounce">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Account Suspended</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide leading-relaxed">
              Your account ID has been blocked by system administration due to compliance policies or security verification failure.
            </p>
          </div>
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 space-y-1">
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">Support Telegram ID</span>
            <p className="font-mono text-sm font-black text-red-600">
              @rihu2020
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition text-xs uppercase tracking-widest"
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-0 md:p-6 lg:p-8 selection:bg-teal-500/20 selection:text-teal-900 leading-normal font-sans text-slate-800">
      
      {/* Outer dual-responsive smartphone mockup container */}
      <div className="relative w-full max-w-md bg-[#FAFDFE] min-h-screen md:min-h-[812px] md:rounded-[40px] md:shadow-2xl md:border-8 md:border-slate-800 overflow-hidden flex flex-col justify-between">
        
        {/* Subtle decorative internal camera notch */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 pointer-events-none" />

        {/* Brand App Bar / Navigation Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 py-4.5 border-b border-slate-100 flex items-center justify-between z-30 shadow-sm shadow-slate-100/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm relative">
              <TampaLogo size="sm" showText={false} className="scale-[0.55]" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-[#FF6B53] uppercase leading-none">
                TAMPA
              </h1>
              <p className="text-[8px] uppercase tracking-wider text-[#00A79D] font-black font-mono">
                Bay prediction
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-xl flex items-center space-x-1.5 shadow-sm text-xs select-none">
            <span className="w-2 h-2 rounded-full bg-[#00A79D] inline-block animate-pulse" />
            <span className="text-slate-500 font-mono font-bold uppercase tracking-wider text-[9px]">
              UID: {user.uid}
            </span>
          </div>
        </header>

        {/* Dynamic scrollable Main Body Panel */}
        <main className="flex-1 overflow-y-auto px-5 pt-5 min-h-0 bg-gradient-to-b from-white via-[#FAFDFE] to-teal-50/10">
          {renderTabContent()}
        </main>

        {/* 
          Standard-compliant Bottom Navigation Layout matching Screen 3, 4, 13, 14 
          Ensures perfectly proportional icons, elevation circles, and indicator nodes.
        */}
        <nav className="sticky bottom-0 bg-white/95 border-t border-slate-100 px-3 py-3 w-full flex items-center justify-around z-40 shadow-[0_-4px_24px_rgba(0,167,157,0.06)] backdrop-blur-sm">
          
          {/* HOME (Feed) Tab */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center w-12 py-1 space-y-0.5 select-none transition-all active:scale-90 cursor-pointer ${
              activeTab === 'home' ? 'text-[#00A79D]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home size={18} className={activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[9px] font-black uppercase tracking-wider scale-90">Feed</span>
          </button>

          {/* REFER Tab */}
          <button
            onClick={() => setActiveTab('refer')}
            className={`flex flex-col items-center justify-center w-12 py-1 space-y-0.5 select-none transition-all active:scale-90 cursor-pointer ${
              activeTab === 'refer' ? 'text-[#00A79D]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users size={18} className={activeTab === 'refer' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[9px] font-black uppercase tracking-wider scale-90">Refer</span>
          </button>

          {/* CENTRAL ELEVATED CIRCULAR GAME TAB BUTTON */}
          <div className="relative -top-3">
            <button
              onClick={() => {
                setActiveTab('play-tapbox');
              }}
              className="relative w-14 h-14 bg-gradient-to-tr from-[#00A79D] to-[#43C6AC] text-white rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 transition-transform active:scale-95 group overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="scale-65 relative z-10 pointer-events-none">
                <TampaLogo size="sm" showText={false} className="text-white fill-white pointer-events-none filter brightness-0 invert" />
              </div>
            </button>
            <span className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-[#00A79D] tracking-widest whitespace-nowrap animate-pulse">
              {activeTab === 'play-tapbox' ? 'PLAYING' : 'TAP BOX'}
            </span>
          </div>

          {/* WALLET Tab */}
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center justify-center w-12 py-1 space-y-0.5 select-none transition-all active:scale-90 cursor-pointer ${
              activeTab === 'wallet' ? 'text-[#00A79D]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet size={18} className={activeTab === 'wallet' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[9px] font-black uppercase tracking-wider scale-90">Wallet</span>
          </button>

          {/* ACCOUNT Tab */}
          <button
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center w-12 py-1 space-y-0.5 select-none transition-all active:scale-90 cursor-pointer ${
              activeTab === 'account' ? 'text-[#00A79D]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User size={18} className={activeTab === 'account' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[9px] font-black uppercase tracking-wider scale-90">Account</span>
          </button>

          {/* ADMIN Tab (Only visible to admin mobile number 8709913752) */}
          {user.mobile === '8709913752' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center w-12 py-1 space-y-0.5 select-none transition-all active:scale-90 cursor-pointer ${
                activeTab === 'admin' ? 'text-[#FF6B53]' : 'text-slate-400 hover:text-[#FF6B53]'
              }`}
            >
              <ShieldAlert size={18} className={activeTab === 'admin' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[9px] font-black uppercase tracking-wider scale-90">Admin</span>
            </button>
          )}

        </nav>

      </div>

    </div>
  );
}
