import CarCard from '@/components/CarCard'
import { RADAR_AXES } from '@/lib/car-schema'
import type { Car, CarRelation } from '@/lib/types'

const NA = '—'

function formatMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

// Every section/stat always renders now — never conditionally hidden — so
// this is the one, single fallback used wherever a given car just doesn't
// have that data yet, instead of each section inventing its own wording.
function Unavailable() {
  return <p className="text-body text-text-tertiary m-0">Data unavailable</p>
}

// scroll-mt-40 (160px) clears the sticky header (h-14, 56px) + the sticky
// tab nav below it (h-16, plus its own pb-4) so a click or deep-linked hash
// lands with the heading visible below both, not hidden underneath.
//
// Two heading tiers: TabSection is the big, "main" heading (text-lg — the
// same size every section heading used before fields were grouped under
// tabs) marking where each of the 3 tabs' content begins — this is what
// the nav below scrolls/spies on. FieldSection is the individual field
// inside it (Introduction, The scorecard, Rivals, etc.) — smaller
// (text-sm) since the tab heading is now the one "main" title on the page,
// everything else is a sub-heading under it. All three tabs' content is
// always in the DOM, one continuous scroll — clicking a tab in the nav
// just scrolls to it, the same plain-anchor behavior every section on this
// page has always had.
function TabSection({ id, label, first, children }: { id: string; label: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-40 ${first ? 'mt-6' : 'border-t border-border pt-10 mt-10'}`}>
      <h2 className="text-lg font-bold text-text-primary tracking-tight mb-6">{label}</h2>
      {children}
    </section>
  )
}

function FieldSection({ id, label, first, children }: { id: string; label: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className={`scroll-mt-40 ${first ? '' : 'border-t border-border pt-8 mt-8'}`}>
      <h3 className="text-sm font-bold text-text-primary tracking-tight mb-4">{label}</h3>
      {children}
    </div>
  )
}

// Shared by the Lineage and Rivals sections — identical CarCard grid, only
// the entries differ. Same card component Browse/Garage use; a relation
// with no linked catalog row (a free-text entry) renders CarCard's
// title-only, "Data unavailable" variant instead.
function RelationCards({ entries }: { entries: CarRelation[] }) {
  return (
    <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
      {entries.map(r => (
        <CarCard key={r.id} car={r.linked ?? { title: r.label_text ?? 'Unknown' }} />
      ))}
    </div>
  )
}

const VALUE_TRAJECTORY_DISPLAY: Record<string, string> = {
  appreciating: '↗ Appreciating',
  stable: '→ Stable',
  cooling: '↘ Cooling',
}

// Fixed UI copy, not per-car data — same one-liner for every car with a
// given tier/trajectory, so this lives in code (shown as a title tooltip
// on the badge) rather than as a DB column that would just repeat itself
// across ~217 rows.
const DESIRABILITY_TIER_EXPLAINER: Record<string, string> = {
  'Blue-chip': 'Established at the top of the market. Values are set by rarity and provenance, not condition alone.',
  'High': 'Strongly desirable and well-established, below the very top tier.',
  'Solid': 'Genuinely collectible with a real following; accessible entry to the hobby.',
  'Entry': 'The affordable way in. Values driven by condition more than scarcity.',
}

const VALUE_TRAJECTORY_EXPLAINER: Record<string, string> = {
  appreciating: 'Values are rising.',
  stable: 'Values have plateaued and are holding.',
  cooling: 'Values are softening from a recent high.',
}

// Parse newlines in text
function renderText(text: string) {
  return text.split('\n\n').map((para, i) => {
    if (para.startsWith('**')) {
      const [boldPart, ...rest] = para.split('**').filter(Boolean)
      return (
        <p key={i} className="prose">
          <strong>{boldPart.replace(/\*\*/g, '')}</strong>
          {rest.join('')}
        </p>
      )
    }
    return <p key={i} className="leading-relaxed text-text-secondary mb-5">{para}</p>
  })
}

// Exported so the page can render the nav itself, outside the two-column
// grid CarDetailTabs' own content sits in — the nav needs to span the full
// page container width (matching the hero image above), which the grid's
// "1fr" content column alone can never reach past the sidebar column.
export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'the-story', label: 'The Story' },
  { id: 'owning-one', label: 'Owning One' },
]

export default function CarDetailTabs({ car }: { car: Car }) {
  const hasCollectibility = !!(car.callout || car.claim_to_fame || car.why_collectible || car.buyers_flag)
  // A position with no note counts the same as unset here too, not just in
  // the row's own render check below — an unexplained Electronic Dependence
  // shouldn't be the sole reason this section reports "has ratings."
  const hasRatings = (car.electronic_dependence !== null && !!car.electronic_dependence_notes)
    || !!(car.radar_scores && Object.keys(car.radar_scores).length > 0)
  const hasVariantsTrims = !!car.variants_to_know || car.trims?.length > 0
  const hasCharacter = !!(car.driving_character || car.design_notes || car.motorsport_pedigree || car.cultural_notes)
  const hasMarketSection = !!(car.market_data || car.desirability_tier || car.value_trajectory)
  const relatedCars = car.relations?.filter(r => r.relation_type === 'related') ?? []
  const rivalCars = car.relations?.filter(r => r.relation_type === 'rival') ?? []
  const marketTiers = [
    car.market_data?.low != null && { label: 'Entry / Driver', value: car.market_data.low },
    car.market_data?.mid != null && { label: 'Mid / Nice', value: car.market_data.mid },
    car.market_data?.high != null && { label: 'Show / Concours', value: car.market_data.high },
  ].filter(Boolean) as { label: string; value: number }[]

  return (
    <div>
      <TabSection id="overview" label="Overview" first>
        <FieldSection id="introduction" label="Introduction" first>
          <div className="max-w-170">
            {car.introduction ? renderText(car.introduction) : <Unavailable />}
          </div>
        </FieldSection>

        {/* The scorecard — 7 radar axes as bars, then Electronic Dependence
            as a position-on-a-spectrum control below a divider. All 7 axes
            always render (label + track); one with no score just stays an
            empty grey track with a — value, never a fabricated zero. */}
        <FieldSection id="ratings" label="The scorecard">
          {hasRatings ? (
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-body text-text-tertiary mb-4">Rated 1 to 10 on the traits that matter for owning, driving, and holding on to a car like this.</p>
                <div className="flex flex-col gap-4">
                  {RADAR_AXES.map(axis => {
                    const score = car.radar_scores?.[axis.key] ?? null
                    return (
                      <div key={axis.key} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                        <div className="w-45 shrink-0 text-body text-text-secondary">{axis.label}</div>
                        <div className="flex-1 flex items-center gap-4">
                          <div className="flex-1 h-2 rounded-full bg-border-mid overflow-hidden">
                            {score !== null && (
                              <div className="h-full rounded-full bg-accent-secondary" style={{ width: `${score * 10}%` }} />
                            )}
                          </div>
                          <div className="w-12 shrink-0 text-right text-body text-text-tertiary">
                            {score !== null ? `${score}/10` : NA}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Electronic dependence — a position on a spectrum, not a
                  rated amount, so the track is a plain line (no fill) with
                  tick marks and a single dot, not a progress bar. A
                  position with no note renders as unscored, same as fully
                  null — an unexplained position is exactly the failure
                  mode this design exists to avoid (the admin form nudges
                  toward always pairing the two). */}
              <div className="pt-8 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4">
                  <div className="w-45 shrink-0 text-body text-text-secondary">Electronic dependence</div>
                  {car.electronic_dependence !== null && car.electronic_dependence_notes ? (
                    <div className="flex-1">
                      <div className="relative h-px bg-border-mid mt-3 mb-2">
                        {[1, 2, 3, 4, 5].map(pos => (
                          <span
                            key={pos}
                            className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-border-mid -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${((pos - 1) / 4) * 100}%` }}
                          />
                        ))}
                        <span
                          className="absolute top-1/2 w-3 h-3 rounded-full bg-accent-secondary -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${((car.electronic_dependence - 1) / 4) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-label text-text-tertiary">
                        <span>Fully analog</span>
                        <span>Heavily electronic</span>
                      </div>
                      <p className="text-body text-text-secondary leading-relaxed mt-3 m-0">{car.electronic_dependence_notes}</p>
                    </div>
                  ) : (
                    <div className="flex-1 text-body text-text-tertiary">{NA}</div>
                  )}
                </div>
              </div>
            </div>
          ) : <Unavailable />}
        </FieldSection>

        {/* Market Data */}
        <FieldSection id="market-data" label="Market Data">
          {hasMarketSection ? (
            <>
              {(car.desirability_tier || car.value_trajectory) && (
                <div className="mb-5">
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-1.5">Collector Status</div>
                  <div className="flex gap-3">
                    {car.desirability_tier && (
                      <span className="pill pill-active" title={DESIRABILITY_TIER_EXPLAINER[car.desirability_tier]}>
                        {car.desirability_tier}
                      </span>
                    )}
                    {car.value_trajectory && (
                      <span className="pill" title={VALUE_TRAJECTORY_EXPLAINER[car.value_trajectory]}>
                        {VALUE_TRAJECTORY_DISPLAY[car.value_trajectory]}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {marketTiers.length > 0 && (
                <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] max-w-120 mb-5">
                  {marketTiers.map(tier => (
                    <div key={tier.label} className="stat-cell">
                      <div className="text-micro font-semibold tracking-widest text-text-tertiary uppercase mb-1.5">
                        {tier.label}
                      </div>
                      <div className="text-xl font-semibold text-accent-secondary tracking-heading">
                        {formatMoney(tier.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {car.market_data?.notes && (
                <p className="text-body text-text-secondary leading-relaxed max-w-150">
                  {car.market_data.notes}
                </p>
              )}
              {car.market_data?.as_of && (
                <p className="text-label text-text-tertiary mt-2">
                  Values as of {new Date(car.market_data.as_of).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}.
                </p>
              )}
            </>
          ) : <Unavailable />}
        </FieldSection>
      </TabSection>

      <TabSection id="the-story" label="The Story">
        {/* What it's like — Character */}
        <FieldSection id="character" label="What it's like" first>
          {hasCharacter ? (
            <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
              {car.driving_character && (
                <div>
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-3">Driving Character</div>
                  <p className="text-body text-text-secondary leading-relaxed m-0">{car.driving_character}</p>
                </div>
              )}
              {car.design_notes && (
                <div>
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-3">Design</div>
                  <p className="text-body text-text-secondary leading-relaxed m-0">{car.design_notes}</p>
                </div>
              )}
              {car.motorsport_pedigree && (
                <div>
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-3">Motorsport Pedigree</div>
                  <p className="text-body text-text-secondary leading-relaxed m-0">{car.motorsport_pedigree}</p>
                </div>
              )}
              {car.cultural_notes && (
                <div>
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-3">In Culture</div>
                  <p className="text-body text-text-secondary leading-relaxed m-0">{car.cultural_notes}</p>
                </div>
              )}
            </div>
          ) : <Unavailable />}
        </FieldSection>

        {/* Where it comes from — Lineage */}
        <FieldSection id="lineage" label="Where it comes from">
          {relatedCars.length > 0 ? <RelationCards entries={relatedCars} /> : <Unavailable />}
        </FieldSection>

        {/* Rivals */}
        <FieldSection id="rivals" label="Rivals">
          {rivalCars.length > 0 ? <RelationCards entries={rivalCars} /> : <Unavailable />}
        </FieldSection>
      </TabSection>

      <TabSection id="owning-one" label="Owning One">
        {/* Why collectors want it */}
        <FieldSection id="collectibility" label="Why collectors want it" first>
          {hasCollectibility ? (
            <>
              {(car.callout || car.claim_to_fame) && (
                <div className="flex gap-8 flex-wrap mb-5">
                  {car.callout && (
                    <div>
                      <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-1.5">Callout</div>
                      <span className="text-label font-semibold uppercase tracking-wide text-accent bg-accent-subtle px-3 py-1.5 rounded-full border border-accent-border">
                        {car.callout}
                      </span>
                    </div>
                  )}
                  {car.claim_to_fame && (
                    <div>
                      <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-1.5">Claim to Fame</div>
                      <span className="text-label font-semibold uppercase tracking-wide text-accent bg-accent-subtle px-3 py-1.5 rounded-full border border-accent-border">
                        {car.claim_to_fame}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {car.why_collectible && (
                <div className="max-w-170">
                  {renderText(car.why_collectible)}
                </div>
              )}
              {car.buyers_flag && (
                <div className="mt-6 max-w-170 p-4 rounded-lg border border-accent-secondary-border bg-accent-secondary-subtle">
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-1.5">Buyer&apos;s Guide</div>
                  <p className="text-body text-text-secondary m-0">{car.buyers_flag}</p>
                </div>
              )}
            </>
          ) : <Unavailable />}
        </FieldSection>

        {/* Which one to look for — variants + trims */}
        <FieldSection id="variants-trims" label="Which one to look for">
          {hasVariantsTrims ? (
            <>
              {car.variants_to_know && (
                <p className="text-body text-text-secondary leading-relaxed max-w-170 mb-6">
                  {car.variants_to_know}
                </p>
              )}
              {car.trims?.length > 0 && (
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                  {car.trims.map(t => (
                    <div key={t.name} className="stat-cell">
                      <div className="text-sm font-medium text-text-primary">
                        {t.name}{t.years && <span className="text-text-tertiary font-normal"> · {t.years}</span>}
                      </div>
                      {t.description && <p className="text-label text-text-secondary mt-1 m-0">{t.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <Unavailable />}
        </FieldSection>

        {/* What owning one is like — Known Issues */}
        <FieldSection id="known-issues" label="What owning one is like">
          {car.known_issues ? (
            <p className="text-body text-text-secondary leading-relaxed max-w-170 m-0">{car.known_issues}</p>
          ) : <Unavailable />}
        </FieldSection>

        {/* Upkeep & Parts — Maintenance */}
        <FieldSection id="upkeep-parts" label="Upkeep & Parts">
          {car.maintenance ? (
            <div className="max-w-170 prose">
              {renderText(car.maintenance)}
            </div>
          ) : <Unavailable />}
        </FieldSection>

        {/* Resources */}
        <FieldSection id="resources" label="Resources">
          {car.resources?.length > 0 ? (
            <div className="flex flex-col gap-2 max-w-120">
              {car.resources.map(r => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3 bg-white border border-border rounded-lg no-underline transition-colors gap-3">
                  <div>
                    <div className="text-body font-medium text-text-primary">{r.title}</div>
                    <div className="text-label text-text-tertiary capitalize mt-0.5">{r.type}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-tertiary" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>
          ) : <Unavailable />}
        </FieldSection>
      </TabSection>
    </div>
  )
}
