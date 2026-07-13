import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Server-side OAuth callback — exchanges the PKCE code for a session and
// writes the session cookie via the response, then redirects back to
// wherever the user started (SignInDialog sets ?next= to the page it was
// opened from). Deliberately NOT a client component: a single server-side
// exchange avoids the client/cookie conflict that broke the previous
// cookie-auth attempt (see commits 63d9163 / 2a48d14).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  // Only ever redirect to a same-origin relative path — never trust `next`
  // as-is, that's a textbook open-redirect vector. Must start with a single
  // `/` (rules out absolute URLs and `//host` protocol-relative ones) and
  // contain no backslash (a legacy browser normalization trick for the same).
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error('OAuth code exchange failed:', error.message)
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}
