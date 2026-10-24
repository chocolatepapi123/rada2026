import { createClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder')
);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!isSupabaseConfigured) {
  console.info('[RADA] Supabase environment variables not configured. Operating in offline/local mock mode.');
}

// Sessions persist in the browser and refresh automatically, so a user can sign in
// to their one account from any device and stay signed in.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// =====================================================================
// AUTH HELPERS (email / phone codes, password reset, one account per identity)
// Requires the SQL in auth_uniqueness.sql (function auth_identifier_taken).
// =====================================================================

/** Must match "Email OTP Length" in Supabase → Authentication → Providers → Email (default 6). */
export const OTP_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 8;

export type VerifyKind = 'signup' | 'email' | 'sms';

const MSG_EXISTS =
  'An account with this email or phone number already exists. Log in instead.';
const MSG_NO_ACCOUNT = 'No account found with those details. Sign up instead.';

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Turns user input into E.164 (+2547XXXXXXXX). Kenyan formats (07XX, 01XX, 7XX, 2547XX)
 * are accepted; other countries must start with "+". Returns null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s\-().]/g, '');
  if (!p) return null;

  if (p.startsWith('+')) {
    // already international
  } else if (p.startsWith('00')) {
    p = '+' + p.slice(2);
  } else if (/^0[17]\d{8}$/.test(p)) {
    p = '+254' + p.slice(1);
  } else if (/^[17]\d{8}$/.test(p)) {
    p = '+254' + p;
  } else if (/^254[17]\d{8}$/.test(p)) {
    p = '+' + p;
  } else {
    return null;
  }
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

/** Turns Supabase errors into short messages for the UI. */
export function friendlyAuthError(err: unknown): string {
  const raw = (err as any)?.message ? String((err as any).message) : '';
  const m = raw.toLowerCase();

  if (!raw) return 'Something went wrong. Please try again.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists') || m.includes('database error saving new user') || m.includes('duplicate key')) return MSG_EXISTS;
  if (m.includes('signups not allowed') || m.includes('user not found')) return MSG_NO_ACCOUNT;
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'Verify your email first. Sign up again to get a new code.';
  if (m.includes('otp') || m.includes('token has expired') || m.includes('token is invalid')) return 'That code is incorrect or has expired. Request a new one.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('phone provider') || m.includes('sms') || m.includes('unsupported phone')) return 'Phone codes are unavailable right now. Use email instead.';
  if (m.includes('same password') || m.includes('different from the old')) return 'Choose a password you have not used before.';
  if (m.includes('password') && m.includes('characters')) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (m.includes('failed to fetch') || m.includes('network')) return 'No connection. Check your internet and try again.';
  return raw;
}

/**
 * true  = a confirmed account already uses this email/phone
 * false = free to register
 * null  = the check could not run (function missing / network)
 */
export async function isIdentifierTaken(args: { email?: string; phone?: string }): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.rpc('auth_identifier_taken', {
      p_email: args.email ?? null,
      p_phone: args.phone ?? null,
    });
    if (error || typeof data !== 'boolean') return null;
    return data;
  } catch {
    return null;
  }
}

/** Email sign-up. Returns signedIn=true only when "Confirm email" is off in Supabase. */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<{ signedIn: boolean }> {
  const taken = await isIdentifierTaken({ email });
  if (taken === true) throw new Error(MSG_EXISTS);

  // The typed name is the private display name. The database always assigns the public
  // username as new_user_NN (see handle_new_user), and uses new_user_NN as the display name too if blank.
  const name = (displayName || '').trim().slice(0, 40);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    ...(name ? { options: { data: { display_name: name, full_name: name } } } : {}),
  });
  if (error) throw error;

  // With email confirmation on, Supabase hides duplicates by returning a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error(MSG_EXISTS);
  }
  return { signedIn: Boolean(data.session) };
}

/** Re-sends the sign-up confirmation code. */
export async function resendSignupCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/** Passwordless login code for an EXISTING email account (never creates accounts). */
export async function sendEmailLoginCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

/**
 * Sends an SMS code. Sign-up first confirms the number is not already registered;
 * login never creates an account.
 */
export async function sendPhoneCode(phone: string, isSignUp: boolean): Promise<void> {
  if (isSignUp) {
    const taken = await isIdentifierTaken({ phone });
    if (taken === true) throw new Error(MSG_EXISTS);
    // If the check cannot run, stop: otherwise an existing user would be logged in instead of blocked.
    if (taken === null) throw new Error('Phone sign-up is unavailable right now. Use email instead.');
  }
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: isSignUp,
      channel: 'sms',
    },
  });
  if (error) throw error;
}

/** Verifies a code from sign-up, email login, or SMS. Resolves with the new session. */
export async function verifyCode(target: string, token: string, kind: VerifyKind) {
  const code = token.replace(/\D/g, '');
  const { data, error } =
    kind === 'sms'
      ? await supabase.auth.verifyOtp({ phone: target, token: code, type: 'sms' })
      : await supabase.auth.verifyOtp({ email: target, token: code, type: kind });
  if (error) throw error;
  if (!data.session) throw new Error('Verification failed. Please try again.');
  return data;
}

/**
 * Forgot password, step 1. Always succeeds from the user's point of view, so it never reveals
 * whether the email has an account. In Supabase → Email Templates → "Reset Password",
 * show {{ .Token }} so the user receives a code.
 */
export async function sendPasswordResetCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
  if (error) throw error;
}

/** Forgot password, step 2: check the code, then set the new password (signs the user in). */
export async function resetPasswordWithCode(email: string, token: string, newPassword: string): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const code = token.replace(/\D/g, '');
  const { error: verifyErr } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (verifyErr) throw verifyErr;
  const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) throw updateErr;
}
