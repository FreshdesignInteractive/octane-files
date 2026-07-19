'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import GenerationFieldsEditor from '@/components/GenerationFieldsEditor'
import {
  CAR_CLASSES, deriveGenerationSlug,
  type GenerationRecord, type GenerationInput, type TrimRecord, type TrimInput,
  type CarRelationRecord, type CarRelationInput,
} from '@/lib/car-schema'
import { KNOWN_ENRICHMENT_HEADERS } from '@/lib/bulk-import-schema'
import { parseEnrichmentFields, findUnknownColumns, applyEnrichmentValues } from '@/lib/bulk-import'
import { parseCsvToRows } from '@/lib/csv-parse'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { deleteCarImageIfOwned } from '@/lib/storage-cleanup'

const IMAGE_SLOT_HERO = 'hero'
const GALLERY_SLOT_PATTERN = /^gallery-(\d+)$/

function toInput(g: GenerationRecord): GenerationInput {
  const {
    id: _id, model_id: _model_id, created_at: _created_at, updated_at: _updated_at,
    archived_at: _archived_at, desirability_tier_legacy: _legacy,
    rivals_alternatives: _rivals, related_cars: _related, production_years: _production_years,
    ...rest
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
  const router = useRouter()
  const [form, setForm] = useState<GenerationInput>(toInput(generation))
  const [trims, setTrims] = useState<TrimInput[]>(initialTrims.map(toTrimInput))
  const [relations, setRelations] = useState<CarRelationInput[]>(initialRelations.map(toRelationInput))
  const [archivedAt, setArchivedAt] = useState(generation.archived_at)
  const [saving, setSaving] = useState(false)
  const [filling, setFilling] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [msg, setMsg] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const [imagesUploading, setImagesUploading] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const imagesInputRef = useRef<HTMLInputElement>(null)
  // Every image URL that's been "live" at any point this editing session —
  // the ones loaded from the DB at mount, plus every one uploaded via
  // Attach Images since. Removing an image (Hero or Gallery) never touches
  // Supabase directly; it only clears the field in memory. At Save time,
  // whatever from this set is no longer referenced in the saved result gets
  // deleted exactly once. This is what catches an upload-then-remove that
  // never made it into the original OR the final state, not just a plain
  // swap between the two.
  const liveImageUrlsRef = useRef<Set<string>>(new Set([generation.hero_image, ...generation.gallery_images].filter((u): u is string => !!u)))

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

    // Cleared Hero/Gallery slots sit in `form` as null/'' until Save — never
    // sent to the DB as-is. finalHero/finalGallery are what actually get
    // persisted; the array is compacted here, not the moment a slot is
    // cleared, since Remove itself is a pure in-memory edit that never
    // touches storage or the array's length.
    const finalHero = form.hero_image || null
    const finalGallery = form.gallery_images.filter(Boolean)
    const finalUrls = new Set([finalHero, ...finalGallery].filter((u): u is string => !!u))
    // Slug is always derived, never hand-edited — if the Generation Code
    // changed, this is a rename (suggestedSlug is computed below in render
    // from the same make/modelName/form.code inputs). Trims/relations below
    // are looked up by slug server-side, so they run first, against
    // generation.slug (still the row's actual slug until the rename PATCH
    // lands) — doing the rename first would make those lookups 404 against
    // a slug that no longer matches any row.
    const body = { ...form, hero_image: finalHero, gallery_images: finalGallery, slug: suggestedSlug }

    const trimsRes = await fetch(`/api/admin/models/${generation.slug}/trims`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trims }),
    })
    if (!trimsRes.ok) {
      setSaving(false)
      const err = await trimsRes.json().catch(() => ({}))
      setMsg(`Trims failed to save (${err.error ?? 'unknown error'}) — press Save again`)
      return
    }

    const relationsRes = await fetch(`/api/admin/models/${generation.slug}/relations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relations }),
    })
    if (!relationsRes.ok) {
      setSaving(false)
      const err = await relationsRes.json().catch(() => ({}))
      setMsg(`Trims saved, but related cars/rivals failed to save (${err.error ?? 'unknown error'}) — press Save again`)
      return
    }

    const genRes = await fetch(`/api/admin/models/${generation.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!genRes.ok) {
      const err = await genRes.json().catch(() => ({}))
      setMsg(`Trims and related cars/rivals saved, but main fields failed to save (${err.error ?? 'unknown error'}) — press Save again`)
      return
    }

    // Only now, after the DB write is confirmed, is it safe to actually
    // delete anything — every URL that was ever live this session and
    // didn't make it into the final saved result. Best-effort: each call
    // swallows its own error (see deleteCarImageIfOwned), so a storage
    // hiccup here never blocks the save the user actually asked for.
    for (const url of liveImageUrlsRef.current) {
      if (!finalUrls.has(url)) deleteCarImageIfOwned(url)
    }
    liveImageUrlsRef.current = finalUrls
    setForm(f => ({ ...f, hero_image: finalHero, gallery_images: finalGallery, slug: suggestedSlug }))

    setMsg('Saved ✓')
    setTimeout(() => setMsg(''), 3000)

    // The URL this page is on is keyed by the old slug — once it's actually
    // renamed in the DB, every subsequent action (another Save, Archive,
    // Attach Images) needs to hit /api/admin/models/<new slug>, not the one
    // this page loaded with. Re-navigating re-fetches the server component
    // fresh at the new address rather than trying to patch generation.slug
    // in place (it's a prop, not state).
    if (suggestedSlug !== generation.slug) {
      router.replace(`/admin/models/${suggestedSlug}`)
    }
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
      introduction: data.introduction ?? f.introduction,
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

  // Filename (minus extension) decides the slot: hero.jpg replaces the
  // hero; gallery-N.jpg (any positive integer, not a fixed 1-3) targets
  // gallery position N. If that position already has an image, this
  // replaces just that one photo; if N is past the current gallery length,
  // it's appended — so dropping in a single gallery-4.jpg to add a fourth
  // photo doesn't touch 1-3. There's no separate "add"/"remove" button for
  // gallery photos anymore; this filename convention is the whole
  // interface for both.
  // Server resizes only (sharp needs Node) and hands the bytes back — the
  // actual Storage upload happens here, client-side. A long investigation
  // proved a Vercel-server-to-Supabase upload of binary data comes back
  // corrupted (sharp's output itself is fine; every client-side upload
  // variant tried still corrupted; the identical upload from a browser is
  // byte-perfect), so the write has to originate from the browser.
  async function importImages(fileList: FileList) {
    const bySlot = new Map<string, File>()
    for (const file of Array.from(fileList)) {
      const slot = file.name.replace(/\.[^.]+$/, '').toLowerCase()
      if (slot === IMAGE_SLOT_HERO || GALLERY_SLOT_PATTERN.test(slot)) bySlot.set(slot, file)
    }
    if (bySlot.size === 0) {
      setMsg(`Error: no recognized filenames (expected hero, gallery-1, gallery-2, ...)`)
      return
    }

    const baseGallery = form.gallery_images

    setImagesUploading(true)
    setMsg(`Uploading 0/${bySlot.size}...`)
    const uploaded: { slot: string; url: string }[] = []
    const failures: string[] = []
    let done = 0
    const browserSupabase = createBrowserSupabaseClient()
    for (const [slot, file] of bySlot) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const resizeRes = await fetch(`/api/admin/models/${generation.slug}/image`, { method: 'POST', body: fd })
        if (!resizeRes.ok) {
          const err = await resizeRes.json().catch(() => ({}))
          throw new Error(err.error ?? 'resize failed')
        }
        const optimizedBlob = await resizeRes.blob()

        const path = `${generation.slug}/${slot}-${Date.now()}.webp`
        const { error: uploadError } = await browserSupabase.storage.from('car-images').upload(path, optimizedBlob, {
          contentType: 'image/webp', upsert: false,
        })
        if (uploadError) throw new Error(uploadError.message)

        const { data: pub } = browserSupabase.storage.from('car-images').getPublicUrl(path)
        uploaded.push({ slot, url: pub.publicUrl })
      } catch (err) {
        failures.push(`${slot}: ${err instanceof Error ? err.message : String(err)}`)
      }
      done++
      setMsg(`Uploading ${done}/${bySlot.size}...`)
    }
    setImagesUploading(false)

    if (uploaded.length > 0) {
      const heroUpload = uploaded.find(u => u.slot === IMAGE_SLOT_HERO)

      // gallery-N -> position N-1, applied in ascending N order so several
      // new positions in one batch append in a sensible order.
      const galleryUploads = uploaded
        .filter(u => u.slot !== IMAGE_SLOT_HERO)
        .map(u => ({ index: Number(GALLERY_SLOT_PATTERN.exec(u.slot)![1]) - 1, url: u.url }))
        .sort((a, b) => a.index - b.index)

      let nextGallery = baseGallery
      if (galleryUploads.length > 0) {
        nextGallery = [...baseGallery]
        for (const { index, url } of galleryUploads) {
          if (index < nextGallery.length) nextGallery[index] = url
          else nextGallery.push(url)
        }
      }

      setForm(f => ({
        ...f,
        ...(heroUpload ? { hero_image: heroUpload.url } : {}),
        ...(galleryUploads.length > 0 ? { gallery_images: nextGallery } : {}),
      }))

      // No storage delete here — the newly uploaded file (and whatever it
      // displaced) both just become "live this session"; the Save-time
      // diff in save() is the one place that actually deletes anything,
      // once, only after the DB write it's cleaning up after is confirmed.
      for (const u of uploaded) liveImageUrlsRef.current.add(u.url)
    }

    if (failures.length > 0) setMsg(`Error: ${failures.join('; ')}`)
    else setMsg(`Attached ${uploaded.length} image(s) — review and Save`)
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
        <div className="text-label font-bold tracking-widest text-text-tertiary uppercase">Quick Import</div>
        <p className="text-label text-text-tertiary -mt-1">
          Fills the form in memory only — review below and click Save to commit.
        </p>
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={csvImporting}
            className="btn-secondary h-9 px-4 shrink-0 whitespace-nowrap disabled:opacity-60"
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
            className="btn-secondary h-9 px-4 shrink-0 whitespace-nowrap disabled:opacity-60"
          >
            {imagesUploading ? 'Uploading...' : 'Attach images'}
          </button>
          <input
            ref={imagesInputRef}
            type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) importImages(e.target.files); e.target.value = '' }}
          />
          <span className="text-label text-text-tertiary">
            Images: filenames <code>hero</code>, <code>gallery-1</code>, <code>gallery-2</code>, etc. — <code>gallery-N</code> replaces position N if it exists, or adds a new photo if it doesn&apos;t
          </span>
        </div>
      </div>

      <div className="mb-7">
        <label className="field-label">Slug (public URL)</label>
        <code className="text-body text-text-secondary bg-bg-elevated px-2.5 py-1.5 rounded-md">/cars/{suggestedSlug}</code>
        <p className="text-label text-text-tertiary mt-1.5">
          Always derived from Make / Model / Generation Code — not directly editable. Changing Generation Code above renames the public URL on Save; any bookmarked link to the previous address will 404.
        </p>
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
