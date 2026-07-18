'use client'

import {
  CAR_CLASSES, BODY_STYLES, DRIVETRAIN_TYPES, RESOURCE_TYPES,
  ENGINE_LAYOUTS, DESIRABILITY_TIERS, VALUE_TRAJECTORIES, RADAR_AXES,
  type GenerationInput, type BodyStyle, type DrivetrainType, type ResourceType,
  type TrimInput, type CarRelationInput,
} from '@/lib/car-schema'
import DesignerAutocomplete from '@/components/DesignerAutocomplete'
import ImageUploadField from '@/components/ImageUploadField'
import TrimsEditor from '@/components/TrimsEditor'
import CarRelationsEditor from '@/components/CarRelationsEditor'
import { deleteCarImageIfOwned } from '@/lib/storage-cleanup'

const field = (label: string, children: React.ReactNode) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
  </div>
)

const sectionHeading = 'text-body font-bold text-text-primary uppercase tracking-widest mb-4 pb-2 border-b border-border'

// Canonical section list — identical ids and order to app/cars/[slug]/page.tsx,
// so the sticky nav below and every <section id="..."> exactly mirror the
// public page. Identity & Classification and Images are edit-only (they
// feed the hero/quick-stats/gallery on view rather than being their own
// named public section).
const SECTIONS = [
  { id: 'identity', label: 'Identity & Classification' },
  { id: 'images', label: 'Images' },
  { id: 'introduction', label: 'Introduction' },
  { id: 'collectibility', label: 'Why collectors want it' },
  { id: 'ratings', label: 'How it scores' },
  { id: 'variants-trims', label: 'Which one to look for' },
  { id: 'character', label: "What it's like" },
  { id: 'lineage', label: 'Where it comes from' },
  { id: 'rivals', label: 'Rivals' },
  { id: 'market-data', label: 'Market Data' },
  { id: 'known-issues', label: 'What owning one is like' },
  { id: 'upkeep-parts', label: 'Upkeep & Parts' },
  { id: 'resources', label: 'Resources' },
] as const

// Shared by the existing-generation editor and the new-car create flow.
// Deliberately does NOT render `slug` — each parent owns that field's own
// display-vs-advanced-edit behavior around this component.
export default function GenerationFieldsEditor({
  value, onChange, generationId, trims, onTrimsChange, relations, onRelationsChange,
}: {
  value: GenerationInput
  onChange: (updates: Partial<GenerationInput>) => void
  generationId: string | undefined
  trims: TrimInput[]
  onTrimsChange: (trims: TrimInput[]) => void
  relations: CarRelationInput[]
  onRelationsChange: (relations: CarRelationInput[]) => void
}) {
  function toggleArrayValue<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Sticky section nav — same list/order as the public page */}
      <nav className="sticky top-14 z-40 bg-white/95 border-b border-border -mx-6 px-6 backdrop-blur-sm">
        <div className="flex gap-0 overflow-x-auto">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="text-xs font-medium text-text-secondary no-underline px-4 py-3 border-b-2 border-transparent whitespace-nowrap transition-colors hover:text-text-primary">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Identity & Classification */}
      <section id="identity">
        <h2 className={sectionHeading}>Identity &amp; Classification</h2>
        <div className="grid grid-cols-3 gap-4">
          {field('Generation Code', <input className="input" value={value.code} onChange={e => onChange({ code: e.target.value })} placeholder="e.g. E30, Single Generation" />)}
          {field('Year Start', <input className="input" type="number" value={value.year_start} onChange={e => onChange({ year_start: parseInt(e.target.value) || 0 })} />)}
          {field('Year End', <input className="input" type="number" value={value.year_end ?? ''} onChange={e => onChange({ year_end: e.target.value ? parseInt(e.target.value) : null })} placeholder="leave blank if present" />)}
          {field('Production Years (display)', <input className="input" value={value.production_years ?? ''} onChange={e => onChange({ production_years: e.target.value || null })} placeholder="auto-derived if left blank" />)}
          {field('Nickname', <input className="input" value={value.nickname ?? ''} onChange={e => onChange({ nickname: e.target.value || null })} />)}
          {field('Designer', <DesignerAutocomplete value={value.designer} onChange={v => onChange({ designer: v })} />)}
          {field('Wikipedia URL', <input className="input" value={value.wikipedia_url ?? ''} onChange={e => onChange({ wikipedia_url: e.target.value || null })} placeholder="https://en.wikipedia.org/..." />)}
          {field('Engine', <input className="input" value={value.engine_signature ?? ''} onChange={e => onChange({ engine_signature: e.target.value || null })} />)}
          {field('Transmission', <input className="input" value={value.transmission ?? ''} onChange={e => onChange({ transmission: e.target.value || null })} placeholder="e.g. 2-speed Powerglide automatic, 3-speed manual, 4-speed manual" />)}
          {field('Class',
            <select className="select" value={value.class} onChange={e => onChange({ class: e.target.value as GenerationInput['class'] })}>
              {CAR_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
          {field('Units Produced', (
            <div className="flex items-center gap-3">
              <input className="input" type="number" value={value.units_produced ?? ''} onChange={e => onChange({ units_produced: e.target.value ? parseInt(e.target.value) : null })} />
              <label className="flex items-center gap-1.5 whitespace-nowrap">
                <input type="checkbox" checked={value.units_produced_estimated} onChange={e => onChange({ units_produced_estimated: e.target.checked })} />
                <span className="text-body text-text-secondary">Estimated figure</span>
              </label>
            </div>
          ))}
        </div>

        <div className="flex gap-6 mt-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={value.is_icon} onChange={e => onChange({ is_icon: e.target.checked })} />
            <span className="text-body text-text-secondary">Legend</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={value.homologation_special} onChange={e => onChange({ homologation_special: e.target.checked })} />
            <span className="text-body text-text-secondary">Homologation special</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={value.poster_car} onChange={e => onChange({ poster_car: e.target.checked })} />
            <span className="text-body text-text-secondary">Poster car</span>
          </label>
        </div>

        <div className="mt-4">
          {field('Body Styles', (
            <div className="flex flex-wrap gap-2">
              {BODY_STYLES.map(style => (
                <label key={style} className={`pill ${value.body_styles.includes(style) ? 'pill-active' : ''}`}>
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

        {/* Engine Layout and Drivetrain stay two separate enum inputs (they
            validate independently), but grouped under one sub-heading so
            this mirrors the public page's combined "Layout" row. */}
        <div className="mt-6">
          <div className="text-label font-bold tracking-widest text-text-tertiary uppercase mb-3">Layout</div>
          <div className="grid grid-cols-3 gap-4">
            {field('Engine Layout',
              <select className="select" value={value.engine_layout ?? ''} onChange={e => onChange({ engine_layout: (e.target.value || null) as GenerationInput['engine_layout'] })}>
                <option value="">—</option>
                {ENGINE_LAYOUTS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
          </div>
          <div className="mt-4">
            {field('Drivetrain', (
              <div className="flex flex-wrap gap-2">
                {DRIVETRAIN_TYPES.map(dt => (
                  <label key={dt} className={`pill ${value.drivetrain.includes(dt) ? 'pill-active' : ''}`}>
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
        </div>
      </section>

      {/* Images */}
      <section id="images">
        <h2 className={sectionHeading}>Images</h2>
        {field('Hero Image',
          <ImageUploadField
            value={value.hero_image}
            onChange={v => onChange({ hero_image: v })}
          />
        )}
        <div className="mt-5">
          {field('Gallery Images', (
            <div className="flex flex-col gap-3">
              {value.gallery_images.map((url, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <ImageUploadField
                      value={url}
                      onChange={v => onChange({ gallery_images: value.gallery_images.map((u, j) => j === i ? (v ?? '') : u) })}
                      showRemoveButton={false}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      deleteCarImageIfOwned(url)
                      onChange({ gallery_images: value.gallery_images.filter((_, j) => j !== i) })
                    }}
                    className="btn-secondary px-3"
                  >Remove</button>
                </div>
              ))}
              {value.gallery_images.length === 0 && (
                <p className="text-label text-text-tertiary italic">
                  No gallery images. Add some via Attach images above.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Introduction */}
      <section id="introduction">
        <h2 className={sectionHeading}>Introduction</h2>
        {field('', <textarea className="textarea min-h-40" value={value.introduction ?? ''} onChange={e => onChange({ introduction: e.target.value || null })} placeholder="History, significance, key highlights..." />)}
      </section>

      {/* Why collectors want it */}
      <section id="collectibility">
        <h2 className={sectionHeading}>Why collectors want it</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {field('Callout', <input className="input" value={value.callout ?? ''} onChange={e => onChange({ callout: e.target.value || null })} placeholder='One arresting fact, e.g. "Last front-engine Corvette"' />)}
          {field('Claim to Fame', <input className="input" value={value.claim_to_fame ?? ''} onChange={e => onChange({ claim_to_fame: e.target.value || null })} />)}
        </div>
        {field('Why Collectible', <textarea className="textarea min-h-30" value={value.why_collectible ?? ''} onChange={e => onChange({ why_collectible: e.target.value || null })} />)}
        <div className="mt-4">{field("Buyer's Guide", <textarea className="textarea min-h-20" value={value.buyers_flag ?? ''} onChange={e => onChange({ buyers_flag: e.target.value || null })} />)}</div>
      </section>

      {/* The scorecard */}
      <section id="ratings">
        <h2 className={sectionHeading}>
          The scorecard
          <span className="font-normal text-label text-text-tertiary ml-2 normal-case">Rated 1 to 10 on the traits that matter for owning, driving, and holding on to a car like this.</span>
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
          {RADAR_AXES.map(axis => (
            <div key={axis.key} className="flex items-center gap-4">
              <label className="field-label w-45 flex-shrink-0">{axis.label}</label>
              <input
                type="range" min={1} max={10} step={1}
                value={value.radar_scores?.[axis.key] ?? 5}
                onChange={e => onChange({ radar_scores: { ...(value.radar_scores ?? {}), [axis.key]: parseInt(e.target.value) } })}
                className="flex-1"
              />
              <span className="text-body font-medium text-text-primary w-6 text-right">{value.radar_scores?.[axis.key] ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* Electronic dependence — not a 1-10 rated trait like the axes
            above, so it's deliberately outside the "Rated 1 to 10..."
            one-liner. Reuses the same range-slider control as the radar
            axes rather than a new component; only the two ends are
            labeled — naming the middle 3 stops reintroduces the false-
            precision problem this replaced Analog Index to fix. */}
        <div className="flex items-center gap-4 mb-2">
          <label className="field-label w-45 flex-shrink-0">Electronic dependence</label>
          <input
            type="range" min={1} max={5} step={1}
            value={value.electronic_dependence ?? 3}
            onChange={e => onChange({ electronic_dependence: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-body font-medium text-text-primary w-6 text-right">{value.electronic_dependence ?? '—'}</span>
        </div>
        <div className="flex justify-between text-label text-text-tertiary ml-49 mr-10 mb-4">
          <span>Fully analog</span>
          <span>Heavily electronic</span>
        </div>
        {field('Why this position', <textarea className="textarea min-h-20" value={value.electronic_dependence_notes ?? ''} onChange={e => onChange({ electronic_dependence_notes: e.target.value || null })} placeholder="The specific mechanical/electrical facts that put it here — not a restatement of the position." />)}
        {/* UI nudge, not a hard block — matches every other field in this
            form being freely saveable at any completeness. A position with
            no note still saves, it just won't render on the public page
            (see the render condition in app/cars/[slug]/page.tsx). */}
        {value.electronic_dependence !== null && !value.electronic_dependence_notes && (
          <p className="text-label text-accent-secondary mt-2">
            A position without a note won&apos;t render on the public page — add the reasoning above.
          </p>
        )}
      </section>

      {/* Which one to look for — Variants & Trims */}
      <section id="variants-trims">
        <h2 className={sectionHeading}>Which one to look for</h2>
        {field('Variants to Know', <textarea className="textarea min-h-30" value={value.variants_to_know ?? ''} onChange={e => onChange({ variants_to_know: e.target.value || null })} />)}
        <div className="mt-5">
          {field('Trim Records', <TrimsEditor generationId={generationId} trims={trims} onChange={onTrimsChange} />)}
        </div>
      </section>

      {/* What it's like — Character */}
      <section id="character">
        <h2 className={sectionHeading}>What it&apos;s like</h2>
        {field('Driving Character', <textarea className="textarea min-h-30" value={value.driving_character ?? ''} onChange={e => onChange({ driving_character: e.target.value || null })} placeholder="Sound signature, party trick, gearbox feel, power delivery" />)}
        <div className="mt-4">{field('Design', <textarea className="textarea min-h-30" value={value.design_notes ?? ''} onChange={e => onChange({ design_notes: e.target.value || null })} placeholder="Design signatures, concept-car lineage, wheel/badge iconography" />)}</div>
        <div className="mt-4">{field('Motorsport Pedigree', <textarea className="textarea min-h-30" value={value.motorsport_pedigree ?? ''} onChange={e => onChange({ motorsport_pedigree: e.target.value || null })} placeholder="Race series, championships, signature drivers" />)}</div>
        <div className="mt-4">{field('In Culture', <textarea className="textarea min-h-30" value={value.cultural_notes ?? ''} onChange={e => onChange({ cultural_notes: e.target.value || null })} placeholder="Screen, music, video-game fame" />)}</div>
      </section>

      {/* Where it comes from — Lineage */}
      <section id="lineage">
        <h2 className={sectionHeading}>Where it comes from</h2>
        <CarRelationsEditor generationId={generationId} type="related" relations={relations} onChange={onRelationsChange} />
      </section>

      {/* Rivals */}
      <section id="rivals">
        <h2 className={sectionHeading}>Rivals</h2>
        <CarRelationsEditor generationId={generationId} type="rival" relations={relations} onChange={onRelationsChange} />
      </section>

      {/* Market Data */}
      <section id="market-data">
        <h2 className={sectionHeading}>Market Data</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {field('Desirability Tier',
            <select className="select" value={value.desirability_tier ?? ''} onChange={e => onChange({ desirability_tier: (e.target.value || null) as GenerationInput['desirability_tier'] })}>
              <option value="">—</option>
              {DESIRABILITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {field('Value Trajectory',
            <select className="select" value={value.value_trajectory ?? ''} onChange={e => onChange({ value_trajectory: (e.target.value || null) as GenerationInput['value_trajectory'] })}>
              <option value="">—</option>
              {VALUE_TRAJECTORIES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          )}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {field('Low', <input className="input" type="number" value={value.market_data?.low ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, mid: null, high: null }), low: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('Mid', <input className="input" type="number" value={value.market_data?.mid ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, high: null }), mid: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('High', <input className="input" type="number" value={value.market_data?.high ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, mid: null }), high: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('Values as of', <input className="input" type="date" value={value.market_data?.as_of ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', notes: null, low: null, mid: null, high: null }), as_of: e.target.value || null } })} />)}
        </div>
        <div className="mt-4">
          {field('Notes', <textarea className="textarea min-h-15" value={value.market_data?.notes ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, low: null, mid: null, high: null }), notes: e.target.value || null } })} />)}
        </div>
      </section>

      {/* What owning one is like — Known Issues */}
      <section id="known-issues">
        <h2 className={sectionHeading}>What owning one is like</h2>
        {field('', <textarea className="textarea min-h-30" value={value.known_issues ?? ''} onChange={e => onChange({ known_issues: e.target.value || null })} />)}
      </section>

      {/* Upkeep & Parts — Maintenance */}
      <section id="upkeep-parts">
        <h2 className={sectionHeading}>Upkeep &amp; Parts</h2>
        {field('', <textarea className="textarea min-h-30" value={value.maintenance ?? ''} onChange={e => onChange({ maintenance: e.target.value || null })} placeholder="Common issues, parts availability, tips for owners..." />)}
      </section>

      {/* Resources */}
      <section id="resources">
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
    </div>
  )
}
