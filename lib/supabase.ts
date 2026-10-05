import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ujiqdozsipxwjrugtsgd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jfhrpcWLhECHJEnE1AhiaQ_zgDT7D4R';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

