/* Critical Care Universe: beta login configuration.
   Paste your Supabase Project URL and the anon (public) key between the quotes, then save.
   Supabase dashboard > Project Settings > API.
   The anon key is MEANT to be public: what it can do is limited by Row Level Security.
   NEVER paste the service_role key here, or anywhere in this repository. */
window.CCU_AUTH_CONFIG = {
  supabaseUrl: "https://ruuvtmdabnmutxxqgfkj.supabase.co",     /* looks like https://abcdefghijkl.supabase.co */
  supabaseAnonKey: "sb_publishable_b3oDmLr0eUArcP5rsGoexQ_RTVlLf_o",    /* a long text that starts with eyJ... */
  adminFunction: "admin-beta"                          /* the name of the Edge Function that approves users */
};
