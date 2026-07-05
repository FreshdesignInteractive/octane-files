'use client'

import { useState } from 'react'
import GenerationFieldsEditor from '@/components/GenerationFieldsEditor'
import { CAR_CLASSES, deriveGenerationSlug, type GenerationRecord, type GenerationInput } from '@/lib/car-schema'

function toInput(g: GenerationRecord): GenerationInput {
  const {
    id: _id, model_id: _model_id, created_at: _created_at, updated_at: _updated_at,
    archived_at: _archived_at, desirability_tier_legacy: _legacy, ...rest
  } = g
  return rest
}

export default function AdminModelForm({
  generation, make, modelName,
}: {
  generation: GenerationRecord
  make: string
  modelName: string
}) {
  const [form, setForm] = useState<GenerationInput>(toInput(generation))
  const [archivedAt, setArchivedAt] = useState(generation.archived_at)
  const [slugEditing, setSlugEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filling, setFilling] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [msg, setMsg] = useState('')

  function update(updates: Partial<GenerationInput>) {
    setForm(f => ({ ...f, ...updates }))
  }

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/admin/models/${generation.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Saved ✓')
      setTimeout(() => setMsg(''), 3000)
    } else {
      const err = await res.json().catch(() => ({}))
      setMsg(err.error ?? 'Error saving')
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
      overview: data.overview ?? f.overview,
      specs: data.specs ?? f.specs,
      market_data: data.market_data ?? f.market_data,
      maintenance: data.maintenance ?? f.maintenance,
    }))
    setMsg('AI filled — review and save ✓')
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

      <GenerationFieldsEditor value={form} onChange={update} />

      <div className="mt-8 flex justify-end gap-2.5">
        {msg && <span className={`text-xs self-center ${msgClass}`}>{msg}</span>}
        <button onClick={save} disabled={saving || filling} className="btn-primary h-10 px-7">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
