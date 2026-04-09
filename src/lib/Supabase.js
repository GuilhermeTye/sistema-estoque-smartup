import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ctmsxbcalskxzotvznem.supabase.co";
const supabaseAnonKey = "sb_publishable_qZRSOSw7_4QhTTHQxOLzqg_KQXqzlXh";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
NEXT_PUBLIC_SUPABASE_URL=https://ctmsxbcalskxzotvznem.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_qZRSOSw7_4QhTTHQxOLzqg_KQXqzlXh
*/
 