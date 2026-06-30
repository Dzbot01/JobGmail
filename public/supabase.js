import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcxtbtleeeaeqeryiwea.supabase.co';
const supabaseKey = 'sb_publishable_5rQxfGd82O_EooSxxBkcRw_S5ATDox0';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce'
  }
});

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://job-gmail.vercel.app/' // JANGAN pake window.location.origin
    }
  });
  if (error) console.error(error);
};