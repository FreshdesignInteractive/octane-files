'use client'

import {
  CAR_CLASSES, BODY_STYLES, DRIVETRAIN_TYPES, RESOURCE_TYPES,
  type GenerationInput, type BodyStyle, type DrivetrainType, type ResourceType,
} from '@/lib/car-schema'

const field = (label: string, children: React.ReactNode) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
  </div>
)

const sectionHeading = 'text-body font-bold text-text-primary uppercase tracking-[0.06em] mb-4 pb-2 border-b border-border'

// Shared by the existing-generation editor and the new-car create flow.
// Deliberately does NOT render `slug` — each parent owns that field's own
// display-vs-advanced-edit behavior around this component.
export default function GenerationFieldsEditor({
  value, onChange,
}: {
  value: GenerationInput
  onChange: (updates: Partial<GenerationInput>) => void
}) {
  function toggleArrayValue<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Basic info */}
      <section>
        <h2 className={sectionHeading}>Basic Info</h2>
        <div className="grid grid-cols-3 gap-4">
          {field('Generation Code', <input className="input" value={value.code} onChange={e => onChange({ code: e.target.value })} placeholder="e.g. E30, Single Generation" />)}
          {field('Year Start', <input className="input" type="number" value={value.year_start} onChange={e => onChange({ year_start: parseInt(e.target.value) || 0 })} />)}
          {field('Year End', <input className="input" type="number" value={value.year_end ?? ''} onChange={e => onChange({ year_end: e.target.value ? parseInt(e.target.value) : null })} placeholder="leave blank if present" />)}
          {field('Production Years (display)', <input className="input" value={value.production_years ?? ''} onChange={e => onChange({ production_years: e.target.value || null })} placeholder="auto-derived if left blank" />)}
          {field('Units Produced', <input className="input" type="number" value={value.units_produced ?? ''} onChange={e => onChange({ units_produced: e.target.value ? parseInt(e.target.value) : null })} />)}
          {field('Engine Layout', <input className="input" value={value.engine_layout ?? ''} onChange={e => onChange({ engine_layout: e.target.value || null })} placeholder="e.g. Front-engine, Mid-engine" />)}
          {field('Class',
            <select className="select" value={value.class} onChange={e => onChange({ class: e.target.value as GenerationInput['class'] })}>
              {CAR_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
          {field('Icon',
            <label className="flex items-center gap-2 h-9">
              <input type="checkbox" checked={value.is_icon} onChange={e => onChange({ is_icon: e.target.checked })} />
              <span className="text-body text-text-secondary">Marked as an icon</span>
            </label>
          )}
        </div>

        <div className="mt-4">
          {field('Body Styles', (
            <div className="flex flex-wrap gap-2">
              {BODY_STYLES.map(style => (
                <label key={style} className={`pill ${value.body_styles.includes(style) ? 'pill-active' : ''}`} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={value.body_styles.includes(style)}
                    onChange={() => onChange({ body_styles: toggleArrayValue<BodyStyle>(value.body_styles, style) })}
                  />
                  {style}
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4">
          {field('Drivetrain', (
            <div className="flex flex-wrap gap-2">
              {DRIVETRAIN_TYPES.map(dt => (
                <label key={dt} className={`pill ${value.drivetrain.includes(dt) ? 'pill-active' : ''}`} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={value.drivetrain.includes(dt)}
                    onChange={() => onChange({ drivetrain: toggleArrayValue<DrivetrainType>(value.drivetrain, dt) })}
                  />
                  {dt}
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Hero image + gallery */}
      <section>
        <h2 className={sectionHeading}>Images</h2>
        {field('Hero Image URL', <input className="input" value={value.hero_image ?? ''} onChange={e => onChange({ hero_image: e.target.value || null })} placeholder="https://..." />)}
        {value.hero_image && (
          <img src={value.hero_image} alt="preview" className="mt-2.5 w-full max-h-65 object-cover rounded-lg border border-border" />
        )}
        <div className="mt-4">
          {field('Gallery Images', (
            <div className="flex flex-col gap-2">
              {value.gallery_images.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={url}
                    onChange={e => onChange({ gallery_images: value.gallery_images.map((u, j) => j === i ? e.target.value : u) })}
                  />
                  <button type="button" onClick={() => onChange({ gallery_images: value.gallery_images.filter((_, j) => j !== i) })} className="btn-secondary px-3">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => onChange({ gallery_images: [...value.gallery_images, ''] })} className="btn-secondary self-start px-3">+ Add image</button>
            </div>
          ))}
        </div>
      </section>

      {/* Encyclopedia content */}
      <section>
        <h2 className={sectionHeading}>Encyclopedia Content</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {field('Nickname', <input className="input" value={value.nickname ?? ''} onChange={e => onChange({ nickname: e.target.value || null })} />)}
          {field('Desirability Tier', <input className="input" value={value.desirability_tier ?? ''} onChange={e => onChange({ desirability_tier: e.target.value || null })} placeholder="e.g. Blue-chip" />)}
          {field('Designer', <input className="input" value={value.designer ?? ''} onChange={e => onChange({ designer: e.target.value || null })} />)}
          {field('Engine Signature', <input className="input" value={value.engine_signature ?? ''} onChange={e => onChange({ engine_signature: e.target.value || null })} />)}
          {field('Claim to Fame', <input className="input" value={value.claim_to_fame ?? ''} onChange={e => onChange({ claim_to_fame: e.target.value || null })} />)}
          {field('Wikipedia URL', <input className="input" value={value.wikipedia_url ?? ''} onChange={e => onChange({ wikipedia_url: e.target.value || null })} placeholder="https://en.wikipedia.org/..." />)}
        </div>
        {field('Overview', <textarea className="textarea min-h-40" value={value.overview ?? ''} onChange={e => onChange({ overview: e.target.value || null })} placeholder="History, significance, key highlights..." />)}
        <div className="mt-4">{field('Why Collectible', <textarea className="textarea min-h-30" value={value.why_collectible ?? ''} onChange={e => onChange({ why_collectible: e.target.value || null })} />)}</div>
        <div className="mt-4">{field('Variants to Know', <textarea className="textarea min-h-30" value={value.variants_to_know ?? ''} onChange={e => onChange({ variants_to_know: e.target.value || null })} />)}</div>
        <div className="mt-4">{field('Known Issues', <textarea className="textarea min-h-30" value={value.known_issues ?? ''} onChange={e => onChange({ known_issues: e.target.value || null })} />)}</div>
        <div className="mt-4">{field('Buyers Flag', <textarea className="textarea min-h-20" value={value.buyers_flag ?? ''} onChange={e => onChange({ buyers_flag: e.target.value || null })} />)}</div>
        <div className="mt-4">{field('Rivals & Alternatives', <textarea className="textarea min-h-20" value={value.rivals_alternatives ?? ''} onChange={e => onChange({ rivals_alternatives: e.target.value || null })} />)}</div>
      </section>

      {/* Specs */}
      <section>
        <h2 className={sectionHeading}>
          Specs
          <span className="font-normal text-label text-text-tertiary ml-2 normal-case">stored as JSON</span>
        </h2>
        <textarea
          className="textarea min-h-50 font-mono text-xs"
          value={JSON.stringify(value.specs ?? [], null, 2)}
          onChange={e => { try { onChange({ specs: JSON.parse(e.target.value) }) } catch { /* keep typing until valid */ } }}
        />
      </section>

      {/* Market data */}
      <section>
        <h2 className={sectionHeading}>Market Data (USD)</h2>
        <div className="grid grid-cols-3 gap-4">
          {field('Low', <input className="input" type="number" value={value.market_data?.low ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, mid: null, high: null }), low: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('Mid', <input className="input" type="number" value={value.market_data?.mid ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, high: null }), mid: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('High', <input className="input" type="number" value={value.market_data?.high ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, mid: null }), high: e.target.value ? parseInt(e.target.value) : null } })} />)}
        </div>
        <div className="mt-4">
          {field('Notes', <textarea className="textarea min-h-15" value={value.market_data?.notes ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, low: null, mid: null, high: null }), notes: e.target.value || null } })} />)}
        </div>
      </section>

      {/* Resources */}
      <section>
        <h2 className={sectionHeading}>Resources</h2>
        <div className="flex flex-col gap-3">
          {value.resources.map((r, i) => (
            <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
              <input className="input" placeholder="Title" value={r.title} onChange={e => onChange({ resources: value.resources.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
              <input className="input" placeholder="https://..." value={r.url} onChange={e => onChange({ resources: value.resources.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />
              <select className="select" value={r.type} onChange={e => onChange({ resources: value.resources.map((x, j) => j === i ? { ...x, type: e.target.value as ResourceType } : x) })}>
                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button type="button" onClick={() => onChange({ resources: value.resources.filter((_, j) => j !== i) })} className="btn-secondary px-3">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ resources: [...value.resources, { title: '', url: '', type: 'other' }] })} className="btn-secondary self-start px-3">+ Add resource</button>
        </div>
      </section>

      {/* Maintenance */}
      <section>
        <h2 className={sectionHeading}>Maintenance Notes</h2>
        {field('', <textarea className="textarea min-h-30" value={value.maintenance ?? ''} onChange={e => onChange({ maintenance: e.target.value || null })} placeholder="Common issues, parts availability, tips for owners..." />)}
      </section>
    </div>
  )
}
