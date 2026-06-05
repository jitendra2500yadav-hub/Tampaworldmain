import React, { useState } from 'react';
import TampaLogo from './TampaLogo';
import { UserProfile } from '../types';
import { Phone, Lock, Tag, ArrowRight, UserCheck, Loader2 } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface RegistrationViewProps {
  onRegisterSuccess: (user: UserProfile) => void;
}

export default function RegistrationView({ onRegisterSuccess }: RegistrationViewProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referCode, setReferCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getCleanEmail = (mob: string) => {
    const numbersOnly = mob.replace(/[^0-9]/g, '');
    return `${numbersOnly || 'guest'}@tampabay.com`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedMobile = mobile.trim();
    if (!trimmedMobile) {
      setError('Please enter a valid mobile number.');
      setLoading(false);
      return;
    }
    if (password.length < 5) {
      setError('Password must be at least 5 characters.');
      setLoading(false);
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const email = getCleanEmail(trimmedMobile);
      
      if (isLogin) {
        // Authenticate existing account using Firebase Auth
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          throw new Error('Invalid mobile credentials or account not registered yet.');
        }

        const uid = userCredential.user.uid;
        const profilePath = `users/${uid}`;
        
        // Fetch profile associated with account
        let docSnap;
        try {
          docSnap = await getDoc(doc(db, 'users', uid));
        } catch (fetchErr) {
          handleFirestoreError(fetchErr, OperationType.GET, profilePath);
        }

        if (docSnap && docSnap.exists()) {
          const profileData = docSnap.data();
          onRegisterSuccess({
            uid: profileData.uid || uid,
            referCode: profileData.referCode || 'ABCD',
            balance: typeof profileData.balance === 'number' ? profileData.balance : 120.50,
            mobile: profileData.mobile || trimmedMobile,
            lastOnline: 'Just now'
          });
        } else {
          // Recover profile object if document is not initialized
          const restoredProfile: UserProfile = {
            uid: uid.substring(0, 6),
            referCode: 'ABCD',
            balance: 120.50,
            mobile: trimmedMobile,
            lastOnline: 'Just now'
          };
          try {
            await setDoc(doc(db, 'users', uid), restoredProfile);
          } catch (writeErr) {
            handleFirestoreError(writeErr, OperationType.WRITE, profilePath);
          }
          onRegisterSuccess(restoredProfile);
        }
      } else {
        // Register brand new secure account inside Firebase Authentication
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            throw new Error('This mobile number is already registered. Please Switch to Login.');
          }
          throw new Error(authErr.message || 'Firebase Registration Failed.');
        }

        const fullUid = userCredential.user.uid;
        const cleanUid = fullUid.substring(0, 6).toUpperCase(); // Short user readable ID
        const finalRefer = referCode.trim().toUpperCase() || 'ABCD';

        const newProfile: UserProfile = {
          uid: cleanUid,
          referCode: finalRefer,
          balance: 120.50,
          mobile: trimmedMobile,
          lastOnline: 'Just now'
        };

        const profilePath = `users/${fullUid}`;
        try {
          await setDoc(doc(db, 'users', fullUid), newProfile);
        } catch (writeErr) {
          handleFirestoreError(writeErr, OperationType.WRITE, profilePath);
        }

        onRegisterSuccess(newProfile);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      let userCredential;
      try {
        userCredential = await signInAnonymously(auth);
      } catch (authErr: any) {
        throw new Error('Anonymous authentication is disabled or failed. Please register with mobile.');
      }

      const fullUid = userCredential.user.uid;
      const cleanUid = fullUid.substring(0, 6).toUpperCase();

      const guestProfile: UserProfile = {
        uid: cleanUid,
        referCode: 'ABCD',
        balance: 120.50,
        mobile: 'Guest Mode',
        lastOnline: 'Just now'
      };

      const profilePath = `users/${fullUid}`;
      try {
        await setDoc(doc(db, 'users', fullUid), guestProfile);
      } catch (writeErr) {
        handleFirestoreError(writeErr, OperationType.WRITE, profilePath);
      }

      onRegisterSuccess(guestProfile);
    } catch (err: any) {
      setError(err.message || 'Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Outer frame styling for a realistic mobile layout */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col p-6 min-h-[640px] justify-between relative">
        
        {/* Abstract design nodes in grid corners */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-100 to-transparent rounded-full opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral-100 to-transparent rounded-full opacity-60 pointer-events-none" />

        {/* Brand header */}
        <div className="text-center mt-4">
          <TampaLogo size="md" />
        </div>

        {/* Interactive form body */}
        <form onSubmit={handleRegister} className="mt-8 space-y-4 flex-grow max-w-sm mx-auto w-full">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs py-2 px-3 rounded-lg text-center border border-red-100 font-semibold">
              {error}
            </div>
          )}

          {/* Mobile No. */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 block ml-1 uppercase tracking-wider">Mobile No. / Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={16} />
              </span>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B53] focus:border-transparent transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 block ml-1 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B53] focus:border-transparent transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Confirm Password (only on Register) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 block ml-1 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B53] focus:border-transparent transition-all"
                  disabled={loading}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Refer Code (only on Register) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 block ml-1 uppercase tracking-wider">Refer Code (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Tag size={16} />
                </span>
                <input
                  type="text"
                  value={referCode}
                  onChange={(e) => setReferCode(e.target.value)}
                  placeholder="Optional - Enter Code"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A79D] focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B53] hover:bg-[#ff573c] text-white font-bold py-3 px-6 rounded-full shadow-md shadow-coral-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="tracking-wide">{isLogin ? 'LOG IN' : 'REGISTER'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* OR Divider */}
          <div className="flex items-center justify-center space-x-2 my-2 text-gray-300">
            <span className="h-[1px] w-full bg-slate-200"></span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">or</span>
            <span className="h-[1px] w-full bg-slate-200"></span>
          </div>

          {/* Guest Action Button */}
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-[#00A79D] font-bold py-2.5 px-6 rounded-full border-2 border-dashed border-[#00A79D]/50 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <UserCheck size={16} />
            <span className="tracking-wider uppercase text-xs">Guest Login</span>
          </button>
        </form>

        {/* Footer switcher */}
        <div className="text-center pt-6 mt-4 border-t border-slate-50">
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-xs text-[#00A79D] hover:underline font-semibold"
          >
            {isLogin
              ? "Don't have an account? Register here"
              : "Already have an account? Login here."}
          </button>
        </div>
      </div>
    </div>
  );
}
