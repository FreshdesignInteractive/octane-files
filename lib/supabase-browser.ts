import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // flowType is always 'pkce' regardless of this setting — @supabase/ssr
          // enforces it internally. autoRefreshToken/persistSession already
          // default to true in a browser context.
          //
          // detectSessionInUrl: false is defensive, not load-bearing — the code
          // exchange now happens entirely in app/auth/callback/route.ts (a server
          // Route Handler), so this client never runs on a page with a ?code=
          // param in its URL. Kept explicit because a prior version of this app
          // hit a real conflict from relying on the opposite default (see commit
          // 62307bc) — worth being deliberate here rather than implicit.
          detectSessionInUrl: false,
        },
      }
    )
  }
  return _client
}
