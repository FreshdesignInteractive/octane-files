'use client'

import { useEffect, useRef, useState } from 'react'
import OverflowNav from '@/components/OverflowNav'
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
// tab bar below it (h-14/56px + its own pb-4/16px) so a deep-linked section
// hash lands with the section's own heading visible below both, not hidden
// underneath. `first` drops the top divider/spacing that every other
// section in the tab gets — matches how the very first section on the page
// used to render before tabs existed.
function Section({ id, label, first, children }: { id: string; label: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-40 ${first ? 'mt-6' : 'border-t border-border pt-10 mt-10'}`}>
      <h2 className="text-lg font-bold text-text-primary tracking-tight mb-6">{label}</h2>
      {children}
    </section>
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

type TabId = 'overview' | 'the-story' | 'owning-one'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'the-story', label: 'The Story' },
  { id: 'owning-one', label: 'Owning One' },
]

// Every section id maps to exactly one tab — resolves a deep link to a
// specific section (e.g. #rivals) into which tab must be selected first,
// so old section-level links (shared before tabs existed) keep working.
const SECTION_TO_TAB: Record<string, TabId> = {
  overview: 'overview', ratings: 'overview', 'market-data': 'overview',
  character: 'the-story', lineage: 'the-story', rivals: 'the-story',
  collectibility: 'owning-one', 'variants-trims': 'owning-one', 'known-issues': 'owning-one',
  'upkeep-parts': 'owning-one', resources: 'owning-one',
}

function isTabId(id: string): id is TabId {
  return TABS.some(t => t.id === id)
}

export default function CarDetailTabs({ car }: { car: Car }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const rootRef = useRef<HTMLDivElement>(null)
  // A ref, not state — set synchronously by the hash-resolution effect and
  // read by the scroll effect right after, without itself triggering a
  // render (only the activeTab change it causes does that).
  const pendingSectionScroll = useRef<string | null>(null)
  // Suppresses the scroll-to-top effect below on its very first run — the
  // initial render (default Overview, or whatever a hash resolves to)
  // shouldn't cause a scroll-jump, only a genuine later tab switch should.
  const isInitialMount = useRef(true)

  // Resolves the hash once on mount, and again on any hashchange — which
  // fires both for browser back/forward AND for a plain <a href="#id">
  // click (OverflowNav's tab links below are exactly that, nothing more;
  // no manual navigation/router call needed anywhere in this component). A
  // section hash selects its owning tab and queues a scroll to that
  // specific section once it's mounted; a bare tab hash just selects the
  // tab. No hash at all leaves the default (Overview) — this is never
  // session-sticky, every fresh load starts here unless the URL itself
  // says otherwise.
  useEffect(() => {
    function resolveHash() {
      const hash = window.location.hash.replace('#', '')
      if (!hash) return
      if (isTabId(hash)) {
        setActiveTab(hash)
      } else if (hash in SECTION_TO_TAB) {
        setActiveTab(SECTION_TO_TAB[hash])
        pendingSectionScroll.current = hash
      }
    }
    resolveHash()
    window.addEventListener('hashchange', resolveHash)
    return () => window.removeEventListener('hashchange', resolveHash)
  }, [])

  // Fires after every tab switch (click, hashchange, or the initial
  // mount) — including twice on a hash-driven initial mount, since the
  // hash-resolution effect's setActiveTab call means this effect's first
  // pass still sees the OLD (default) tab's content in the DOM, before the
  // new tab's sections exist to scroll to. A pending section deep-link is
  // only cleared once its element is actually found — if not, it's left
  // set for the pass right after the tab switch commits, which is when the
  // element exists. isInitialMount suppresses the scroll-to-top-of-tab
  // fallback only on the very first pass (a plain page load shouldn't
  // scroll-jump); a hash-resolved tab switch's second pass still gets it,
  // which is correct — landing directly on a tab's URL should show its top.
  useEffect(() => {
    const wasInitialMount = isInitialMount.current
    isInitialMount.current = false

    if (pendingSectionScroll.current) {
      const el = document.getElementById(pendingSectionScroll.current)
      if (el) {
        pendingSectionScroll.current = null
        el.scrollIntoView({ block: 'start' })
      }
      return
    }

    if (!wasInitialMount) {
      rootRef.current?.scrollIntoView({ block: 'start' })
    }
  }, [activeTab])

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
    <div ref={rootRef} className="scroll-mt-40">
      {/* Just the 3 primary tabs — no per-tab section subnav. Sections
          within a tab flow one after another with their own dividers
          (Section's border-t), no anchor nav needed to get between them.
          Same OverflowNav component the page always used for its nav pill
          (rounded, shadowed, JS-measured collapse into a "more" menu if
          items don't fit) — just given 3 items instead of 11, and an
          `activeId` prop since there's no longer a full set of
          simultaneously-mounted sections for it to scrollspy over. */}
      <nav className="sticky top-14 z-40 pb-4 bg-bg-base">
        <OverflowNav items={TABS} activeId={activeTab} />
      </nav>

      {activeTab === 'overview' && (
        <>
          <Section id="overview" label="Overview" first>
            <div className="max-w-170">
              {car.overview ? renderText(car.overview) : <Unavailable />}
            </div>
          </Section>

          {/* The scorecard — 7 radar axes as bars, then Electronic
              Dependence as a position-on-a-spectrum control below a
              divider. All 7 axes always render (label + track); one with
              no score just stays an empty grey track with a — value,
              never a fabricated zero. */}
          <Section id="ratings" label="The scorecard">
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
                    rated amount, so the track is a plain line (no fill)
                    with tick marks and a single dot, not a progress bar.
                    A position with no note renders as unscored, same as
                    fully null — an unexplained position is exactly the
                    failure mode this design exists to avoid (the admin
                    form nudges toward always pairing the two). */}
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
          </Section>

          {/* Market Data */}
          <Section id="market-data" label="Market Data">
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
          </Section>
        </>
      )}

      {activeTab === 'the-story' && (
        <>
          {/* What it's like — Character */}
          <Section id="character" label="What it's like" first>
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
          </Section>

          {/* Where it comes from — Lineage */}
          <Section id="lineage" label="Where it comes from">
            {relatedCars.length > 0 ? <RelationCards entries={relatedCars} /> : <Unavailable />}
          </Section>

          {/* Rivals */}
          <Section id="rivals" label="Rivals">
            {rivalCars.length > 0 ? <RelationCards entries={rivalCars} /> : <Unavailable />}
          </Section>
        </>
      )}

      {activeTab === 'owning-one' && (
        <>
          {/* Why collectors want it */}
          <Section id="collectibility" label="Why collectors want it" first>
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
          </Section>

          {/* Which one to look for — variants + trims */}
          <Section id="variants-trims" label="Which one to look for">
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
          </Section>

          {/* What owning one is like — Known Issues */}
          <Section id="known-issues" label="What owning one is like">
            {car.known_issues ? (
              <p className="text-body text-text-secondary leading-relaxed max-w-170 m-0">{car.known_issues}</p>
            ) : <Unavailable />}
          </Section>

          {/* Upkeep & Parts — Maintenance */}
          <Section id="upkeep-parts" label="Upkeep & Parts">
            {car.maintenance ? (
              <div className="max-w-170 prose">
                {renderText(car.maintenance)}
              </div>
            ) : <Unavailable />}
          </Section>

          {/* Resources */}
          <Section id="resources" label="Resources">
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
          </Section>
        </>
      )}
    </div>
  )
}
