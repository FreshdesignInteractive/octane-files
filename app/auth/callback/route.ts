import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const siteUrl = 'https://www.octanefiles.com'

  // DEBUG: dump the exact URL this handler receives
  return NextResponse.redirect(
    `${siteUrl}/login?debug_url=${encodeURIComponent(request.url)}&debug_code=${code ? 'PRESENT' : 'MISSING'}`
  )
}
