import CarCard from '@/components/CarCard'
import CollapsibleText from '@/components/CollapsibleText'
import { RADAR_AXES, DESIRABILITY_TIERS, VALUE_TRAJECTORIES } from '@/lib/car-schema'
import type { Car, CarRelation } from '@/lib/types'

const NA = '—'

function formatMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

// Electronic dependence marker position (% from left) — the two endpoints
// (Fully analog / Heavily electronic) sit flush against the bar's edges,
// not centered in their segment like the 3 middle ranks, since those are
// the actual ends of the spectrum rather than a band along it.
function electronicDependencePosition(v: number): number {
  if (v === 1) return 0
  if (v === 5) return 100
  return ((v - 0.5) / 5) * 100
}

// Every section/stat always renders now — never conditionally hidden — so
// this is the one, single fallback used wherever a given car just doesn't
// have that data yet, instead of each section inventing its own wording.
function Unavailable() {
  return <p className="text-paragraph text-text-tertiary m-0">Data unavailable</p>
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
// (text-base) since the tab heading is now the one "main" title on the page,
// everything else is a sub-heading under it. All three tabs' content is
// always in the DOM, one continuous scroll — clicking a tab in the nav
// just scrolls to it, the same plain-anchor behavior every section on this
// page has always had.
// divider is an explicit opt-in exception — tabs default to no rule line
// between them (Overview→The Story is a plain gap), but Owning One passes
// divider so there's still one clear separator marking where The Story's
// now-line-free run of sections ends and Owning One begins.
function TabSection({ id, label, first, divider = false, children }: { id: string; label: string; first?: boolean; divider?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-40 ${first ? 'mt-6' : divider ? 'border-t border-border pt-10 mt-10' : 'mt-10'}`}>
      <h2 className="text-lg font-bold text-text-primary tracking-tight mb-5">{label}</h2>
      {children}
    </section>
  )
}

// label is optional — Introduction omits it deliberately (its text sits
// directly under the "Overview" tab heading with no sub-heading of its
// own), everything else still passes one. The field itself keeps its
// label in the database, edit page, and CSV — this only hides it here.
// divider defaults to true (border + double-gap spacing, matching Overview
// and The Story). Owning One passes divider={false} for its non-first
// fields — no rule line, just a single mt-9 (36px, Tailwind's own scale)
// gap instead of the border's pt-8+mt-8 double gap.
// card wraps the section in the same white/border/shadow/radius card the
// sidebar's fact card already uses (bg-white border border-border
// rounded-2xl shadow-sm p-6) — the card's own boundary is the separator,
// so it always implies no border-t rule line, just a plain mt-4 (16px) gap
// above — matching the sidebar's own gap-8 between its stacked cards.
// subtext is the reusable "what this section is" pattern — a short line
// explaining the section, sitting tight under the title (mb-1.5, closer
// than the title's own default mb-4) so it reads as paired with the
// heading, then a bigger gap (mb-6) before the actual content starts.
function FieldSection({ id, label, first, divider = true, card = false, subtext, children }: { id: string; label?: string; first?: boolean; divider?: boolean; card?: boolean; subtext?: string; children: React.ReactNode }) {
  const spacing = first ? '' : card ? 'mt-8' : divider ? 'border-t border-border pt-8 mt-8' : 'mt-9'
  return (
    <div id={id} className={`scroll-mt-40 ${spacing} ${card ? 'bg-white border border-border rounded-2xl shadow-sm p-6' : ''}`}>
      {label && <h3 className={`text-base font-bold text-text-primary tracking-tight ${subtext ? 'mb-1.5' : 'mb-4'}`}>{label}</h3>}
      {subtext && <p className="text-body text-text-tertiary mb-6">{subtext}</p>}
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

// "In the files" isn't a DB flag and isn't admin-editable — every car in
// the catalog earns it unconditionally (being in a curated encyclopedia is
// itself the distinction), so it's never part of the earned/not-earned
// filter above. Always appended last, after any real earned flags — a car
// with none of the other three still shows this alone, but one with any of
// them shows it bringing up the rear, not first (the mockup had it first,
// which was a mockup ordering mistake, not the intended design).
const MADE_THE_CUT = {
  name: 'In the files',
  definition: 'Selected for its history, engineering, or cultural weight.',
  icon: (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </>
  ),
}

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

// Parse newlines in text. Both branches carry their own text-paragraph
// (15px) sizing directly — this used to depend on the caller wrapping the
// output in a ".prose" div (whose ".prose p"/"prose strong" rules did the
// actual styling), but two of three call sites didn't, so their paragraphs
// silently fell back to the browser's unstyled ~16px default instead of the
// site's two intended body sizes (13px text-body / 15px text-paragraph).
// Self-contained here means it renders correctly regardless of wrapper.
function renderText(text: string) {
  return text.split('\n\n').map((para, i) => {
    if (para.startsWith('**')) {
      const [boldPart, ...rest] = para.split('**').filter(Boolean)
      return (
        <p key={i} className="text-paragraph text-text-secondary mb-5">
          <strong className="text-text-primary font-semibold">{boldPart.replace(/\*\*/g, '')}</strong>
          {rest.join('')}
        </p>
      )
    }
    return <p key={i} className="text-paragraph text-text-secondary mb-5">{para}</p>
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
  const hasVariantsTrims = !!car.variants_to_know || car.trims?.length > 0
  // In the files is always last — every car gets it unconditionally, so it
  // never displaces an actually-earned flag from the front of the list.
  const earnedDistinctions = [...DISTINCTIONS.filter(d => car[d.key]), MADE_THE_CUT]
  const relatedCars = car.relations?.filter(r => r.relation_type === 'related') ?? []
  const rivalCars = car.relations?.filter(r => r.relation_type === 'rival') ?? []
  // Always all 3 tiers, regardless of which values are actually entered —
  // a missing individual value shows NA, not a shrunken 1- or 2-cell grid.
  const marketTiers = [
    { label: 'Entry / Driver', value: car.market_data?.low ?? null },
    { label: 'Mid / Nice', value: car.market_data?.mid ?? null },
    { label: 'Show / Concours', value: car.market_data?.high ?? null },
  ]

  return (
    <div>
      <TabSection id="overview" label="Overview" first>
        <FieldSection id="introduction" first>
          <div className="max-w-170">
            {car.introduction ? <CollapsibleText>{renderText(car.introduction)}</CollapsibleText> : <Unavailable />}
          </div>
        </FieldSection>

        {/* Distinctions — always renders now: In the files is unconditional,
            so every car has at least one earned distinction. Legend/
            Homologation Special/Poster Car (if any) come first, in their
            fixed order; In the files is always appended last. */}
        <FieldSection id="distinctions" label="Distinctions" card subtext="What sets this car apart, from being selected for the Octane Files to becoming a legend.">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {earnedDistinctions.map(d => (
              <div key={d.name} className="flex items-start gap-3">
                <span className="w-10 h-10 mt-0.5 rounded-full bg-accent flex items-center justify-center shrink-0">
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

        {/* The scorecard — 7 radar axes as bars, then Electronic Dependence
            as a position-on-a-spectrum control below a divider. Both always
            render, scored or not — a car with zero scores still shows all
            7 empty tracks, subtext copy unchanged either way. A score-less
            axis shows "-/-", never a fabricated zero. */}
        <FieldSection
          id="ratings"
          label="The scorecard"
          card
          subtext="Rated 1 to 10 on the traits that matter for owning, driving, and holding on to a car like this."
        >
          <div className="flex flex-col gap-8">
            <div>
              <div className="flex flex-col gap-4">
                {RADAR_AXES.map(axis => {
                  const score = car.radar_scores?.[axis.key] ?? null
                  return (
                    <div key={axis.key} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                      <div className="w-45 shrink-0 text-body text-text-secondary">{axis.label}</div>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1 h-2 rounded-full bg-track overflow-hidden">
                          {score !== null && (
                            <div className="h-full rounded-full bg-accent-light" style={{ width: `${score * 10}%` }} />
                          )}
                        </div>
                        <div className="w-12 shrink-0 text-right text-body text-text-tertiary">
                          {score !== null ? `${score}/10` : '-/-'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Electronic dependence — the bar, track segments, and
                Fully analog/Heavily electronic labels always render,
                even with no score entered (an empty bar, no indicator
                dot). Only the marker dot and the notes paragraph are
                conditional on actually having a score/note. Track
                matches the scorecard bars above exactly (h-2
                rounded-full bg-track); white divider lines split it
                into 5 segments and the marker centers in whichever
                segment matches the score. */}
            <div className="pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4">
                <div className="w-45 shrink-0 text-body text-text-secondary">Electronic dependence</div>
                <div className="flex-1">
                  <div className="relative mt-3 mb-2">
                    <div className="relative h-2 rounded-full bg-track overflow-hidden">
                      {[1, 2, 3, 4].map(divider => (
                        <span
                          key={divider}
                          className="absolute inset-y-0 w-0.5 bg-white"
                          style={{ left: `${(divider / 5) * 100}%` }}
                        />
                      ))}
                    </div>
                    {car.electronic_dependence !== null && (
                      <span
                        className="absolute top-1/2 w-4.5 h-4.5 rounded-full bg-accent-light -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-sm"
                        style={{ left: `${electronicDependencePosition(car.electronic_dependence)}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-body text-text-tertiary">
                    <span>Fully analog</span>
                    <span>Heavily electronic</span>
                  </div>
                  <CollapsibleText>
                    <p className="text-body text-text-secondary leading-relaxed mt-3 m-0">
                      {car.electronic_dependence_notes || 'Data unavailable'}
                    </p>
                  </CollapsibleText>
                </div>
              </div>
            </div>
          </div>
        </FieldSection>

        {/* Market Data */}
        <FieldSection id="market-data" label="Market Data" card subtext="Demand tier, price trend, and typical values by condition, based on recent sales data.">
            <div className="mb-5">
              <div className="text-sm font-bold text-text-primary tracking-tight mb-3">Desirability Tier</div>
              <div className="flex gap-2 flex-wrap">
                {DESIRABILITY_TIERS.map(tier => {
                  const isSelected = tier === car.desirability_tier
                  const pillClass = isSelected ? 'pill pill-active gap-1.5' : car.desirability_tier ? 'pill' : 'pill text-text-tertiary'
                  return (
                    <span key={tier} className={`cursor-default text-body ${pillClass}`}>
                      {isSelected && <SelectedCheck />}
                      {tier}
                    </span>
                  )
                })}
              </div>
              <p className="text-body text-text-secondary leading-relaxed mt-1.5 m-0">
                {car.desirability_tier ? DESIRABILITY_TIER_DEFINITIONS[car.desirability_tier] : 'Data unavailable'}
              </p>
            </div>
            <div className="mb-5 pt-8 border-t border-border">
              <div className="text-sm font-bold text-text-primary tracking-tight mb-3">Value Trajectory</div>
              <div className="flex gap-2 flex-wrap">
                {VALUE_TRAJECTORIES.map(t => {
                  const isSelected = t.value === car.value_trajectory
                  const pillClass = isSelected ? 'pill pill-active gap-1.5' : car.value_trajectory ? 'pill' : 'pill text-text-tertiary'
                  return (
                    <span key={t.value} className={`cursor-default text-body ${pillClass}`}>
                      {isSelected && <SelectedCheck />}
                      {VALUE_TRAJECTORY_DISPLAY[t.value]}
                    </span>
                  )
                })}
              </div>
              <p className="text-body text-text-secondary leading-relaxed mt-1.5 m-0">
                {car.value_trajectory ? VALUE_TRAJECTORY_DEFINITIONS[car.value_trajectory] : 'Data unavailable'}
              </p>
            </div>
            <div className="pt-8 border-t border-border">
              <div className="text-sm font-bold text-text-primary tracking-tight mb-1.5">Price by condition</div>
              {/* Plain divide-x, not .stat-grid's bg-border/gap-px card
                  trick — that trick leaves the parent's own background
                  color exposed wherever a cell doesn't fully cover it,
                  which is exactly the stray padding/color bleed seen once
                  this grid's own border/rounding got overridden to sit
                  inside the Market Data card. divide-x draws a line only
                  between cells, no parent fill involved. self-start
                  keeps each cell sized to its own content instead of
                  stretching to the row's full height, so the divider
                  lines don't run taller than the label+value text.
                  Fixed grid-cols-3 (not auto-fit/minmax) — always exactly
                  3 columns, narrower on mobile rather than wrapping. With
                  only 3 items, auto-fit's wrapping caused two bugs at once
                  on narrow screens: the wrapped item's own first:pl-0
                  didn't apply (it's the 3rd DOM child, not the true first
                  child, so it kept its left padding and read as indented),
                  and divide-x's border-left still rendered before it too
                  (same "not actually first" mismatch). Fixing the wrap
                  case removes both rather than patching either. */}
              <div className="grid grid-cols-3 max-w-120 mb-5 divide-x divide-border">
                {marketTiers.map(tier => (
                  <div key={tier.label} className="self-start px-4 first:pl-0">
                    <div className="text-micro font-semibold tracking-widest text-text-tertiary uppercase mb-1.5">
                      {tier.label}
                    </div>
                    <div className="text-xl font-semibold text-accent tracking-heading">
                      {tier.value != null ? formatMoney(tier.value) : NA}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {car.market_data?.notes && (
              <CollapsibleText>
                <p className="text-body text-text-secondary leading-relaxed max-w-150">
                  {car.market_data.notes}
                </p>
              </CollapsibleText>
            )}
            {car.market_data?.as_of && (
              <p className="text-label text-text-tertiary mt-2">
                Values as of {new Date(car.market_data.as_of).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}.
              </p>
            )}
        </FieldSection>

        {/* Buyer's guide — Why it's worth it (was Claim to Fame), Callout,
            and What to watch for (was Buyer's Guide), promoted here from
            "Why collectors want it" in Owning One, which now holds only
            the why_collectible prose. No eyebrows — same icon-circle +
            name + description treatment as the Distinctions badges above.
            Icon and name always render; only the description is
            conditional (real content or "Data unavailable"). */}
        <FieldSection id="buyers-guide" label="Buyer's guide" card subtext="What anyone seriously considering this car should know first.">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 mt-0.5 rounded-full bg-accent flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1 3 3 0 0 1-3 3 1 1 0 0 0 0 2 5 5 0 0 0 5-5V5a2 2 0 0 0-2-2z" />
                  <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1 3 3 0 0 1-3 3 1 1 0 0 0 0 2 5 5 0 0 0 5-5V5a2 2 0 0 0-2-2z" />
                </svg>
              </span>
              <div>
                <div className="text-body font-semibold text-text-primary mb-0.5">Why it&apos;s worth it</div>
                <CollapsibleText>
                  <div className="text-body text-text-secondary leading-relaxed">{car.claim_to_fame || 'Data unavailable'}</div>
                </CollapsibleText>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 mt-0.5 rounded-full bg-accent flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </span>
              <div>
                <div className="text-body font-semibold text-text-primary mb-0.5">Callout</div>
                <CollapsibleText>
                  <div className="text-body text-text-secondary leading-relaxed">{car.callout || 'Data unavailable'}</div>
                </CollapsibleText>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 mt-0.5 rounded-full bg-accent flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <div>
                <div className="text-body font-semibold text-text-primary mb-0.5">What to watch for</div>
                <CollapsibleText>
                  <div className="text-body text-text-secondary leading-relaxed">{car.buyers_flag || 'Data unavailable'}</div>
                </CollapsibleText>
              </div>
            </div>
          </div>
        </FieldSection>
      </TabSection>

      <TabSection id="the-story" label="The Story">
        {/* Driving Character, Design, Motorsport Pedigree, In Culture — 4
            independent sections now, normalized to the same plain single-
            column text-section treatment as every other field (Why
            collectors want it, etc.), each with its own title and its own
            independent "Data unavailable" fallback. Previously grouped
            under one shared "What it's like" heading in a 2-column grid;
            "What it's like" itself is gone from the view page. This is a
            view-layer-only change — the edit page and CSV still group
            these 4 fields under one "What it's like" section, so there's
            now a deliberate view/edit divergence here (unlike the rest of
            this page, which keeps view and edit labels 1:1). */}
        <FieldSection id="driving-character" label="Driving Character" first>
          {car.driving_character ? (
            <CollapsibleText>
              <p className="text-paragraph text-text-secondary leading-relaxed m-0">{car.driving_character}</p>
            </CollapsibleText>
          ) : <Unavailable />}
        </FieldSection>

        <FieldSection id="design" label="Design" divider={false}>
          {car.design_notes ? (
            <CollapsibleText>
              <p className="text-paragraph text-text-secondary leading-relaxed m-0">{car.design_notes}</p>
            </CollapsibleText>
          ) : <Unavailable />}
        </FieldSection>

        <FieldSection id="motorsport-pedigree" label="Motorsport Pedigree" divider={false}>
          {car.motorsport_pedigree ? (
            <CollapsibleText>
              <p className="text-paragraph text-text-secondary leading-relaxed m-0">{car.motorsport_pedigree}</p>
            </CollapsibleText>
          ) : <Unavailable />}
        </FieldSection>

        <FieldSection id="in-culture" label="In Culture" divider={false}>
          {car.cultural_notes ? (
            <CollapsibleText>
              <p className="text-paragraph text-text-secondary leading-relaxed m-0">{car.cultural_notes}</p>
            </CollapsibleText>
          ) : <Unavailable />}
        </FieldSection>

        {/* Where it comes from — Lineage */}
        <FieldSection id="lineage" label="Where it comes from" divider={false} subtext="Related cars from the same manufacturer family, like platform siblings or shared-era relatives.">
          {relatedCars.length > 0 ? <RelationCards entries={relatedCars} /> : <Unavailable />}
        </FieldSection>

        {/* Rivals — no rule line between this and Where it comes from above */}
        <FieldSection id="rivals" label="Rivals" divider={false} subtext="Cars from other manufacturers that competed for the same buyers when new.">
          {rivalCars.length > 0 ? <RelationCards entries={rivalCars} /> : <Unavailable />}
        </FieldSection>
      </TabSection>

      <TabSection id="owning-one" label="Owning One" divider>
        {/* Why collectors want it — just the why_collectible prose now;
            Callout/Claim to Fame/Buyer's Guide moved to the new Highlights
            section in Overview, right after Market Data. */}
        <FieldSection id="collectibility" label="Why collectors want it" first>
          {car.why_collectible ? (
            <div className="max-w-170">
              <CollapsibleText>{renderText(car.why_collectible)}</CollapsibleText>
            </div>
          ) : <Unavailable />}
        </FieldSection>

        {/* Which one to look for — variants + trims */}
        <FieldSection id="variants-trims" label="Which one to look for" divider={false}>
          {hasVariantsTrims ? (
            <>
              {car.variants_to_know && (
                <CollapsibleText>
                  <p className="text-paragraph text-text-secondary leading-relaxed max-w-170 mb-6">
                    {car.variants_to_know}
                  </p>
                </CollapsibleText>
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
        <FieldSection id="known-issues" label="What owning one is like" divider={false}>
          {car.known_issues ? (
            <CollapsibleText>
              <p className="text-paragraph text-text-secondary leading-relaxed max-w-170 m-0">{car.known_issues}</p>
            </CollapsibleText>
          ) : <Unavailable />}
        </FieldSection>

        {/* Upkeep & Parts — Maintenance */}
        <FieldSection id="upkeep-parts" label="Upkeep & Parts" divider={false}>
          {car.maintenance ? (
            <div className="max-w-170">
              <CollapsibleText>{renderText(car.maintenance)}</CollapsibleText>
            </div>
          ) : <Unavailable />}
        </FieldSection>

        {/* Resources */}
        <FieldSection id="resources" label="Resources" divider={false}>
          {car.resources?.length > 0 ? (
            <div className="flex flex-col gap-2">
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
