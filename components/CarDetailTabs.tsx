import CarCard from '@/components/CarCard'
import { RADAR_AXES, DESIRABILITY_TIERS, VALUE_TRAJECTORIES } from '@/lib/car-schema'
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
      <h2 className="text-lg font-bold text-text-primary tracking-tight mb-5">{label}</h2>
      {children}
    </section>
  )
}

// label is optional — Introduction omits it deliberately (its text sits
// directly under the "Overview" tab heading with no sub-heading of its
// own), everything else still passes one. The field itself keeps its
// label in the database, edit page, and CSV — this only hides it here.
function FieldSection({ id, label, first, children }: { id: string; label?: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className={`scroll-mt-40 ${first ? '' : 'border-t border-border pt-8 mt-8'}`}>
      {label && <h3 className="text-sm font-bold text-text-primary tracking-tight mb-4">{label}</h3>}
      {children}
    </div>
  )
}

// Marks the selected step in the Desirability Tier / Value Trajectory rows
// below — shown alongside the trajectory arrow (↗/→/↘) rather than
// replacing it, since the arrow encodes real direction info distinct from
// "this is the car's actual value," not just a selection indicator.
function SelectedCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="currentColor" className="text-white" />
      <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
    </svg>
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

// Fixed site copy, not per-car data — same definition for every car that
// earns a given distinction, so this lives in code rather than as
// per-row DB text (mirrors DESIRABILITY_TIER_DEFINITIONS below). Icons are
// stroked white to sit inside a filled accent circle (see the Distinctions
// FieldSection) rather than the plain currentColor-stroke style the
// sidebar's fact-row icons use.
const DISTINCTIONS: { key: 'is_icon' | 'homologation_special' | 'poster_car'; name: string; definition: string; icon: React.ReactNode }[] = [
  {
    key: 'is_icon',
    name: 'Legend',
    definition: 'A car that transcended the hobby, known far beyond the people who drive them.',
    icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  },
  {
    key: 'homologation_special',
    name: 'Homologation Special',
    definition: 'Built for the road only because racing rules demanded it.',
    icon: (
      <>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </>
    ),
  },
  {
    key: 'poster_car',
    name: 'Poster Car',
    definition: 'The car on the bedroom wall, the one people dreamed about before they could drive.',
    icon: (
      <>
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </>
    ),
  },
]

const VALUE_TRAJECTORY_DISPLAY: Record<string, string> = {
  appreciating: '↗ Appreciating',
  stable: '→ Stable',
  cooling: '↘ Cooling',
}

// Fixed site copy, not per-car data — same definition for every car with a
// given tier/trajectory, rendered visibly next to the pill (not a hover
// tooltip) in the Collector Status block below, same pattern as
// DISTINCTIONS above.
const DESIRABILITY_TIER_DEFINITIONS: Record<string, string> = {
  'Blue-chip': 'The proven elite. Values are established, liquid, and defended at every auction.',
  'High': 'Strong, sustained collector demand. Good examples never wait long for a buyer.',
  'Solid': 'A dependable market. Well-kept cars hold their value and find ready buyers.',
  'Entry': 'The accessible way in. Prices still forgive mistakes, and the upside is real.',
}

const VALUE_TRAJECTORY_DEFINITIONS: Record<string, string> = {
  appreciating: 'Values are climbing. The market wants more of these than exist.',
  stable: 'Values are holding steady. What you pay today is what it\'s worth tomorrow.',
  cooling: 'Values are softening. Patience buys better cars for less.',
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
  const earnedDistinctions = DISTINCTIONS.filter(d => car[d.key])
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
        <FieldSection id="introduction" first>
          <div className="max-w-170">
            {car.introduction ? renderText(car.introduction) : <Unavailable />}
          </div>
        </FieldSection>

        {/* Distinctions — an explicit exception to "sections always render":
            a car with none of the three flags set omits this FieldSection
            entirely rather than showing an empty/Unavailable state, since
            "no distinctions" isn't missing data, it's just the normal case
            for most cars in the catalog. */}
        {earnedDistinctions.length > 0 && (
          <FieldSection id="distinctions" label="Distinctions">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {earnedDistinctions.map(d => (
                <div key={d.key} className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {d.icon}
                    </svg>
                  </span>
                  <div>
                    <div className="text-body font-semibold text-text-primary mb-0.5">{d.name}</div>
                    <div className="text-body text-text-secondary leading-relaxed">{d.definition}</div>
                  </div>
                </div>
              ))}
            </div>
          </FieldSection>
        )}

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
              {car.desirability_tier && (
                <div className="mb-5">
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-1.5">Desirability Tier</div>
                  <div className="flex gap-2 flex-wrap">
                    {DESIRABILITY_TIERS.map(tier => (
                      <span key={tier} className={tier === car.desirability_tier ? 'pill pill-active gap-1.5' : 'pill'}>
                        {tier === car.desirability_tier && <SelectedCheck />}
                        {tier}
                      </span>
                    ))}
                  </div>
                  <p className="text-body text-text-secondary leading-relaxed mt-3 m-0">
                    {DESIRABILITY_TIER_DEFINITIONS[car.desirability_tier]}
                  </p>
                </div>
              )}
              {car.value_trajectory && (
                <div className="mb-5">
                  <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-1.5">Value Trajectory</div>
                  <div className="flex gap-2 flex-wrap">
                    {VALUE_TRAJECTORIES.map(t => (
                      <span key={t.value} className={t.value === car.value_trajectory ? 'pill pill-active gap-1.5' : 'pill'}>
                        {t.value === car.value_trajectory && <SelectedCheck />}
                        {VALUE_TRAJECTORY_DISPLAY[t.value]}
                      </span>
                    ))}
                  </div>
                  <p className="text-body text-text-secondary leading-relaxed mt-3 m-0">
                    {VALUE_TRAJECTORY_DEFINITIONS[car.value_trajectory]}
                  </p>
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
