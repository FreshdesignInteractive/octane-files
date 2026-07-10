'use client'

import { useRef, useState } from 'react'
import GenerationFieldsEditor from '@/components/GenerationFieldsEditor'
import {
  CAR_CLASSES, deriveGenerationSlug,
  type GenerationRecord, type GenerationInput, type TrimRecord, type TrimInput,
  type CarRelationRecord, type CarRelationInput,
} from '@/lib/car-schema'
import { KNOWN_ENRICHMENT_HEADERS } from '@/lib/bulk-import-schema'
import { parseEnrichmentFields, findUnknownColumns, applyEnrichmentValues } from '@/lib/bulk-import'
import { parseCsvToRows } from '@/lib/csv-parse'

const IMAGE_SLOTS = ['hero', 'gallery-1', 'gallery-2', 'gallery-3'] as const

function toInput(g: GenerationRecord): GenerationInput {
  const {
    id: _id, model_id: _model_id, created_at: _created_at, updated_at: _updated_at,
    archived_at: _archived_at, desirability_tier_legacy: _legacy,
    rivals_alternatives: _rivals, related_cars: _related, ...rest
  } = g
  return rest
}

function toTrimInput(t: TrimRecord): TrimInput {
  const { id: _id, generation_id: _gid, created_at: _created_at, ...rest } = t
  return rest
}

function toRelationInput(r: CarRelationRecord): CarRelationInput {
  const { id: _id, generation_id: _gid, created_at: _created_at, ...rest } = r
  return rest
}

export default function AdminModelForm({
  generation, make, modelName, trims: initialTrims, relations: initialRelations,
}: {
  generation: GenerationRecord
  make: string
  modelName: string
  trims: TrimRecord[]
  relations: CarRelationRecord[]
}) {
  const [form, setForm] = useState<GenerationInput>(toInput(generation))
  const [trims, setTrims] = useState<TrimInput[]>(initialTrims.map(toTrimInput))
  const [relations, setRelations] = useState<CarRelationInput[]>(initialRelations.map(toRelationInput))
  const [archivedAt, setArchivedAt] = useState(generation.archived_at)
  const [slugEditing, setSlugEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filling, setFilling] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [msg, setMsg] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const [imagesUploading, setImagesUploading] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const imagesInputRef = useRef<HTMLInputElement>(null)

  function update(updates: Partial<GenerationInput>) {
    setForm(f => ({ ...f, ...updates }))
  }

  // Sequential, not a single transaction: main fields, then trims, then
  // relations. Both child-table PUTs are replace-alls (idempotent), so if
  // one fails after the generation PATCH already committed, it's safe to
  // just press Save again — the distinct message below says so rather than
  // a generic error, since a partial-success state is a real possibility
  // this codebase doesn't otherwise have a cross-table transaction for.
  async function save() {
    setSaving(true)
    setMsg('')

    const genRes = await fetch(`/api/admin/models/${generation.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!genRes.ok) {
      setSaving(false)
      const err = await genRes.json().catch(() => ({}))
      setMsg(err.error ?? 'Error saving')
      return
    }

    const trimsRes = await fetch(`/api/admin/models/${generation.slug}/trims`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trims }),
    })
    if (!trimsRes.ok) {
      setSaving(false)
      const err = await trimsRes.json().catch(() => ({}))
      setMsg(`Main fields saved, but trims failed to save (${err.error ?? 'unknown error'}) — press Save again`)
      return
    }

    const relationsRes = await fetch(`/api/admin/models/${generation.slug}/relations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relations }),
    })
    setSaving(false)
    if (!relationsRes.ok) {
      const err = await relationsRes.json().catch(() => ({}))
      setMsg(`Main fields and trims saved, but related cars/rivals failed to save (${err.error ?? 'unknown error'}) — press Save again`)
      return
    }

    setMsg('Saved ✓')
    setTimeout(() => setMsg(''), 3000)
  }

  async function toggleArchive() {
    setArchiving(true)
    const next = archivedAt ? null : new Date().toISOString()
    const res = await fetch(`/api/admin/models/${generation.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived_at: next }),
    })
    setArchiving(false)
    if (res.ok) {
      setArchivedAt(next)
      setMsg(next ? 'Archived ✓' : 'Unarchived ✓')
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('Error updating archive status')
    }
  }

  async function fillWithAI() {
    setFilling(true)
    setMsg('Asking AI...')
    const classLabel = CAR_CLASSES.find(c => c.value === form.class)?.label ?? form.class
    const res = await fetch('/api/admin/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make, model: modelName, generation: form.code,
        year_start: form.year_start, year_end: form.year_end,
        class: classLabel, body_styles: form.body_styles,
        drivetrain: form.drivetrain, engine_layout: form.engine_layout,
      }),
    })
    setFilling(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setMsg(err.error ?? 'AI fill failed')
      return
    }
    const data = await res.json()
    setForm(f => ({
      ...f,
      overview: data.overview ?? f.overview,
      specs: data.specs ?? f.specs,
      market_data: data.market_data ?? f.market_data,
      maintenance: data.maintenance ?? f.maintenance,
    }))
    setMsg('AI filled — review and save ✓')
  }

  // Parsed entirely client-side, same parseEnrichmentFields/validation the
  // bulk importer uses — no server round-trip, no separate write path. This
  // only ever touches `form` in memory; the existing Save button below is
  // still what commits it, same as fillWithAI above.
  async function importCsv(file: File) {
    setCsvImporting(true)
    setMsg('')
    const text = await file.text()
    const { headers, rows } = parseCsvToRows(text)
    const unknown = findUnknownColumns(headers, KNOWN_ENRICHMENT_HEADERS)

    if (rows.length === 0) {
      setCsvImporting(false)
      setMsg('Error: CSV has no data row')
      return
    }
    const row = rows[0]
    if (rows.length > 1) {
      console.warn(`CSV has ${rows.length} rows — only the first is used (one car per edit page)`)
    }

    const rowMake = (row.Make ?? '').trim(), rowModel = (row.Model ?? '').trim(), rowGen = (row.Generation ?? '').trim()
    const mismatched =
      (rowMake && rowMake.toLowerCase() !== make.toLowerCase()) ||
      (rowModel && rowModel.toLowerCase() !== modelName.toLowerCase()) ||
      (rowGen && rowGen.toLowerCase() !== form.code.toLowerCase())
    if (mismatched) {
      const proceed = window.confirm(
        `This CSV looks like it's for "${rowMake} ${rowModel} ${rowGen}", but you're editing "${make} ${modelName} ${form.code}". Apply it to this car anyway?`
      )
      if (!proceed) { setCsvImporting(false); setMsg('CSV import cancelled'); return }
    }

    const { values, errors } = parseEnrichmentFields(row)
    setCsvImporting(false)
    if (errors.length > 0) {
      setMsg(`Error: ${errors.length} invalid field(s) in CSV — ${errors.map(e => `${e.header} (${e.reason})`).join('; ')}`)
      return
    }

    setForm(f => applyEnrichmentValues(f, values))
    const unknownNote = unknown.length > 0 ? ` (ignored unknown columns: ${unknown.join(', ')})` : ''
    setMsg(`Applied ${Object.keys(values).length} field(s) from CSV — review and Save${unknownNote}`)
  }

  // Filename (minus extension) decides the slot — hero.jpg, gallery-1.png,
  // etc., same convention as the bulk image-upload tool's folders, just
  // loose files instead of a folder since this is always exactly one car.
  // Each file is resized/uploaded immediately (so you see it land), but
  // only `form` is updated — Save still commits it.
  async function importImages(fileList: FileList) {
    const bySlot = new Map<string, File>()
    for (const file of Array.from(fileList)) {
      const slot = file.name.replace(/\.[^.]+$/, '').toLowerCase()
      if ((IMAGE_SLOTS as readonly string[]).includes(slot)) bySlot.set(slot, file)
    }
    if (bySlot.size === 0) {
      setMsg(`Error: no recognized filenames (expected ${IMAGE_SLOTS.join(', ')})`)
      return
    }

    setImagesUploading(true)
    setMsg(`Uploading 0/${bySlot.size}...`)
    const uploaded: Record<string, string> = {}
    const failures: string[] = []
    let done = 0
    for (const [slot, file] of bySlot) {
      const fd = new FormData()
      fd.append('slot', slot)
      fd.append('file', file)
      const res = await fetch(`/api/admin/models/${generation.slug}/image`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok) uploaded[slot] = data.url
      else failures.push(`${slot}: ${data.error ?? 'upload failed'}`)
      done++
      setMsg(`Uploading ${done}/${bySlot.size}...`)
    }
    setImagesUploading(false)

    if (Object.keys(uploaded).length > 0) {
      setForm(f => {
        const next = { ...f }
        if (uploaded.hero) next.hero_image = uploaded.hero
        const galleryUrls = IMAGE_SLOTS.filter(s => s !== 'hero' && uploaded[s]).map(s => uploaded[s])
        if (galleryUrls.length > 0) next.gallery_images = galleryUrls
        return next
      })
    }

    if (failures.length > 0) setMsg(`Error: ${failures.join('; ')}`)
    else setMsg(`Attached ${Object.keys(uploaded).length} image(s) — review and Save`)
  }

  const title = `${make} ${modelName}${form.code && form.code.toLowerCase() !== modelName.toLowerCase() ? ' ' + form.code : ''}`
  const msgClass = msg.includes('Error') || msg.includes('failed') ? 'text-error' : 'text-success'
  const suggestedSlug = deriveGenerationSlug(make, modelName, form.code)

  return (
    <div className="max-w-215 mx-auto pt-10 px-6 pb-20 font-[system-ui,sans-serif]">
      <div className="flex justify-between items-start mb-8">
        <div>
          <a href="/admin" className="text-xs text-text-tertiary no-underline">← All models</a>
          <h1 className="mt-2 text-2xl font-bold text-text-primary">{title}</h1>
          <p className="mt-1 text-xs text-text-tertiary">{make} / {modelName} — read-only context</p>
        </div>
        <div className="flex gap-2.5 items-center">
          {msg && <span className={`text-xs ${msgClass}`}>{msg}</span>}
          <button onClick={toggleArchive} disabled={archiving} className="btn-secondary h-9 px-4 disabled:opacity-60">
            {archiving ? 'Working...' : archivedAt ? 'Unarchive' : 'Archive'}
          </button>
          <button onClick={fillWithAI} disabled={filling || saving} className="h-9 px-4 rounded-md text-body font-medium bg-accent-subtle text-accent-dim border border-accent-border cursor-pointer disabled:opacity-60 disabled:cursor-default transition-opacity">
            {filling ? 'Filling...' : '✦ Ask AI to fill'}
          </button>
          <button onClick={save} disabled={saving || filling} className="btn-primary h-9 px-5 rounded-md">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {archivedAt && (
        <div className="mb-6 p-4 rounded-lg border border-border-mid bg-bg-elevated text-body text-text-secondary">
          Archived {new Date(archivedAt).toLocaleDateString()} — hidden from the public site. Use Unarchive above to restore it.
        </div>
      )}

      <div className="mb-7 p-4 rounded-lg border border-border-mid bg-bg-elevated flex flex-col gap-2">
        <div className="text-label font-bold tracking-[0.08em] text-text-tertiary uppercase">Quick Import</div>
        <p className="text-label text-text-tertiary -mt-1">
          Fills the form in memory only — review below and click Save to commit.
        </p>
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={csvImporting}
            className="btn-secondary h-9 px-4 disabled:opacity-60"
          >
            {csvImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <input
            ref={csvInputRef}
            type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = '' }}
          />
          <button
            type="button"
            onClick={() => imagesInputRef.current?.click()}
            disabled={imagesUploading}
            className="btn-secondary h-9 px-4 disabled:opacity-60"
          >
            {imagesUploading ? 'Uploading...' : 'Attach images'}
          </button>
          <input
            ref={imagesInputRef}
            type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) importImages(e.target.files); e.target.value = '' }}
          />
          <span className="text-label text-text-tertiary">
            Images: filenames <code>hero</code>, <code>gallery-1</code>, <code>gallery-2</code>, <code>gallery-3</code>
          </span>
        </div>
      </div>

      <div className="mb-7">
        <label className="field-label">Slug (public URL)</label>
        {slugEditing ? (
          <div className="flex gap-2 items-center">
            <input className="input flex-1" value={form.slug} onChange={e => update({ slug: e.target.value })} />
            <button type="button" onClick={() => setSlugEditing(false)} className="btn-secondary px-3">Done</button>
          </div>
        ) : (
          <div className="flex gap-3 items-center">
            <code className="text-body text-text-secondary bg-bg-elevated px-2.5 py-1.5 rounded-md">/cars/{form.slug}</code>
            <button type="button" onClick={() => setSlugEditing(true)} className="text-xs text-text-tertiary underline">
              Advanced: edit manually
            </button>
          </div>
        )}
        {slugEditing && form.slug !== suggestedSlug && (
          <p className="text-label text-text-tertiary mt-1.5">
            Changing this moves the public URL — anything linking to the old slug will 404. Auto-derived value would be <code>{suggestedSlug}</code>.
          </p>
        )}
      </div>

      <GenerationFieldsEditor
        value={form}
        onChange={update}
        generationId={generation.id}
        trims={trims}
        onTrimsChange={setTrims}
        relations={relations}
        onRelationsChange={setRelations}
      />

      <div className="mt-8 flex justify-end gap-2.5">
        {msg && <span className={`text-xs self-center ${msgClass}`}>{msg}</span>}
        <button onClick={save} disabled={saving || filling} className="btn-primary h-10 px-7">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
