'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Model } from '@/lib/types'

const CLASSES = ['Exotic', 'Grand Tourer', 'Icons', 'Luxury', 'Muscle', 'Off-Road', 'Sports']
const COUNTRIES = ['Australia', 'France', 'Germany', 'Italy', 'Japan', 'Sweden', 'UK', 'USA', 'Other']

const field = (label: string, children: React.ReactNode) => (
  <div className="field">
    <label className="field-label">
      {label}
    </label>
    {children}
  </div>
)

const sectionHeading = 'text-body font-bold text-text-primary uppercase tracking-[0.06em] mb-4 pb-2 border-b border-border'

export default function AdminModelForm({ model }: { model: Model }) {
  const router = useRouter()
  const [form, setForm]     = useState<Model>(model)
  const [saving, setSaving] = useState(false)
  const [filling, setFilling] = useState(false)
  const [msg, setMsg]       = useState('')

  function set(key: keyof Model, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/admin/models/${model.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make: form.make, model: form.model, generation: form.generation,
        year_start: form.year_start, year_end: form.year_end,
        class: form.class, country: form.country,
        body_styles: form.body_styles, drivetrain: form.drivetrain,
        engine_layout: form.engine_layout, units_produced: form.units_produced,
        overview: form.overview, hero_image: form.hero_image,
        specs: form.specs, market_data: form.market_data,
        maintenance: form.maintenance, resources: form.resources,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Saved ✓')
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('Error saving')
    }
  }

  async function fillWithAI() {
    setFilling(true)
    setMsg('Asking AI...')
    const res = await fetch('/api/admin/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make: form.make, model: form.model, generation: form.generation,
        year_start: form.year_start, year_end: form.year_end,
        class: form.class, country: form.country,
        body_styles: form.body_styles, drivetrain: form.drivetrain,
        engine_layout: form.engine_layout,
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
      overview:    data.overview    ?? f.overview,
      specs:       data.specs       ?? f.specs,
      market_data: data.market_data ?? f.market_data,
      maintenance: data.maintenance ?? f.maintenance,
    }))
    setMsg('AI filled — review and save ✓')
  }

  const title = `${form.make} ${form.model}${form.generation && form.generation.toLowerCase() !== form.model.toLowerCase() ? ' ' + form.generation : ''}`
  const msgClass = msg.includes('Error') || msg.includes('failed') ? 'text-error' : 'text-success'

  return (
    <div className="max-w-215 mx-auto pt-10 px-6 pb-20 font-[system-ui,sans-serif]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <a href="/admin" className="text-xs text-text-tertiary no-underline">← All models</a>
          <h1 className="mt-2 text-2xl font-bold text-text-primary">{title}</h1>
          <p className="mt-1 text-xs text-text-tertiary">{model.slug}</p>
        </div>
        <div className="flex gap-2.5 items-center">
          {msg && <span className={`text-xs ${msgClass}`}>{msg}</span>}
          <button onClick={fillWithAI} disabled={filling || saving} className="h-9 px-4 rounded-md text-body font-medium bg-accent-subtle text-accent-dim border border-accent-border cursor-pointer disabled:opacity-60 disabled:cursor-default transition-opacity">
            {filling ? 'Filling...' : '✦ Ask AI to fill'}
          </button>
          <button onClick={save} disabled={saving || filling} className="btn-primary h-9 px-5 rounded-md">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-7">
        {/* Basic info */}
        <section>
          <h2 className={sectionHeading}>Basic Info</h2>
          <div className="grid grid-cols-3 gap-4">
            {field('Make', <input className="input" value={form.make} onChange={e => set('make', e.target.value)} />)}
            {field('Model', <input className="input" value={form.model} onChange={e => set('model', e.target.value)} />)}
            {field('Generation', <input className="input" value={form.generation ?? ''} onChange={e => set('generation', e.target.value || null)} />)}
            {field('Year Start', <input className="input" type="number" value={form.year_start} onChange={e => set('year_start', parseInt(e.target.value))} />)}
            {field('Year End', <input className="input" type="number" value={form.year_end ?? ''} onChange={e => set('year_end', e.target.value ? parseInt(e.target.value) : null)} placeholder="leave blank if present" />)}
            {field('Units Produced', <input className="input" type="number" value={form.units_produced ?? ''} onChange={e => set('units_produced', e.target.value ? parseInt(e.target.value) : null)} />)}
            {field('Class',
              <select className="select" value={form.class} onChange={e => set('class', e.target.value)}>
                {CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('Country',
              <select className="select" value={form.country} onChange={e => set('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('Drivetrain', <input className="input" value={form.drivetrain ?? ''} onChange={e => set('drivetrain', e.target.value || null)} placeholder="e.g. RWD, AWD" />)}
            {field('Engine Layout', <input className="input" value={form.engine_layout ?? ''} onChange={e => set('engine_layout', e.target.value || null)} placeholder="e.g. Front-engine, Mid-engine" />)}
          </div>
          <div className="mt-4">
            {field('Body Styles (comma-separated)', <input className="input" value={(form.body_styles ?? []).join(', ')} onChange={e => set('body_styles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="e.g. Coupe, Convertible" />)}
          </div>
        </section>

        {/* Hero image */}
        <section>
          <h2 className={sectionHeading}>Hero Image</h2>
          {field('Image URL', <input className="input" value={form.hero_image ?? ''} onChange={e => set('hero_image', e.target.value || null)} placeholder="https://..." />)}
          {form.hero_image && (
            <img src={form.hero_image} alt="preview" className="mt-2.5 w-full max-h-65 object-cover rounded-lg border border-border" />
          )}
        </section>

        {/* Overview */}
        <section>
          <h2 className={sectionHeading}>Overview</h2>
          {field('', <textarea className="textarea min-h-40" value={form.overview ?? ''} onChange={e => set('overview', e.target.value || null)} placeholder="History, significance, key highlights..." />)}
        </section>

        {/* Specs */}
        <section>
          <h2 className={sectionHeading}>
            Specs
            <span className="font-normal text-label text-text-tertiary ml-2 normal-case">AI-generated · stored as JSON</span>
          </h2>
          <textarea
            className="textarea min-h-50 font-mono text-xs"
            value={JSON.stringify(form.specs ?? [], null, 2)}
            onChange={e => {
              try { set('specs', JSON.parse(e.target.value)) } catch {}
            }}
          />
        </section>

        {/* Market data */}
        <section>
          <h2 className={sectionHeading}>Market Data (USD)</h2>
          <div className="grid grid-cols-3 gap-4">
            {field('Low', <input className="input" type="number" value={form.market_data?.low ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, notes: null, mid: null, high: null }), low: e.target.value ? parseInt(e.target.value) : null })} />)}
            {field('Mid', <input className="input" type="number" value={form.market_data?.mid ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, high: null }), mid: e.target.value ? parseInt(e.target.value) : null })} />)}
            {field('High', <input className="input" type="number" value={form.market_data?.high ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, mid: null }), high: e.target.value ? parseInt(e.target.value) : null })} />)}
          </div>
          <div className="mt-4">
            {field('Notes', <textarea className="textarea min-h-15" value={form.market_data?.notes ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, low: null, mid: null, high: null }), notes: e.target.value || null })} />)}
          </div>
        </section>

        {/* Maintenance */}
        <section>
          <h2 className={sectionHeading}>Maintenance Notes</h2>
          {field('', <textarea className="textarea min-h-30" value={form.maintenance ?? ''} onChange={e => set('maintenance', e.target.value || null)} placeholder="Common issues, parts availability, tips for owners..." />)}
        </section>
      </div>

      {/* Bottom save */}
      <div className="mt-8 flex justify-end gap-2.5">
        {msg && <span className={`text-xs self-center ${msgClass}`}>{msg}</span>}
        <button onClick={save} disabled={saving || filling} className="btn-primary h-10 px-7">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
