import { createClient } from './supabase-server'
import { redirect } from 'next/navigation'
import { checkIsAdmin } from './is-admin'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await checkIsAdmin(supabase))) redirect('/login')
  return user
}
