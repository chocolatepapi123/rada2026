import React, { useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  OTP_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  friendlyAuthError,
  signUpWithEmail,
  sendEmailLoginCode,
  resendSignupCode,
  verifyCode,
  sendPasswordResetCode,
  resetPasswordWithCode,
  type VerifyKind,
} from '../lib/supabase';
import { Lock, Mail, User, ArrowRight, ArrowLeft, MapPin, X, Loader2, KeyRound } from 'lucide-react';
import { LegalModal, LEGAL_VERSION, type LegalDoc } from './LegalModal';
import { logPlatformEvent } from '../lib/platformAnalytics';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  onContinueAsGuest?: () => void;
  customMessage?: string;
}

type View = 'form' | 'verify' | 'forgot' | 'reset';

const RESEND_SECONDS = 60;

const inputCls =
  'w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E0533C] focus:ring-2 focus:ring-[#E0533C]/15 transition';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1.5';
const primaryBtnCls =
  'w-full mt-2 py-3.5 bg-[#E0533C] hover:bg-[#cf4a35] active:scale-[0.99] font-black text-white rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-[#E0533C]/25 disabled:opacity-50 cursor-pointer text-sm';
const linkBtnCls = 'text-[#E0533C] font-bold hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline';

export function AuthModal({ isOpen, onSuccess, onClose, onContinueAsGuest, customMessage }: AuthModalProps) {
  const [view, setView] = useState<View>('form');
  const [isSignUp, setIsSignUp] = useState(true);
  const [useCode, setUseCode] = useState(false); // email login: code instead of password

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [target, setTarget] = useState(''); // email the code was sent to
  const [verifyKind, setVerifyKind] = useState<VerifyKind>('signup');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sign-up consent (18+ and Terms/Privacy). Required before an account can be created.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

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

  // ---------- form: sign up / log in ----------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const em = normalizeEmail(email);

      if (isSignUp) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        // The name becomes the private display name. Blank = the database assigns new_user_NN.
        if (!ageConfirmed) throw new Error('You must be 18 or older to use RADA.');
        if (!termsAccepted) throw new Error('Please agree to the Terms, Privacy Policy and Community Guidelines to continue.');
        const { signedIn } = await signUpWithEmail(em, password, fullName.trim() || undefined, {
          ageConfirmed,
          termsAccepted,
          legalVersion: LEGAL_VERSION,
        });
        if (signedIn) {
          logPlatformEvent('signup');
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
        logPlatformEvent('login');
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
      logPlatformEvent(verifyKind === 'signup' ? 'signup' : 'login');
      onSuccess();
    });
  }

  function handleResend() {
    if (cooldown > 0) return;
    run(async () => {
      if (verifyKind === 'signup') await resendSignupCode(target);
      else await sendEmailLoginCode(target);
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
      ? (view === 'reset' ? 'Check your email' : 'Reset your password')
      : view === 'verify'
      ? 'Check your email'
      : 'Welcome to RADA';

  const subline =
    view === 'forgot'
      ? 'Enter your email and we will send you a code to reset your password.'
      : view === 'reset'
      ? `We emailed a code to ${target}. Open it, then enter the code here with your new password.`
      : view === 'verify'
      ? `We sent a verification email to ${target}. Open it and enter the ${OTP_LENGTH}-digit code below.`
      : customMessage ||
        (isSignUp
          ? 'Create your account to discover local spots near you & find experiences in your city'
          : 'Log in to continue to your RADA account');

  const submitLabel =
    !isSignUp && useCode
      ? 'Send Code'
      : isSignUp
      ? 'Create Account'
      : 'Sign In';

  const showPassword = isSignUp || !useCode;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-150"
      style={{ background: 'linear-gradient(180deg, #F9D8C7 0%, #FCEADF 38%, #FFF8F4 100%)' }}
    >
      <div
        className="min-h-full flex flex-col items-center justify-center px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
      {/* The RADA mark, same as the app header */}
      <div className="flex items-center gap-2.5 mb-5 select-none">
        <div className="w-11 h-11 rounded-2xl bg-[#E0533C] flex items-center justify-center shadow-md shadow-[#E0533C]/30">
          <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[32px] leading-none font-black tracking-tight text-[#E0533C]">RADA</span>
      </div>
      <div className="w-full max-w-md bg-white/90 backdrop-blur border border-white rounded-[28px] p-6 shadow-xl shadow-[#E0533C]/10 text-slate-900 relative">
        {/* Optional Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
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
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6 pt-1">
          {view !== 'form' && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E0533C]/10 text-[#E0533C] mb-3">
              {view === 'verify' || view === 'reset' ? <Mail className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
          )}
          <h2 className="text-[22px] font-black tracking-tight text-slate-900">{headline}</h2>
          <p className="text-slate-500 text-[13px] mt-1.5 font-medium leading-snug">{subline}</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* ===== SIGN UP / LOG IN ===== */}
        {view === 'form' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className={labelCls}>Display Name (Optional, only you see this)</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name, or leave blank"
                      autoComplete="name"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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

              {showPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-500">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => goTo('forgot')}
                        className="text-[11px] text-[#E0533C] font-bold hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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

              {isSignUp && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 text-[11px] text-slate-600 leading-snug cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#E0533C] shrink-0"
                    />
                    <span>I confirm that I am 18 years or older.</span>
                  </label>
                  <label className="flex items-start gap-2 text-[11px] text-slate-600 leading-snug cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#E0533C] shrink-0"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalDoc('terms'); }}
                        className="text-[#E0533C] font-bold underline cursor-pointer"
                      >
                        Terms of Use
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalDoc('privacy'); }}
                        className="text-[#E0533C] font-bold underline cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      , and the{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalDoc('guidelines'); }}
                        className="text-[#E0533C] font-bold underline cursor-pointer"
                      >
                        Community Guidelines
                      </button>
                      .
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (isSignUp && !(ageConfirmed && termsAccepted))}
                className={primaryBtnCls}
              >
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
            {!isSignUp && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseCode((v) => !v);
                    setErrorMsg('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
                >
                  {useCode ? 'Use password instead' : 'Email me a code instead'}
                </button>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="mt-5 text-center text-xs text-slate-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={switchMode} className={`${linkBtnCls} ml-1`}>
                {isSignUp ? 'Log In' : 'Sign Up'}
              </button>
            </div>

            {/* Guest Mode Option */}
            {onContinueAsGuest && (
              <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="text-slate-500 hover:text-slate-900 text-xs font-semibold hover:underline transition cursor-pointer"
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
              className="w-full py-3.5 bg-white rounded-2xl text-2xl font-black text-center tracking-[0.5em] border border-slate-200 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#E0533C] focus:ring-2 focus:ring-[#E0533C]/15 transition"
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

            <p className="text-center text-[11px] leading-snug text-slate-400 px-2">
              Can&apos;t find it? Check your spam or promotions folder, and give it a minute.
            </p>

            <div className="text-center text-xs text-slate-500">
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
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
              className="w-full py-3.5 bg-white rounded-2xl text-2xl font-black text-center tracking-[0.5em] border border-slate-200 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#E0533C] focus:ring-2 focus:ring-[#E0533C]/15 transition"
            />

            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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

            <p className="text-center text-[11px] leading-snug text-slate-400 px-2">
              Can&apos;t find it? Check your spam or promotions folder, and give it a minute.
            </p>

            <div className="text-center text-xs text-slate-500">
              Did not get it?{' '}
              <button type="button" onClick={handleResendReset} disabled={cooldown > 0 || loading} className={linkBtnCls}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
}
