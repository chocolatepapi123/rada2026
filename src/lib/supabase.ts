import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://yobauhydhkptiuwvrntm.supabase.co';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_placeholder';

let client: any;
try {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.warn('[AI Studio] Supabase client initialization fallback:', err);
  const mockTable = () => ({
    select: () => ({ order: async () => ({ data: [], error: null }) }),
    insert: () => ({ select: async () => ({ data: [], error: null }) }),
    update: () => ({ select: async () => ({ data: [], error: null }) }),
    delete: () => ({ select: async () => ({ data: [], error: null }) }),
  });
  client = {
    from: () => mockTable(),
  };
}

export const supabase = client;
 