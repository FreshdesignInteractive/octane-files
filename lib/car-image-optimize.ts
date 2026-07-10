// Server-only (imports sharp) — never import this from a 'use client'
// component. The single source of truth for the site's image spec: every
// car image, however it enters the system (manual upload, the bulk
// image-upload folder tool, or the per-car quick-attach flow), goes through
// this exact resize/format/quality, so there aren't three pipelines quietly
// producing different output.
//
// Resize-only — does NOT upload. A long investigation (self-decode checks,
// swapping fetch implementations, bypassing @supabase/storage-js entirely,
// a byte-for-byte browser-vs-server comparison) proved sharp's output is
// always valid, but any binary body sent from Vercel's serverless
// environment to Supabase Storage came back corrupted (a consistent ~1.8x
// size expansion matching UTF-8 replacement-character mangling) — while
// the identical upload from a browser was byte-perfect. Text/JSON bodies
// (every other server-to-Supabase call in this app) are unaffected since a
// spurious UTF-8 re-encode is a no-op on data that's already valid UTF-8.
// So: resize happens here (server-side, needs Node for sharp), but the
// actual Storage upload happens client-side instead — see
// components/AdminModelForm.tsx / BulkImageUpload.tsx.

import sharp from 'sharp'

const WIDTH = 900
const HEIGHT = 506
const QUALITY = 80

export async function resizeCarImage(file: File): Promise<Buffer> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: QUALITY })
    .toBuffer()
}
