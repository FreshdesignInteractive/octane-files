import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the session cookie on protected routes before the page/route
// itself runs. This matters specifically here, not on public pages: a Server
// Component can't persist a refreshed token back to a cookie (see
// lib/supabase-server.ts), so a direct/bookmarked visit to a protected route
// with an expired access token would refresh in-memory for that one request
// but never save it — and once Supabase rotates out the used refresh token,
// the next such visit fails outright. Middleware runs first and can actually
// write the refreshed Set-Cookie, closing that gap. Public pages never check
// auth server-side at all, so there's nothing there for this to refresh.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/garage/:path*'],
}
