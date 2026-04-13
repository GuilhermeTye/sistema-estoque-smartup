import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/*
NEXT_PUBLIC_SUPABASE_URL=https://ctmsxbcalskxzotvznem.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_qZRSOSw7_4QhTTHQxOLzqg_KQXqzlXh
*/
 