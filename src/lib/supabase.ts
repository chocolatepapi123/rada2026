import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yobauhydhkptiuwvrntm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VcRV-0zw24s2b_P7aCNC7A_0-23-NbI...'; // Paste your full publishable key here inside quotes

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 