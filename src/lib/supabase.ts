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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

