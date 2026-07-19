'use client'

import { useState } from 'react'
import { parseCsvToRows, downloadCsv } from '@/lib/csv-parse'
import { buildEnrichmentTemplateCsv, buildEnrichmentCatalogCsv, type EnrichmentFieldKey } from '@/lib/bulk-import-schema'
import { buildRelationInserts, type EnrichmentValue } from '@/lib/bulk-import'

interface FieldDiff { field: string; header: string; from: unknown; to: unknown }
interface FieldError { field: string; header: string; value: string; reason: string }

type RowMatch =
  | { status: 'unmatched' }
  | { status: 'invalid'; generation_id?: string; slug?: string; errors: FieldError[] }
  | { status: 'matched'; generation_id: string; slug: string; archived: boolean; fields: Record<string, unknown>; diffs: FieldDiff[] }
  | { status: 'error'; message: string }

interface PreviewRow { row_index: number; make: string; model: string; generation: string; match: RowMatch }
interface PreviewResponse { unknownColumns: string[]; rows: PreviewRow[] }

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export default function BulkImportEnrichment() {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [included, setIncluded] = useState<Record<number, boolean>>({})
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [downloadingCatalog, setDownloadingCatalog] = useState(false)

  // Pre-filled with every real car's Make/Model/Generation so whoever fills
  // the file in (including another AI with no database access) never has
  // to invent an identity — an invented one just silently shows up as
  // "Unmatched" in preview instead of failing loudly.
  async function downloadCatalogTemplate() {
    setDownloadingCatalog(true)
    const res = await fetch('/api/models?limit=500')
    const { data } = await res.json()
    downloadCsv('octane-files-enrichment-all-cars.csv', buildEnrichmentCatalogCsv(data ?? []))
    setDownloadingCatalog(false)
  }

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
    const res = await fetch('/api/admin/bulk-import/enrichment/preview', {
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
      return { generation_id: m.generation_id, ...m.fields }
    })
    // Rivals/lineage don't land via bulk_update_generation_enrichment (they
    // aren't generations columns) — flattened separately into their own
    // car_relations insert list, one entry per rival/lineage value.
    const relations = toCommit.flatMap(r => {
      const m = r.match as Extract<RowMatch, { status: 'matched' }>
      return buildRelationInserts(m.generation_id, m.fields as Partial<Record<EnrichmentFieldKey, EnrichmentValue>>)
    })
    const res = await fetch('/api/admin/bulk-import/enrichment/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: payload, relations }),
    })
    setCommitting(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setMsg(err.error ?? 'Commit failed')
      return
    }
    const data = await res.json()
    setMsg(`Committed ✓ — ${data.updated} rows updated${data.relationsAdded ? `, ${data.relationsAdded} rivals/lineage entries added` : ''}`)
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
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => downloadCsv('octane-files-enrichment-template.csv', buildEnrichmentTemplateCsv())}
          className="text-xs text-text-tertiary underline self-start bg-transparent border-none cursor-pointer p-0"
        >
          ↓ Download starter CSV template
        </button>
        <button
          type="button"
          onClick={downloadCatalogTemplate}
          disabled={downloadingCatalog}
          className="text-xs text-text-tertiary underline self-start bg-transparent border-none cursor-pointer p-0 disabled:opacity-60"
        >
          {downloadingCatalog ? 'Loading…' : '↓ Download all cars (for mass enrichment)'}
        </button>
      </div>
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
              <h3 className="text-body font-bold text-text-primary mb-3">Would UPDATE ({matched.length})</h3>
              <div className="flex flex-col gap-3">
                {matched.map(r => {
                  const m = r.match as Extract<RowMatch, { status: 'matched' }>
                  const relations = buildRelationInserts(m.generation_id, m.fields as Partial<Record<EnrichmentFieldKey, EnrichmentValue>>)
                  const manufacturerFullName = m.fields.manufacturer_full_name as string | undefined
                  return (
                    <div key={r.row_index} className="p-3 rounded-lg border border-border flex gap-3">
                      <input
                        type="checkbox" checked={!!included[r.row_index]}
                        onChange={e => setIncluded(i => ({ ...i, [r.row_index]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-body font-medium text-text-primary">
                          {r.make} {r.model} {r.generation}
                          {m.archived && <span className="pill ml-2">Archived</span>}
                        </div>
                        {m.diffs.length === 0 && relations.length === 0 && !manufacturerFullName ? (
                          <p className="text-label text-text-tertiary mt-1">No changes (values match what&apos;s already saved)</p>
                        ) : (
                          <div className="mt-2 flex flex-col gap-1">
                            {m.diffs.map(d => (
                              <div key={d.field} className="text-label text-text-secondary">
                                <span className="font-medium">{d.header}:</span> {formatValue(d.from)} → <span className="text-accent font-medium">{formatValue(d.to)}</span>
                              </div>
                            ))}
                            {relations.length > 0 && (
                              <div className="text-label text-text-secondary">
                                <span className="font-medium">Rivals/Lineage:</span> +{relations.length} entr{relations.length === 1 ? 'y' : 'ies'} <span className="text-accent font-medium">{relations.map(rel => rel.label_text).join(', ')}</span> (already-existing entries are skipped automatically)
                              </div>
                            )}
                            {manufacturerFullName && (
                              <div className="text-label text-text-secondary">
                                <span className="font-medium">ManufacturerFullName:</span> sets the make&apos;s full name to <span className="text-accent font-medium">{manufacturerFullName}</span> (no before/after shown — applies to the make, not this car, and may affect other generations from the same manufacturer)
                              </div>
                            )}
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
              {committing ? 'Committing...' : `Commit ${includedCount} updates`}
            </button>
            {msg && <span className={`text-body ${msg.includes('failed') || msg.includes('error') ? 'text-error' : 'text-success'}`}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
