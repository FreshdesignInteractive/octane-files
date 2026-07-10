import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'

const BUCKET = 'car-images'
const SLOTS = ['hero', 'gallery-1', 'gallery-2', 'gallery-3'] as const

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

// Pure JSON — the client has already resized (server-side, via
// /api/admin/models/[slug]/image) AND uploaded each file itself, directly
// from the browser to Supabase Storage. That split exists because a long
// investigation proved a Vercel-server-to-Supabase binary upload comes
// back corrupted while the identical browser-origin upload is
// byte-perfect (see lib/car-image-optimize.ts). This route's only job now
// is what a JSON body was always safe for: writing hero_image/
// gallery_images and cleaning up the images they replaced (a DELETE has
// no binary body, so it was never subject to the corruption above).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { slug: string; urls: Partial<Record<(typeof SLOTS)[number], string>> } = await req.json()
  const { slug, urls } = body
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  if (!urls || Object.keys(urls).length === 0) {
    return NextResponse.json({ error: 'No uploaded image URLs in the request' }, { status: 400 })
  }

  const { data: gen, error: genError } = await supabase
    .from('generations')
    .select('id, hero_image, gallery_images')
    .eq('slug', slug)
    .maybeSingle()
  if (genError) return NextResponse.json({ error: genError.message }, { status: 500 })
  if (!gen) return NextResponse.json({ error: `No car found with slug "${slug}"` }, { status: 404 })

  // Whatever slots were included become the new complete value for that
  // field — hero_image is replaced only if a hero URL was sent;
  // gallery_images is replaced (not merged/appended) only if at least one
  // gallery-N URL was sent. Same "only touch what's provided" rule as the
  // CSV enrichment importer, just applied at the whole-field level since a
  // photo folder is meant to be a complete set, not a partial patch.
  const updates: { hero_image?: string; gallery_images?: string[] } = {}
  const oldUrlsToDelete: string[] = []

  if (urls.hero) {
    updates.hero_image = urls.hero
    if (gen.hero_image) oldUrlsToDelete.push(gen.hero_image)
  }
  const galleryUrls = SLOTS.filter(s => s !== 'hero' && urls[s]).map(s => urls[s]!)
  if (galleryUrls.length > 0) {
    updates.gallery_images = galleryUrls
    for (const old of gen.gallery_images ?? []) oldUrlsToDelete.push(old)
  }

  const { error: updateError } = await supabase.from('generations').update(updates).eq('id', gen.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Best-effort cleanup of the images just replaced — the new images are
  // already live and correct at this point, so a delete failure here is
  // logged, never surfaced as a failure of the request itself.
  for (const url of oldUrlsToDelete) {
    const path = extractStoragePath(url)
    if (!path) continue
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) console.error('Failed to delete replaced car image from storage:', path, error.message)
  }

  return NextResponse.json({ slug, uploaded: Object.keys(urls) })
}
