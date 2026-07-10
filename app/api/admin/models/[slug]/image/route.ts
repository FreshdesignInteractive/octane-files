import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { resolveGenerationId } from '@/lib/admin-child-rows'
import { optimizeAndUploadCarImage } from '@/lib/car-image-optimize'

const VALID_SLOTS = ['hero', 'gallery-1', 'gallery-2', 'gallery-3']

// Resizes/uploads ONE image and returns its URL — does not touch the
// generations row. Used by the per-car edit page's quick-attach flow: the
// client merges the returned URL into its in-memory form state (same as
// the "Ask AI to fill" button), and the existing Save button is what
// actually commits hero_image/gallery_images, same as every other field on
// this form. Keeps this endpoint's blast radius to "upload a file,"
// nothing more.
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
  const generationId = await resolveGenerationId(supabase, slug)
  if (!generationId) return NextResponse.json({ error: 'Car not found' }, { status: 404 })

  const form = await req.formData()
  const slot = String(form.get('slot') ?? '')
  const file = form.get('file')
  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: `Invalid slot "${slot}" — expected one of ${VALID_SLOTS.join(', ')}` }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  try {
    const url = await optimizeAndUploadCarImage(supabase, slug, slot, file)
    return NextResponse.json({ slot, url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
