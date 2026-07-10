import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { optimizeAndUploadCarImage } from '@/lib/car-image-optimize'

const VALID_SLOTS = ['hero', 'gallery-1', 'gallery-2', 'gallery-3']
const BUCKET = 'car-images'

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

// Resizes/uploads ONE image and returns its URL — does not write
// hero_image/gallery_images itself (the client merges the URL into its
// in-memory form state, same as "Ask AI to fill", and the existing Save
// button is what commits it). It DOES delete whatever was previously saved
// for this exact slot, best-effort, right here — that doesn't need to wait
// for Save, since it only needs to read the row's *current* saved value,
// not write a new one. Without this, re-uploading a car's photos (a normal
// thing to do while dialing in the Quick Import workflow) orphaned a full
// duplicate image set in storage every time instead of replacing it.
// Gallery position 0/1/2 is treated as gallery-1/2/3 by convention — matches
// how this endpoint and the bulk image-upload tool both write the array.
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
  const { data: gen } = await supabase
    .from('generations')
    .select('id, hero_image, gallery_images')
    .eq('slug', slug)
    .maybeSingle()
  if (!gen) return NextResponse.json({ error: 'Car not found' }, { status: 404 })

  const form = await req.formData()
  const slot = String(form.get('slot') ?? '')
  const file = form.get('file')
  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: `Invalid slot "${slot}" — expected one of ${VALID_SLOTS.join(', ')}` }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  let url: string
  try {
    url = await optimizeAndUploadCarImage(supabase, slug, slot, file)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }

  const oldUrl = slot === 'hero'
    ? gen.hero_image
    : (gen.gallery_images ?? [])[Number(slot.split('-')[1]) - 1]
  if (oldUrl) {
    const path = extractStoragePath(oldUrl)
    if (path) {
      const { error } = await supabase.storage.from(BUCKET).remove([path])
      if (error) console.error('Failed to delete replaced car image:', path, error.message)
    }
  }

  return NextResponse.json({ slot, url })
}
