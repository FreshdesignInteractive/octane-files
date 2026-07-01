'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Model } from '@/lib/types'

const CLASSES = ['Exotic', 'Grand Tourer', 'Icons', 'Luxury', 'Muscle', 'Off-Road', 'Sports']
const COUNTRIES = ['Australia', 'France', 'Germany', 'Italy', 'Japan', 'Sweden', 'UK', 'USA', 'Other']

const field = (label: string, children: React.ReactNode) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </label>
    {children}
  </div>
)

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid #e0e0e0',
  borderRadius: 6, fontSize: 13, color: '#111', background: '#fff', outline: 'none', width: '100%',
}

const textareaStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6,
  fontSize: 13, color: '#111', background: '#fff', outline: 'none',
  width: '100%', resize: 'vertical', lineHeight: 1.6,
}

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

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <a href="/admin" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← All models</a>
          <h1 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, color: '#111' }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>{model.slug}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 12, color: msg.includes('Error') || msg.includes('failed') ? '#ef4444' : '#22c55e' }}>{msg}</span>}
          <button onClick={fillWithAI} disabled={filling || saving} style={{
            height: 36, padding: '0 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            background: '#f5f0e8', color: '#8a6a28', border: '1px solid #e5d5b0',
            cursor: filling ? 'default' : 'pointer', opacity: filling ? 0.6 : 1,
          }}>
            {filling ? 'Filling...' : '✦ Ask AI to fill'}
          </button>
          <button onClick={save} disabled={saving || filling} style={{
            height: 36, padding: '0 20px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            background: '#111', color: '#fff', border: 'none',
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Basic info */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>Basic Info</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {field('Make', <input style={inputStyle} value={form.make} onChange={e => set('make', e.target.value)} />)}
            {field('Model', <input style={inputStyle} value={form.model} onChange={e => set('model', e.target.value)} />)}
            {field('Generation', <input style={inputStyle} value={form.generation ?? ''} onChange={e => set('generation', e.target.value || null)} />)}
            {field('Year Start', <input style={inputStyle} type="number" value={form.year_start} onChange={e => set('year_start', parseInt(e.target.value))} />)}
            {field('Year End', <input style={inputStyle} type="number" value={form.year_end ?? ''} onChange={e => set('year_end', e.target.value ? parseInt(e.target.value) : null)} placeholder="leave blank if present" />)}
            {field('Units Produced', <input style={inputStyle} type="number" value={form.units_produced ?? ''} onChange={e => set('units_produced', e.target.value ? parseInt(e.target.value) : null)} />)}
            {field('Class',
              <select style={{ ...inputStyle }} value={form.class} onChange={e => set('class', e.target.value)}>
                {CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('Country',
              <select style={{ ...inputStyle }} value={form.country} onChange={e => set('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('Drivetrain', <input style={inputStyle} value={form.drivetrain ?? ''} onChange={e => set('drivetrain', e.target.value || null)} placeholder="e.g. RWD, AWD" />)}
            {field('Engine Layout', <input style={inputStyle} value={form.engine_layout ?? ''} onChange={e => set('engine_layout', e.target.value || null)} placeholder="e.g. Front-engine, Mid-engine" />)}
          </div>
          <div style={{ marginTop: 16 }}>
            {field('Body Styles (comma-separated)', <input style={inputStyle} value={(form.body_styles ?? []).join(', ')} onChange={e => set('body_styles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="e.g. Coupe, Convertible" />)}
          </div>
        </section>

        {/* Hero image */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>Hero Image</h2>
          {field('Image URL', <input style={inputStyle} value={form.hero_image ?? ''} onChange={e => set('hero_image', e.target.value || null)} placeholder="https://..." />)}
          {form.hero_image && (
            <img src={form.hero_image} alt="preview" style={{ marginTop: 10, width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e8e8' }} />
          )}
        </section>

        {/* Overview */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>Overview</h2>
          {field('', <textarea style={{ ...textareaStyle, minHeight: 160 }} value={form.overview ?? ''} onChange={e => set('overview', e.target.value || null)} placeholder="History, significance, key highlights..." />)}
        </section>

        {/* Specs */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
            Specs
            <span style={{ fontWeight: 400, fontSize: 11, color: '#aaa', marginLeft: 8, textTransform: 'none' }}>AI-generated · stored as JSON</span>
          </h2>
          <textarea
            style={{ ...textareaStyle, minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
            value={JSON.stringify(form.specs ?? [], null, 2)}
            onChange={e => {
              try { set('specs', JSON.parse(e.target.value)) } catch {}
            }}
          />
        </section>

        {/* Market data */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>Market Data (USD)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {field('Low', <input style={inputStyle} type="number" value={form.market_data?.low ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, notes: null, mid: null, high: null }), low: e.target.value ? parseInt(e.target.value) : null })} />)}
            {field('Mid', <input style={inputStyle} type="number" value={form.market_data?.mid ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, high: null }), mid: e.target.value ? parseInt(e.target.value) : null })} />)}
            {field('High', <input style={inputStyle} type="number" value={form.market_data?.high ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, mid: null }), high: e.target.value ? parseInt(e.target.value) : null })} />)}
          </div>
          <div style={{ marginTop: 16 }}>
            {field('Notes', <textarea style={{ ...textareaStyle, minHeight: 60 }} value={form.market_data?.notes ?? ''} onChange={e => set('market_data', { ...(form.market_data ?? { currency: 'USD', as_of: null, low: null, mid: null, high: null }), notes: e.target.value || null })} />)}
          </div>
        </section>

        {/* Maintenance */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>Maintenance Notes</h2>
          {field('', <textarea style={{ ...textareaStyle, minHeight: 120 }} value={form.maintenance ?? ''} onChange={e => set('maintenance', e.target.value || null)} placeholder="Common issues, parts availability, tips for owners..." />)}
        </section>
      </div>

      {/* Bottom save */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {msg && <span style={{ fontSize: 12, color: msg.includes('Error') || msg.includes('failed') ? '#ef4444' : '#22c55e', alignSelf: 'center' }}>{msg}</span>}
        <button onClick={save} disabled={saving || filling} style={{
          height: 40, padding: '0 28px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: '#111', color: '#fff', border: 'none',
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
