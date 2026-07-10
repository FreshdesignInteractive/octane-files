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

  // Re-verifying this under the SAME run as everything else below, not
  // trusting the earlier isolated result: does sharp, in this Vercel
  // function, successfully re-decode the exact buffer it just produced?
  // Every upload-path variant tried so far (storage-js + Next fetch,
  // storage-js + undici fetch, raw POST + undici, no client library at
  // all) has produced byte-identical corruption — suspicious enough that
  // the earlier "sharp's output is fine" conclusion deserves re-checking
  // in this exact context rather than taken on faith from a prior deploy.
  let selfDecodeResult: string
  try {
    const stats = await sharp(optimized).stats()
    selfDecodeResult = `OK (channels=${stats.channels.length})`
  } catch (err) {
    selfDecodeResult = `FAILED: ${err instanceof Error ? err.message : String(err)}`
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error(`${slot}: [TEST] no session on the caller's client — can't build an authenticated one-off client`)

  // Confirmed isPlainObject(Buffer) === false directly (not just by reading
  // the source), so @supabase/storage-js's own JSON.stringify branch never
  // touches our buffer — that hypothesis is dead. Both Next's ambient fetch
  // AND raw undici's fetch produced the identical corruption signature on
  // the same Buffer body, which is suspicious on its own: Node's built-in
  // fetch is itself built on an internal undici, so "swap the fetch
  // implementation" may not have changed the actual wire-serialization
  // engine at all. This bypasses @supabase/storage-js ENTIRELY — no
  // client library in the path — hand-building the raw HTTP POST with
  // undici directly, so a corrupt result here points at Supabase's
  // Storage API / Cloudflare edge, not at any client-side code.
  const path = `${slug}/${slot}-${Date.now()}.webp`
  const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`
  const uploadRes = await undiciFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Content-Type': 'image/webp',
      'x-upsert': 'false',
      'cache-control': 'max-age=3600',
    },
    body: optimized,
  })
  if (!uploadRes.ok) {
    const bodyText = await uploadRes.text().catch(() => '<unreadable>')
    throw new Error(`${slot}: [TEST] raw POST upload failed: HTTP ${uploadRes.status} — ${bodyText.slice(0, 300)}`)
  }

  const testClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: pub } = testClient.storage.from(BUCKET).getPublicUrl(path)

  function headerSummary(res: Awaited<ReturnType<typeof undiciFetch>>): string {
    const h = res.headers
    return `cf-cache-status=${h.get('cf-cache-status')} content-length=${h.get('content-length')} ` +
      `content-encoding=${h.get('content-encoding') ?? 'none'} transfer-encoding=${h.get('transfer-encoding') ?? 'none'} ` +
      `etag=${h.get('etag')} last-modified=${h.get('last-modified')}`
  }

  // Read #1: immediately, via undici (not Next's fetch), hashed against the
  // buffer sharp actually produced in this same run.
  const res1 = await undiciFetch(pub.publicUrl, { cache: 'no-store' })
  const buf1 = Buffer.from(await res1.arrayBuffer())
  const hashOriginal = createHash('sha256').update(optimized).digest('hex')
  const hash1 = createHash('sha256').update(buf1).digest('hex')

  // Read #2: independent request, ~2.5s later, also forcing no-store — a
  // "correct then corrupts" pattern here would point at Supabase's CDN/
  // edge/replication layer, not upload code; a match here but corruption
  // reported elsewhere (browser, curl, Supabase dashboard) would point at
  // something specific to how THOSE clients request the file instead.
  await new Promise(resolve => setTimeout(resolve, 2500))
  const res2 = await undiciFetch(pub.publicUrl, { cache: 'no-store' })
  const buf2 = Buffer.from(await res2.arrayBuffer())
  const hash2 = createHash('sha256').update(buf2).digest('hex')

  function divergePoint(a: Buffer, b: Buffer): string {
    const minLen = Math.min(a.length, b.length)
    for (let i = 0; i < minLen; i++) if (a[i] !== b[i]) return String(i)
    return a.length === b.length ? 'identical' : 'identical up to shorter length'
  }

  // Always report in full, whether everything matched or not — this phase
  // is about visibility, not about silently succeeding.
  throw new Error(
    `${slot}: [TEST] selfDecode=${selfDecodeResult} | ` +
    `upload=${optimized.length}b/${hashOriginal.slice(0, 12)} | ` +
    `read#1(+0s)=${buf1.length}b/${hash1.slice(0, 12)} [${headerSummary(res1)}] | ` +
    `read#2(+2.5s)=${buf2.length}b/${hash2.slice(0, 12)} [${headerSummary(res2)}] | ` +
    `upload==read#1: ${hashOriginal === hash1} (diverge@${divergePoint(optimized, buf1)}) | ` +
    `read#1==read#2: ${hash1 === hash2} (diverge@${divergePoint(buf1, buf2)}) | ` +
    `url=${pub.publicUrl}`
  )
}
