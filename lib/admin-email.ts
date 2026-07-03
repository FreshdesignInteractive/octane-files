// The one hardcoded admin email — kept in its own leaf module with zero
// other imports so it's safe to use from client components (e.g. SiteHeader's
// avatar menu) without pulling in server-only code like next/headers.
// See AGENTS.md: this must stay in sync with the matching email hardcoded in
// supabase-schema.sql's models RLS policies.
const ADMIN_EMAIL = 'raj.sidharthan@freshdesign.com'

export function isAdminEmail(email: string | null | undefined) {
  return email === ADMIN_EMAIL
}
