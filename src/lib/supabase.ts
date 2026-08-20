import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://jkislfdfitxhmgadnvlh.supabase.co";
const supabaseAnonKey =
  "sb_publishable_wXBehKqgBgchAMchkHUh1Q_nNxl5Nvh";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "implicit",
  },
});