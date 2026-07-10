'use client'

import { useState } from 'react'
import { parseCsvToRows, downloadCsv } from '@/lib/csv-parse'
import { buildTrimsTemplateCsv } from '@/lib/bulk-import-schema'

interface FieldError { field: string; header: string; value: string; reason: string }

type RowMatch =
  | { status: 'unmatched' }
  | { status: 'invalid'; errors: FieldError[] }
  | {
      status: 'matched'
      generation_id: string; slug: string; archived: boolean; would_update_existing: boolean
      name: string; years: string | null; description: string | null; production_notes: string | null
    }
  | { status: 'error'; message: string }

interface PreviewRow { row_index: number; make: string; model: string; generation: string; match: RowMatch }
interface PreviewResponse { unknownColumns: string[]; rows: PreviewRow[] }

export default function BulkImportTrims() {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [included, setIncluded] = useState<Record<number, boolean>>({})
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [msg, setMsg] = useState('')

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const { headers: h, rows: r } = parseCsvToRows(String(reader.result ?? ''))
      setHeaders(h)
      setRows(r)
      setPreview(null)
      setMsg('')
    }
    reader.readAsText(file)
  }

  async function runPreview() {
    setPreviewing(true)
    setMsg('')
    const res = await fetch('/api/admin/bulk-import/trims/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers, rows }),
    })
    setPreviewing(false)
    if (!res.ok) { setMsg('Preview failed'); return }
    const data: PreviewResponse = await res.json()
    setPreview(data)
    const initial: Record<number, boolean> = {}
    for (const r of data.rows) if (r.match.status === 'matched') initial[r.row_index] = true
    setIncluded(initial)
  }

  async function commit() {
    if (!preview) return
    const toCommit = preview.rows.filter(r => r.match.status === 'matched' && included[r.row_index])
    if (toCommit.length === 0) { setMsg('No rows selected'); return }

    setCommitting(true)
    setMsg('')
    const payload = toCommit.map(r => {
      const m = r.match as Extract<RowMatch, { status: 'matched' }>
      return { generation_id: m.generation_id, name: m.name, years: m.years, description: m.description, production_notes: m.production_notes }
    })
    const res = await fetch('/api/admin/bulk-import/trims/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: payload }),
    })
    setCommitting(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setMsg(err.error ?? 'Commit failed')
      return
    }
    const data = await res.json()
    setMsg(`Committed ✓ — ${data.upserted.length} trims upserted`)
    setPreview(null)
    setRows([])
    setHeaders([])
  }

  const matched = preview?.rows.filter(r => r.match.status === 'matched') ?? []
  const unmatched = preview?.rows.filter(r => r.match.status === 'unmatched') ?? []
  const invalid = preview?.rows.filter(r => r.match.status === 'invalid') ?? []
  const errored = preview?.rows.filter(r => r.match.status === 'error') ?? []
  const includedCount = matched.filter(r => included[r.row_index]).length

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => downloadCsv('octane-files-trims-template.csv', buildTrimsTemplateCsv())}
        className="text-xs text-text-tertiary underline self-start bg-transparent border-none cursor-pointer p-0"
      >
        ↓ Download starter CSV template
      </button>
      <div className="flex items-center gap-3">
        <input
          type="file" accept=".csv"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          className="text-body"
        />
        {rows.length > 0 && (
          <button type="button" onClick={runPreview} disabled={previewing} className="btn-primary h-9 px-4">
            {previewing ? 'Checking...' : `Preview ${rows.length} rows`}
          </button>
        )}
      </div>

      {preview && (
        <div className="flex flex-col gap-5">
          {preview.unknownColumns.length > 0 && (
            <div className="p-3 rounded-lg border border-border-mid bg-bg-elevated text-body text-text-secondary">
              Unknown columns (ignored): {preview.unknownColumns.map(c => `"${c}"`).join(', ')}
            </div>
          )}

          <div className="text-body text-text-secondary">
            {matched.length} matched · {unmatched.length} unmatched (skipped) · {invalid.length} invalid (skipped)
            {errored.length > 0 && ` · ${errored.length} errored (skipped)`}
          </div>

          {matched.length > 0 && (
            <div>
              <h3 className="text-body font-bold text-text-primary mb-3">Would UPSERT ({matched.length})</h3>
              <div className="flex flex-col gap-3">
                {matched.map(r => {
                  const m = r.match as Extract<RowMatch, { status: 'matched' }>
                  return (
                    <div key={r.row_index} className="p-3 rounded-lg border border-border flex gap-3">
                      <input
                        type="checkbox" checked={!!included[r.row_index]}
                        onChange={e => setIncluded(i => ({ ...i, [r.row_index]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-body font-medium text-text-primary">
                          {r.make} {r.model} {r.generation} — {m.name}
                          {m.archived && <span className="pill ml-2">Archived</span>}
                          {m.would_update_existing && <span className="pill ml-2">Already exists — will update</span>}
                        </div>
                        <div className="text-label text-text-secondary mt-1">
                          {m.years && <span>{m.years} · </span>}
                          {m.description ?? '—'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {unmatched.length > 0 && (
            <div>
              <h3 className="text-body font-bold text-text-primary mb-3">Unmatched ({unmatched.length}) — will NOT be created</h3>
              <div className="flex flex-col gap-1">
                {unmatched.map(r => (
                  <div key={r.row_index} className="text-label text-text-secondary">
                    {r.make} &quot;{r.model}&quot; &quot;{r.generation}&quot; — no matching car in catalog
                  </div>
                ))}
              </div>
            </div>
          )}

          {invalid.length > 0 && (
            <div>
              <h3 className="text-body font-bold text-error mb-3">Invalid ({invalid.length}) — will NOT be imported, fix and re-upload</h3>
              <div className="flex flex-col gap-2">
                {invalid.map(r => {
                  const m = r.match as Extract<RowMatch, { status: 'invalid' }>
                  return (
                    <div key={r.row_index} className="text-label text-text-secondary">
                      {r.make} {r.model} {r.generation}:
                      {m.errors.map((e, i) => <div key={i} className="ml-3">{e.header}: {e.reason}</div>)}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {errored.length > 0 && (
            <div>
              <h3 className="text-body font-bold text-error mb-3">Errored ({errored.length}) — unexpected problem, not a validation issue</h3>
              <div className="flex flex-col gap-1">
                {errored.map(r => {
                  const m = r.match as Extract<RowMatch, { status: 'error' }>
                  return (
                    <div key={r.row_index} className="text-label text-text-secondary">
                      {r.make} {r.model} {r.generation}: {m.message}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={commit} disabled={committing || includedCount === 0} className="btn-primary h-10 px-6 disabled:opacity-60">
              {committing ? 'Committing...' : `Commit ${includedCount} trims`}
            </button>
            {msg && <span className={`text-body ${msg.includes('failed') || msg.includes('error') ? 'text-error' : 'text-success'}`}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
