import { createClient } from './supabase-server'
import { redirect } from 'next/navigation'
import { isAdminEmail } from './admin-email'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) redirect('/login')
  return user
}
