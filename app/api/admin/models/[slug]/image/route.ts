import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { resizeCarImage } from '@/lib/car-image-optimize'

// Resize-only — returns the optimized WebP bytes directly, does not touch
// Supabase Storage or the generations row. The client uploads the returned
// bytes itself (a browser-vs-server-origin test proved Storage uploads
// from Vercel's server come back corrupted; the identical upload from a
// browser is byte-perfect — see the comment in lib/car-image-optimize.ts)
// and does its own cleanup of the previously-saved image via the existing
// deleteCarImageIfOwned client helper, since it already has that URL in
// its in-memory form state. Still gated behind admin auth even though it
// only touches file bytes, not any database — no reason to open a resize
// endpoint to non-admins.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  void slug // not needed for a resize-only response; kept in the route shape for consistency with the rest of /api/admin/models/[slug]/*

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  try {
    const optimized = await resizeCarImage(file)
    return new NextResponse(new Uint8Array(optimized), {
      headers: { 'Content-Type': 'image/webp', 'Content-Length': String(optimized.length) },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
