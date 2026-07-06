<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'

const supabase = createClient(
  'https://zcxtbtleeeaeqeryiwea.supabase.co',
  'sb_publishable_5rQxfGd82O_EooSxxBkcRw_S5ATDox0'
)

document.getElementById('login-google').addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://job-gmail.vercel.app/auth/callback'
    }
  })
  if (error) console.error(error)
})
</script>

<button id="login-google">Login with Google</button>
