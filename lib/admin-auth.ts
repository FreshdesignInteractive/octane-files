import { createClient } from './supabase-server'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'raj.sidharthan@freshdesign.com'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/login')
  return user
}

export function isAdminEmail(email: string | null | undefined) {
  return email === ADMIN_EMAIL
}
