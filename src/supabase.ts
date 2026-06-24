import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcxtbtleeeaeqeryiwea.supabase.co';
const supabaseKey = 'sb_publishable_5rQxfGd82O_EooSxxBkcRw_S5ATDox0';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) console.error(error);
};
