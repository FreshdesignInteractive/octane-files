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

const field = (label: string, children: React.ReactNode) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
  </div>
)

const sectionHeading = 'text-body font-bold text-text-primary uppercase tracking-widest mb-4 pb-2 border-b border-border'

// The individual sections below (their ids, order, and labels) mirror
// app/cars/[slug]/page.tsx / CarDetailTabs.tsx exactly — but the sticky nav
// only surfaces the public page's 3 top-level tabs, not all 17 individual
// sections; a flat list at that granularity was too much to scan. Each nav
// item jumps to the first section inside that tab's group. Identity &
// Classification and Images are edit-only (no public equivalent — they
// feed the hero/quick-stats/gallery rather than being their own named
// section), so they're bundled into Overview, the first group.
const TABS = [
  { id: 'identity', label: 'Overview' },
  { id: 'driving-character', label: 'The Story' },
  { id: 'collectibility', label: 'Owning One' },
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
      {/* Sticky nav — the public page's 3 tabs, not a flat list of every
          section. scrollbar-hide suppresses the native horizontal scrollbar
          track (the global ::-webkit-scrollbar rule otherwise renders a
          grey bar under this row); the row still scrolls via touch/
          trackpad, only the track's own rendering is hidden. */}
      <nav className="sticky top-14 z-40 bg-white/95 border-b border-border -mx-6 px-6 backdrop-blur-sm">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map(s => (
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
          {field('Units Built', (
            <div className="flex items-center gap-3">
              <input className="input" type="number" value={value.units_produced ?? ''} onChange={e => onChange({ units_produced: e.target.value ? parseInt(e.target.value) : null })} />
              <label className="flex items-center gap-1.5 whitespace-nowrap">
                <input type="checkbox" checked={value.units_produced_estimated} onChange={e => onChange({ units_produced_estimated: e.target.checked })} />
                <span className="text-body text-text-secondary">Estimated figure</span>
              </label>
            </div>
          ))}
        </div>

        {/* Labels match the Distinctions badge names on the public page
            exactly (Legend / Homologation Special / Poster Car). */}
        <div className="flex gap-6 mt-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={value.is_icon} onChange={e => onChange({ is_icon: e.target.checked })} />
            <span className="text-body text-text-secondary">Legend</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={value.homologation_special} onChange={e => onChange({ homologation_special: e.target.checked })} />
            <span className="text-body text-text-secondary">Homologation Special</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={value.poster_car} onChange={e => onChange({ poster_car: e.target.checked })} />
            <span className="text-body text-text-secondary">Poster Car</span>
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
          {/* Same ImageUploadField/Remove image button as Hero above — a
              cleared slot stays in place (empty, no thumbnail) rather than
              collapsing the row, exactly like Hero looks when cleared. The
              array is only compacted (empty slots dropped) at Save time in
              AdminModelForm's save(), which is also the only place any of
              this ever reaches Supabase storage. */}
          {field('Gallery Images', (
            <div className="flex flex-col gap-3">
              {value.gallery_images.map((url, i) => (
                <ImageUploadField
                  key={i}
                  value={url || null}
                  onChange={v => onChange({ gallery_images: value.gallery_images.map((u, j) => j === i ? (v ?? '') : u) })}
                />
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
        {/* Driver / Excellent / Concours — same labels as the public
            page's Price by condition pills, even though the underlying
            columns stay low/mid/high. */}
        <div className="grid grid-cols-4 gap-4">
          {field('Driver', <input className="input" type="number" value={value.market_data?.low ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, mid: null, high: null }), low: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('Excellent', <input className="input" type="number" value={value.market_data?.mid ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, high: null }), mid: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('Concours', <input className="input" type="number" value={value.market_data?.high ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, notes: null, low: null, mid: null }), high: e.target.value ? parseInt(e.target.value) : null } })} />)}
          {field('Values as of', <input className="input" type="date" value={value.market_data?.as_of ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', notes: null, low: null, mid: null, high: null }), as_of: e.target.value || null } })} />)}
        </div>
        <div className="mt-4">
          {field('Notes', <textarea className="textarea min-h-15" value={value.market_data?.notes ?? ''} onChange={e => onChange({ market_data: { ...(value.market_data ?? { currency: 'USD', as_of: null, low: null, mid: null, high: null }), notes: e.target.value || null } })} />)}
        </div>
      </section>

      {/* Buyer's guide — Why it's worth it (claim_to_fame), Callout, What
          to watch for (buyers_flag). Moved out of "Why collectors want
          it" to mirror the public page: these three are now their own
          Buyer's guide section in Overview, right after Market Data. */}
      <section id="buyers-guide">
        <h2 className={sectionHeading}>Buyer&apos;s guide</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {field("Why it's worth it", <input className="input" value={value.claim_to_fame ?? ''} onChange={e => onChange({ claim_to_fame: e.target.value || null })} />)}
          {field('Callout', <input className="input" value={value.callout ?? ''} onChange={e => onChange({ callout: e.target.value || null })} placeholder='One arresting fact, e.g. "Last front-engine Corvette"' />)}
        </div>
        {field('What to watch for', <textarea className="textarea min-h-20" value={value.buyers_flag ?? ''} onChange={e => onChange({ buyers_flag: e.target.value || null })} />)}
      </section>

      {/* Driving Character, Design, Motorsport Pedigree, In Culture — 4
          independent sections, matching the view page's split of what
          used to be one shared "What it's like" section. */}
      <section id="driving-character">
        <h2 className={sectionHeading}>Driving Character</h2>
        {field('', <textarea className="textarea min-h-30" value={value.driving_character ?? ''} onChange={e => onChange({ driving_character: e.target.value || null })} placeholder="Sound signature, party trick, gearbox feel, power delivery" />)}
      </section>

      <section id="design">
        <h2 className={sectionHeading}>Design</h2>
        {field('', <textarea className="textarea min-h-30" value={value.design_notes ?? ''} onChange={e => onChange({ design_notes: e.target.value || null })} placeholder="Design signatures, concept-car lineage, wheel/badge iconography" />)}
      </section>

      <section id="motorsport-pedigree">
        <h2 className={sectionHeading}>Motorsport Pedigree</h2>
        {field('', <textarea className="textarea min-h-30" value={value.motorsport_pedigree ?? ''} onChange={e => onChange({ motorsport_pedigree: e.target.value || null })} placeholder="Race series, championships, signature drivers" />)}
      </section>

      <section id="in-culture">
        <h2 className={sectionHeading}>In Culture</h2>
        {field('', <textarea className="textarea min-h-30" value={value.cultural_notes ?? ''} onChange={e => onChange({ cultural_notes: e.target.value || null })} placeholder="Screen, music, video-game fame" />)}
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

      {/* Why collectors want it — trimmed to just Why Collectible now that
          Callout/Claim to Fame/Buyer's Guide live in their own Buyer's
          guide section above, mirroring the public page's Owning One tab. */}
      <section id="collectibility">
        <h2 className={sectionHeading}>Why collectors want it</h2>
        {field('Why Collectible', <textarea className="textarea min-h-30" value={value.why_collectible ?? ''} onChange={e => onChange({ why_collectible: e.target.value || null })} />)}
      </section>

      {/* Which one to look for — Variants & Trims */}
      <section id="variants-trims">
        <h2 className={sectionHeading}>Which one to look for</h2>
        {field('Variants to Know', <textarea className="textarea min-h-30" value={value.variants_to_know ?? ''} onChange={e => onChange({ variants_to_know: e.target.value || null })} />)}
        <div className="mt-5">
          {field('Trim Records', <TrimsEditor generationId={generationId} trims={trims} onChange={onTrimsChange} />)}
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
