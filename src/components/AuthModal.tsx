import React, { useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  OTP_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizePhone,
  friendlyAuthError,
  signUpWithEmail,
  sendEmailLoginCode,
  sendPhoneCode,
  resendSignupCode,
  verifyCode,
  sendPasswordResetCode,
  resetPasswordWithCode,
  type VerifyKind,
} from '../lib/supabase';
import { Lock, Mail, User, Phone, ArrowRight, ArrowLeft, ShieldCheck, X, Loader2, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  onContinueAsGuest?: () => void;
  customMessage?: string;
}

type View = 'form' | 'verify' | 'forgot' | 'reset';
type Method = 'email' | 'phone';

const RESEND_SECONDS = 60;

const inputCls =
  'w-full pl-9 pr-4 py-2.5 bg-stone-800/80 rounded-xl text-sm border border-stone-700/80 text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition';
const labelCls = 'block text-xs font-semibold text-stone-400 mb-1';
const primaryBtnCls =
  'w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-[#E0533C] dark:to-[#A94F3E] hover:opacity-90 font-black text-white rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer text-sm';
const linkBtnCls = 'text-amber-500 font-bold hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline';

export function AuthModal({ isOpen, onSuccess, onClose, onContinueAsGuest, customMessage }: AuthModalProps) {
  const [view, setView] = useState<View>('form');
  const [method, setMethod] = useState<Method>('email');
  const [isSignUp, setIsSignUp] = useState(true);
  const [useCode, setUseCode] = useState(false); // email login: code instead of password

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [target, setTarget] = useState(''); // email or E.164 phone the code was sent to
  const [verifyKind, setVerifyKind] = useState<VerifyKind>('signup');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!isOpen) return null;

  // ---------- helpers ----------
  async function run(task: () => Promise<void>) {
    setLoading(true);
    setErrorMsg('');

    if (!isSupabaseConfigured) {
      // Offline/local mock mode keeps the old behaviour
      setTimeout(() => {
        setLoading(false);
        onSuccess();
      }, 400);
      return;
    }

    try {
      await task();
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  function goTo(next: View) {
    setView(next);
    setErrorMsg('');
    setCode('');
  }

  function startVerify(to: string, kind: VerifyKind) {
    setTarget(to);
    setVerifyKind(kind);
    setCooldown(RESEND_SECONDS);
    goTo('verify');
  }

  function switchMode() {
    setIsSignUp((v) => !v);
    setUseCode(false);
    setErrorMsg('');
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setErrorMsg('');
  }

  // ---------- form: sign up / log in ----------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      if (method === 'phone') {
        const p = normalizePhone(phone);
        if (!p) throw new Error('Enter a valid phone number, e.g. 0712 345 678.');
        await sendPhoneCode(p, isSignUp, fullName.trim());
        startVerify(p, 'sms');
        return;
      }

      const em = normalizeEmail(email);

      if (isSignUp) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        const { signedIn } = await signUpWithEmail(em, password, fullName.trim());
        if (signedIn) {
          onSuccess();
          return;
        }
        startVerify(em, 'signup');
      } else if (useCode) {
        await sendEmailLoginCode(em);
        startVerify(em, 'email');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) throw error;
        onSuccess();
      }
    });
  }

  // ---------- verify code ----------
  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      if (code.length < OTP_LENGTH) throw new Error(`Enter the ${OTP_LENGTH}-digit code.`);
      await verifyCode(target, code, verifyKind);
      onSuccess();
    });
  }

  function handleResend() {
    if (cooldown > 0) return;
    run(async () => {
      if (verifyKind === 'signup') await resendSignupCode(target);
      else if (verifyKind === 'email') await sendEmailLoginCode(target);
      else await sendPhoneCode(target, isSignUp, fullName.trim());
      setCooldown(RESEND_SECONDS);
    });
  }

  // ---------- forgot password ----------
  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const em = normalizeEmail(email);
      await sendPasswordResetCode(em);
      setTarget(em);
      setCooldown(RESEND_SECONDS);
      setNewPassword('');
      goTo('reset');
    });
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      if (code.length < OTP_LENGTH) throw new Error(`Enter the ${OTP_LENGTH}-digit code.`);
      await resetPasswordWithCode(target, code, newPassword);
      onSuccess();
    });
  }

  function handleResendReset() {
    if (cooldown > 0) return;
    run(async () => {
      await sendPasswordResetCode(target);
      setCooldown(RESEND_SECONDS);
    });
  }

  // ---------- copy ----------
  const headline =
    view === 'forgot' || view === 'reset'
      ? 'Reset your password'
      : view === 'verify'
      ? 'Enter your code'
      : 'Welcome to RADA';

  const subline =
    view === 'forgot'
      ? 'Enter your email and we will send you a code to reset your password.'
      : view === 'reset'
      ? `We sent a ${OTP_LENGTH}-digit code to ${target}. Enter it with your new password.`
      : view === 'verify'
      ? `We sent a ${OTP_LENGTH}-digit code to ${target}.`
      : customMessage ||
        (isSignUp
          ? 'Create your account to discover local spots near you & find experiences in your city'
          : 'Log in to continue to your RADA account');

  const submitLabel =
    method === 'phone' || (!isSignUp && useCode)
      ? 'Send Code'
      : isSignUp
      ? 'Create Account'
      : 'Sign In';

  const showPassword = method === 'email' && (isSignUp || !useCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl text-white relative">
        {/* Optional Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Back button for sub-screens */}
        {view !== 'form' && (
          <button
            type="button"
            onClick={() => goTo(view === 'reset' ? 'forgot' : 'form')}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-3 shadow-inner">
            {view === 'form' ? <ShieldCheck className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-black tracking-tight">{headline}</h2>
          <p className="text-stone-400 text-xs mt-1 font-medium">{subline}</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* ===== SIGN UP / LOG IN ===== */}
        {view === 'form' && (
          <>
            {/* Email / Phone switch */}
            <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-xl bg-stone-800/80">
              {(['email', 'phone'] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMethod(m)}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    method === m ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {m === 'email' ? 'Email' : 'Phone'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {method === 'email' ? (
                <div>
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={inputCls}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      autoComplete="tel"
                      className={inputCls}
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">We will text you a verification code.</p>
                </div>
              )}

              {showPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-400">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => goTo('forgot')}
                        className="text-[11px] text-amber-500 font-bold hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : '••••••••'}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className={primaryBtnCls}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{submitLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Email login: password <-> code */}
            {method === 'email' && !isSignUp && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseCode((v) => !v);
                    setErrorMsg('');
                  }}
                  className="text-xs text-stone-400 hover:text-white font-semibold hover:underline cursor-pointer"
                >
                  {useCode ? 'Use password instead' : 'Email me a code instead'}
                </button>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="mt-5 text-center text-xs text-stone-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={switchMode} className={`${linkBtnCls} ml-1`}>
                {isSignUp ? 'Log In' : 'Sign Up'}
              </button>
            </div>

            {/* Guest Mode Option */}
            {onContinueAsGuest && (
              <div className="mt-4 pt-3 border-t border-stone-800 text-center">
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="text-stone-400 hover:text-white text-xs font-semibold hover:underline transition cursor-pointer"
                >
                  Continue as Guest
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== VERIFY CODE ===== */}
        {view === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-3.5">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder={'•'.repeat(OTP_LENGTH)}
              className="w-full py-3 bg-stone-800/80 rounded-xl text-xl font-black text-center tracking-[0.5em] border border-stone-700/80 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 transition"
            />

            <button type="submit" disabled={loading || code.length < OTP_LENGTH} className={primaryBtnCls}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center text-xs text-stone-400">
              Did not get it?{' '}
              <button type="button" onClick={handleResend} disabled={cooldown > 0 || loading} className={linkBtnCls}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {/* ===== FORGOT PASSWORD: ASK FOR EMAIL ===== */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3.5">
            <div>
              <label className={labelCls}>Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={primaryBtnCls}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ===== FORGOT PASSWORD: CODE + NEW PASSWORD ===== */}
        {view === 'reset' && (
          <form onSubmit={handleReset} className="space-y-3.5">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder={'•'.repeat(OTP_LENGTH)}
              className="w-full py-3 bg-stone-800/80 rounded-xl text-xl font-black text-center tracking-[0.5em] border border-stone-700/80 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 transition"
            />

            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  autoComplete="new-password"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < OTP_LENGTH || newPassword.length < MIN_PASSWORD_LENGTH}
              className={primaryBtnCls}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center text-xs text-stone-400">
              Did not get it?{' '}
              <button type="button" onClick={handleResendReset} disabled={cooldown > 0 || loading} className={linkBtnCls}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
