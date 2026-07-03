import { NextResponse, type NextRequest } from 'next/server'

// Middleware is a no-op for now — auth is handled client-side via localStorage.
// Protected routes (/garage, /admin) redirect unauthenticated users via page-level checks.
export function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: [],
}
