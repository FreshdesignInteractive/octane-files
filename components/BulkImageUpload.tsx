'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const VALID_SLOTS = ['hero', 'gallery-1', 'gallery-2', 'gallery-3'] as const
type Slot = (typeof VALID_SLOTS)[number]

interface CarGroup {
  slug: string
  files: Partial<Record<Slot, File>>
  unrecognized: string[]
}

type MatchStatus =
  | { status: 'matched'; archived: boolean }
  | { status: 'unmatched' }

interface PreviewRow {
  group: CarGroup
  match: MatchStatus
}

interface CommitResult {
  slug: string
  ok: boolean
  message: string
}

// Folder name = car slug (e.g. image-drops/dodge-charger-2nd-gen/hero.jpg),
// filename (minus extension) = which slot it fills. Matching is a plain
// read against the live catalog — no admin session needed for that part,
// same as any other client-side car lookup in this app (CarAutocomplete,
// DesignerAutocomplete). The actual write only happens per-car, on Commit,
// through the authenticated /api/admin/bulk-image-upload/commit route.
function parseRelativePath(path: string): { slug: string; filename: string } | null {
  const parts = path.split('/')
  if (parts.length < 2) return null
  return { slug: parts[parts.length - 2], filename: parts[parts.length - 1] }
}

export default function BulkImageUpload() {
  const [groups, setGroups] = useState<CarGroup[]>([])
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [included, setIncluded] = useState<Record<string, boolean>>({})
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState<CommitResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // webkitdirectory has no JSX/React prop — it has to be set imperatively on
  // the DOM node, and must be set before the picker opens (not in onChange,
  // which fires after a folder is already selected).
  useEffect(() => {
    if (inputRef.current) (inputRef.current as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true
  }, [])

  function handleFiles(fileList: FileList) {
    const bySlug = new Map<string, CarGroup>()
    for (const file of Array.from(fileList)) {
      const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const parsed = parseRelativePath(relPath)
      if (!parsed) continue
      const slot = parsed.filename.replace(/\.[^.]+$/, '').toLowerCase()

      let group = bySlug.get(parsed.slug)
      if (!group) { group = { slug: parsed.slug, files: {}, unrecognized: [] }; bySlug.set(parsed.slug, group) }

      if ((VALID_SLOTS as readonly string[]).includes(slot)) group.files[slot as Slot] = file
      else group.unrecognized.push(parsed.filename)
    }
    setGroups(Array.from(bySlug.values()))
    setPreview(null)
    setResults([])
  }

  async function runPreview() {
    setPreviewing(true)
    const supabase = createClient()
    const slugs = groups.map(g => g.slug)
    const { data } = await supabase.from('generations').select('slug, archived_at').in('slug', slugs)
    const matches = (data ?? []) as { slug: string; archived_at: string | null }[]
    const bySlug = new Map(matches.map(r => [r.slug, r.archived_at]))

    const rows: PreviewRow[] = groups.map(group => {
      if (!bySlug.has(group.slug)) return { group, match: { status: 'unmatched' } }
      return { group, match: { status: 'matched', archived: bySlug.get(group.slug) !== null } }
    })
    setPreview(rows)
    const initial: Record<string, boolean> = {}
    for (const r of rows) if (r.match.status === 'matched') initial[r.group.slug] = true
    setIncluded(initial)
    setPreviewing(false)
  }

  // Server resizes only (sharp needs Node) and hands the bytes back — the
  // actual Storage upload happens here, client-side. A Vercel-server-to-
  // Supabase upload of binary data was proven to come back corrupted,
  // while the identical upload from a browser is byte-perfect, so every
  // write has to originate from the browser now — the commit route only
  // gets the already-uploaded URLs and writes them to the DB (plain JSON,
  // never subject to that corruption).
  async function commit() {
    if (!preview) return
    const toCommit = preview.filter(r => r.match.status === 'matched' && included[r.group.slug])
    if (toCommit.length === 0) return

    setCommitting(true)
    setProgress({ done: 0, total: toCommit.length })
    const out: CommitResult[] = []
    const browserSupabase = createClient()

    for (const row of toCommit) {
      try {
        const urls: Partial<Record<Slot, string>> = {}
        for (const slot of VALID_SLOTS) {
          const file = row.group.files[slot]
          if (!file) continue

          const fd = new FormData()
          fd.append('file', file)
          const resizeRes = await fetch(`/api/admin/models/${row.group.slug}/image`, { method: 'POST', body: fd })
          if (!resizeRes.ok) {
            const err = await resizeRes.json().catch(() => ({}))
            throw new Error(`${slot}: ${err.error ?? 'resize failed'}`)
          }
          const optimizedBlob = await resizeRes.blob()

          const path = `${row.group.slug}/${slot}-${Date.now()}.webp`
          const { error: uploadError } = await browserSupabase.storage.from('car-images').upload(path, optimizedBlob, {
            contentType: 'image/webp', upsert: false,
          })
          if (uploadError) throw new Error(`${slot}: ${uploadError.message}`)

          const { data: pub } = browserSupabase.storage.from('car-images').getPublicUrl(path)
          urls[slot] = pub.publicUrl
        }

        const res = await fetch('/api/admin/bulk-image-upload/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: row.group.slug, urls }),
        })
        const data = await res.json().catch(() => ({}))
        out.push({ slug: row.group.slug, ok: res.ok, message: res.ok ? `${data.uploaded.length} image(s) attached` : (data.error ?? 'Failed') })
      } catch (err) {
        out.push({ slug: row.group.slug, ok: false, message: err instanceof Error ? err.message : String(err) })
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
      setResults([...out])
    }

    setCommitting(false)
  }

  const matched = preview?.filter(r => r.match.status === 'matched') ?? []
  const unmatched = preview?.filter(r => r.match.status === 'unmatched') ?? []
  const includedCount = matched.filter(r => included[r.group.slug]).length
  const succeeded = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-label text-text-tertiary mb-3">
          Select the top-level folder containing your per-car subfolders
          (e.g. <code>image-drops/dodge-charger-2nd-gen/hero.jpg</code>). Files
          named <code>hero</code>, <code>gallery-1</code>, <code>gallery-2</code>,
          or <code>gallery-3</code> (any image extension) are recognized;
          anything else in a folder is flagged and skipped.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="text-body"
          onChange={e => { if (e.target.files) handleFiles(e.target.files) }}
        />
      </div>

      {groups.length > 0 && !preview && (
        <button type="button" onClick={runPreview} disabled={previewing} className="btn-primary h-9 px-4 self-start">
          {previewing ? 'Checking...' : `Preview ${groups.length} folder(s)`}
        </button>
      )}

      {preview && (
        <div className="flex flex-col gap-5">
          <div className="text-body text-text-secondary">
            {matched.length} matched · {unmatched.length} unmatched (no such car — will NOT be created)
          </div>

          {matched.length > 0 && (
            <div>
              <h3 className="text-body font-bold text-text-primary mb-3">Would attach ({matched.length})</h3>
              <div className="flex flex-col gap-2">
                {matched.map(r => {
                  const slotsFound = VALID_SLOTS.filter(s => r.group.files[s])
                  return (
                    <div key={r.group.slug} className="p-3 rounded-lg border border-border flex gap-3">
                      <input
                        type="checkbox" checked={!!included[r.group.slug]}
                        onChange={e => setIncluded(i => ({ ...i, [r.group.slug]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-body font-medium text-text-primary">
                          {r.group.slug}
                          {r.match.status === 'matched' && r.match.archived && <span className="pill ml-2">Archived</span>}
                        </div>
                        <div className="text-label text-text-secondary mt-1">
                          {slotsFound.join(', ')}
                          {!slotsFound.includes('hero') && <span className="text-error"> — no hero image found</span>}
                        </div>
                        {r.group.unrecognized.length > 0 && (
                          <div className="text-label text-text-tertiary mt-1">
                            Ignored (unrecognized filename): {r.group.unrecognized.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {unmatched.length > 0 && (
            <div>
              <h3 className="text-body font-bold text-text-primary mb-3">Unmatched ({unmatched.length})</h3>
              <div className="flex flex-col gap-1">
                {unmatched.map(r => (
                  <div key={r.group.slug} className="text-label text-text-secondary">
                    &quot;{r.group.slug}&quot; — no car with this slug in the catalog
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={commit} disabled={committing || includedCount === 0} className="btn-primary h-10 px-6 disabled:opacity-60">
              {committing ? `Uploading ${progress.done}/${progress.total}...` : `Attach ${includedCount} car(s)`}
            </button>
            {results.length > 0 && (
              <span className="text-body text-text-secondary">
                {succeeded} succeeded{failed > 0 && `, ${failed} failed`}
              </span>
            )}
          </div>

          {results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map(r => (
                <div key={r.slug} className={`text-label ${r.ok ? 'text-text-secondary' : 'text-error'}`}>
                  {r.ok ? '✓' : '✗'} {r.slug}: {r.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
