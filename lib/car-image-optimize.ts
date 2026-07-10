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

  // Temporary diagnostic: force a full decode of sharp's own output, right
  // here, before it ever reaches Supabase. A production upload came back
  // corrupt (valid RIFF/WebP header, undecodable body) even after
  // externalizing sharp from the Turbopack bundle — this pinpoints whether
  // the corruption happens during sharp's own encode (this throws) or
  // afterward, e.g. during the Storage upload (this passes, but the stored
  // file is still bad). Remove once the real cause is found.
  try {
    await sharp(optimized).stats()
  } catch (err) {
    throw new Error(`${slot}: sharp produced undecodable output for its own image (${optimized.length} bytes) — corruption is happening during encoding: ${err instanceof Error ? err.message : String(err)}`)
  }

  const path = `${slug}/${slot}-${Date.now()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, optimized, {
    contentType: 'image/webp', upsert: false,
  })
  if (error) throw new Error(`${slot}: ${error.message}`)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return pub.publicUrl
}
