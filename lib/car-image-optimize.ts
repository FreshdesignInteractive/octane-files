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

  // Raw Buffer body, on purpose — matches the exact original code path
  // that first produced the UTF-8-replacement corruption, so this isolates
  // ONE variable (the fetch implementation) against that known-bad
  // baseline. (An earlier version of this test switched to a Blob body at
  // the same time as switching to undici's fetch — that combination hit a
  // different bug: @supabase/storage-js's Blob branch builds a FormData
  // and never applies the `contentType` option at all, relying solely on
  // the Blob's own .type surviving undici's multipart encoding, which it
  // didn't — a mechanical problem with that test, not new evidence about
  // the actual corruption. The Buffer branch below is the one that
  // genuinely applies `contentType` as a header.)
  const path = `${slug}/${slot}-${Date.now()}.webp`
  const { error } = await testClient.storage.from(BUCKET).upload(path, optimized, {
    contentType: 'image/webp', upsert: false,
  })
  if (error) throw new Error(`${slot}: [TEST] upload failed: ${error.message}`)

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
    `${slot}: [TEST] upload=${optimized.length}b/${hashOriginal.slice(0, 12)} | ` +
    `read#1(+0s)=${buf1.length}b/${hash1.slice(0, 12)} [${headerSummary(res1)}] | ` +
    `read#2(+2.5s)=${buf2.length}b/${hash2.slice(0, 12)} [${headerSummary(res2)}] | ` +
    `upload==read#1: ${hashOriginal === hash1} (diverge@${divergePoint(optimized, buf1)}) | ` +
    `read#1==read#2: ${hash1 === hash2} (diverge@${divergePoint(buf1, buf2)}) | ` +
    `url=${pub.publicUrl}`
  )
}
