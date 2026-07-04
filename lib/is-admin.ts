import type { SupabaseClient } from '@supabase/supabase-js'

// Single source of truth for admin identity, on both the DB side (the
// admins table + is_admin() SECURITY DEFINER function) and here on the app
// side — no more separately-hardcoded email. Dependency-free enough to call
// from client components (SiteHeader's avatar menu) as well as server code
// (admin-auth.ts, the admin API routes), same as the old admin-email.ts.
export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return !!data
}
