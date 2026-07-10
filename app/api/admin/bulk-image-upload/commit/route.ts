import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { optimizeAndUploadCarImage } from '@/lib/car-image-optimize'

const BUCKET = 'car-images'
const SLOTS = ['hero', 'gallery-1', 'gallery-2', 'gallery-3'] as const

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

// One car per request (the bulk-image-upload UI loops over matched cars and
// calls this once each) — keeps every request small (a handful of source
// photos, not hundreds) and lets the client show real per-car progress.
// Resizes/re-encodes every image to the same 900x506 WebP spec used
// everywhere on the site (hero, gallery thumbnails, and the lightbox all
// share this one size — see imports/CSV_TEMPLATE_GUIDE.md's sibling
// discussion for why). Runs through the signed-in admin's own session, same
// RLS/is_admin() gate as every other admin write — no service-role bypass.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const slug = String(form.get('slug') ?? '')
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const { data: gen, error: genError } = await supabase
    .from('generations')
    .select('id, hero_image, gallery_images')
    .eq('slug', slug)
    .maybeSingle()
  if (genError) return NextResponse.json({ error: genError.message }, { status: 500 })
  if (!gen) return NextResponse.json({ error: `No car found with slug "${slug}"` }, { status: 404 })

  const uploaded: Partial<Record<(typeof SLOTS)[number], string>> = {}
  for (const slot of SLOTS) {
    const file = form.get(slot)
    if (!(file instanceof File)) continue

    try {
      uploaded[slot] = await optimizeAndUploadCarImage(supabase, slug, slot, file)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
    }
  }

  if (Object.keys(uploaded).length === 0) {
    return NextResponse.json({ error: 'No recognized image files in the upload (expected hero, gallery-1, gallery-2, gallery-3)' }, { status: 400 })
  }

  // Whatever slots were included in THIS upload become the new complete
  // value for that field — hero_image is replaced only if a hero file was
  // sent; gallery_images is replaced (not merged/appended) only if at least
  // one gallery-N file was sent. A slot absent from the folder leaves that
  // field untouched — same "only touch what's provided" rule as the CSV
  // enrichment importer, just applied at the whole-field level since a
  // photo folder is meant to be a complete set, not a partial patch.
  const updates: { hero_image?: string; gallery_images?: string[] } = {}
  const oldUrlsToDelete: string[] = []

  if (uploaded.hero) {
    updates.hero_image = uploaded.hero
    if (gen.hero_image) oldUrlsToDelete.push(gen.hero_image)
  }
  const galleryUrls = SLOTS.filter(s => s !== 'hero' && uploaded[s]).map(s => uploaded[s]!)
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

  return NextResponse.json({ slug, uploaded: Object.keys(uploaded) })
}
