import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sdnuzcdcaxuydoyocqgj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_CakDY3TRcwAUw8FvXBynkw_PaeoCuGW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

