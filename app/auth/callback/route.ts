import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Server-side OAuth callback — exchanges the PKCE code for a session and
// writes the session cookie via the response, then redirects home.
// Deliberately NOT a client component: a single server-side exchange avoids
// the client/cookie conflict that broke the previous cookie-auth attempt
// (see commits 63d9163 / 2a48d14).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error('OAuth code exchange failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/`)
}
