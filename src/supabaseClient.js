import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqxhazmcdmcygmywbhzh.supabase.co';
const supabaseKey = 'sb_publishable_JldZXDX42_JegvOY7AaTnA_ybskQwJY';

export const supabase = createClient(supabaseUrl, supabaseKey);
