import { createClient } from './supabase-server'
import { redirect } from 'next/navigation'
import { checkIsAdmin } from './is-admin'

// There is no dedicated /login page (removed in favor of the header's
// SignInDialog) — `?signin=1` tells SiteHeader to open that dialog on
// arrival at the homepage. Signed-in-but-not-admin is a different case
// (re-showing a Google prompt wouldn't grant admin) so it just goes home.
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?signin=1')
  if (!(await checkIsAdmin(supabase))) redirect('/')
  return user
}
