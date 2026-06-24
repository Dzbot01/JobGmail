import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcxtbtleeeaeqeryiwea.supabase.co';
const supabaseKey = 'sb_publishable_5rQxfGd82O_EooSxxBkcRw_S5ATDox0';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,        // simpan session ke localStorage
    autoRefreshToken: true,      // auto refresh token yg expired
    detectSessionInUrl: true,    // nangkep #access_token atau ?code dari URL
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce'             // WAJIB buat OAuth Google. Pake code, bukan hash
  }
});

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin // https://job-gmail.vercel.app/
    }
  });
  if (error) console.error(error);
};