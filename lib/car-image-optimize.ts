// Server-only (imports sharp) — never import this from a 'use client'
// component. The single source of truth for the site's image spec: every
// car image, however it enters the system (manual upload, the bulk
// image-upload folder tool, or the per-car quick-attach flow), goes through
// this exact resize/format/quality, so there aren't three pipelines quietly
// producing different output.

import sharp from 'sharp'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetch as undiciFetch } from 'undici'
import { createHash } from 'crypto'

const BUCKET = 'car-images'
const WIDTH = 900
const HEIGHT = 506
const QUALITY = 80

function hex(buf: Buffer, start: number, len: number): string {
  return buf.subarray(Math.max(0, start), Math.max(0, start) + len).toString('hex')
}

// TEMPORARY TEST — not the permanent shape. Isolating one variable: does
// bypassing Next's ambient global fetch (via an explicit undici fetch on a
// one-off Supabase client) produce a byte-identical upload? A self-decode
// diagnostic already proved sharp's own output is valid; a hexdump of the
// previously-corrupted stored files showed EF BF BD (UTF-8 replacement
// character) bytes scattered through the body, including inside the RIFF
// header — the signature of binary data being decoded as UTF-8 text and
// lossily re-encoded somewhere. supabase-js falls back to the ambient
// global fetch when none is passed explicitly, and nothing in this
// codebase ever passes one — Next patches global fetch for its Data Cache,
// a plausible place for exactly this kind of body mangling.
export async function optimizeAndUploadCarImage(
  supabase: SupabaseClient, slug: string, slot: string, file: File
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const optimized = await sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: QUALITY })
    .toBuffer()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error(`${slot}: [TEST] no session on the caller's client — can't build an authenticated one-off client`)

  const testClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: undiciFetch as unknown as typeof fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  await testClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })

  const path = `${slug}/${slot}-${Date.now()}.webp`
  const { error } = await testClient.storage.from(BUCKET).upload(path, new Blob([optimized], { type: 'image/webp' }), {
    contentType: 'image/webp', upsert: false,
  })
  if (error) throw new Error(`${slot}: [TEST] upload failed: ${error.message}`)

  const { data: pub } = testClient.storage.from(BUCKET).getPublicUrl(path)

  // Download it straight back (via undici, not Next's fetch, to keep the
  // download side out of this specific experiment) and hash-compare
  // against the buffer sharp actually produced in this same run.
  const verifyRes = await undiciFetch(pub.publicUrl)
  const verifyBuf = Buffer.from(await verifyRes.arrayBuffer())
  const hashOriginal = createHash('sha256').update(optimized).digest('hex')
  const hashDownloaded = createHash('sha256').update(verifyBuf).digest('hex')

  if (hashOriginal !== hashDownloaded) {
    let divergeAt = -1
    const minLen = Math.min(optimized.length, verifyBuf.length)
    for (let i = 0; i < minLen; i++) {
      if (optimized[i] !== verifyBuf[i]) { divergeAt = i; break }
    }
    throw new Error(
      `${slot}: [TEST] HASH MISMATCH even with undici fetch — ` +
      `original ${optimized.length}b (sha256 ${hashOriginal.slice(0, 12)}...), ` +
      `downloaded ${verifyBuf.length}b (sha256 ${hashDownloaded.slice(0, 12)}...), ` +
      `diverges at byte offset ${divergeAt === -1 ? 'n/a (same up to shorter length)' : divergeAt}. ` +
      `downloaded first32=${hex(verifyBuf, 0, 32)} last32=${hex(verifyBuf, verifyBuf.length - 32, 32)}. ` +
      `original first32=${hex(optimized, 0, 32)} last32=${hex(optimized, optimized.length - 32, 32)}.`
    )
  }

  // Hashes matched — this is a real, correct upload, not just a test.
  return pub.publicUrl
}
