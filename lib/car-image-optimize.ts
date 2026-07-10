// Server-only (imports sharp) — never import this from a 'use client'
// component. The single source of truth for the site's image spec: every
// car image, however it enters the system (manual upload, the bulk
// image-upload folder tool, or the per-car quick-attach flow), goes through
// this exact resize/format/quality, so there aren't three pipelines quietly
// producing different output.

import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'car-images'
const WIDTH = 900
const HEIGHT = 506
const QUALITY = 80

export async function optimizeAndUploadCarImage(
  supabase: SupabaseClient, slug: string, slot: string, file: File
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const optimized = await sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: QUALITY })
    .toBuffer()

  // A self-decode diagnostic (sharp re-reading its own output buffer,
  // immediately after encoding, before ever reaching Supabase) confirmed
  // sharp's encoding is fine — the corruption happened specifically during
  // the Storage upload. supabase-js special-cases Blob/FormData bodies but
  // falls through to a generic path for a raw Node Buffer, and that
  // generic path isn't reliably treated as pure binary by every fetch
  // implementation. Wrapping it in a real Blob puts it on the
  // well-supported path instead.
  const path = `${slug}/${slot}-${Date.now()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([optimized], { type: 'image/webp' }), {
    contentType: 'image/webp', upsert: false,
  })
  if (error) throw new Error(`${slot}: ${error.message}`)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return pub.publicUrl
}
