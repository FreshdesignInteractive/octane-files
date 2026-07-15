import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import SaveButton from '@/components/SaveButton'
import EditButton from '@/components/EditButton'
import CarGallery from '@/components/CarGallery'
import ShareButton from '@/components/ShareButton'
import OverflowNav from '@/components/OverflowNav'
import BackToTop from '@/components/BackToTop'
import CarCard from '@/components/CarCard'
import { getModel, getModelSlugs } from '@/lib/supabase'
import type { Car, CarRelation } from '@/lib/types'
import { RADAR_AXES } from '@/lib/car-schema'

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await getModelSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const car = await getModel(slug)
  if (!car) return { title: 'Not Found' }
  const name = `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`
  return {
    title: name,
    description: car.overview?.slice(0, 160),
  }
}

function formatMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

// scroll-mt-40 (160px) clears the sticky header (h-14, 56px) + sticky
// subnav pill (h-16 + py-4, 96px) so an anchor jump or scrollspy-driven
// click lands with the section's own heading visible below both, not
// hidden underneath them.
function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-border pt-10 mt-10 scroll-mt-40">
      <h2 className="text-lg font-bold text-text-primary tracking-tight mb-6">{label}</h2>
      {children}
    </section>
  )
}

// Every section/stat always renders now — never conditionally hidden — so
// this is the one, single fallback used wherever a given car just doesn't
// have that data yet, instead of each section inventing its own wording.
function Unavailable() {
  return <p className="text-body text-text-tertiary m-0">Data unavailable</p>
}

const NA = '—'

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

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const car: Car | null = await getModel(slug)
  if (!car) notFound()

  const name = `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`
  const years = car.year_end ? `${car.year_start}–${car.year_end}` : `${car.year_start}–present`

  const hasCollectibility = !!(car.callout || car.claim_to_fame || car.why_collectible || car.buyers_flag)
  const hasRatings = car.analog_index !== null || !!(car.radar_scores && Object.keys(car.radar_scores).length > 0)
  const hasSpecifications = car.specs?.length > 0
  const hasVariantsTrims = !!car.variants_to_know || car.trims?.length > 0
  const hasCharacter = !!(car.driving_character || car.design_notes || car.motorsport_pedigree || car.cultural_notes)
  const hasMarketSection = !!(car.market_data || car.desirability_tier || car.value_trajectory)
  const galleryImages = car.gallery_images?.filter(Boolean) ?? []
  const allImages = [car.hero_image || '/placeholder.png', ...galleryImages]
  const relatedCars = car.relations?.filter(r => r.relation_type === 'related') ?? []
  const rivalCars = car.relations?.filter(r => r.relation_type === 'rival') ?? []
  const marketTiers = [
    car.market_data?.low != null && { label: 'Entry / Driver', value: car.market_data.low },
    car.market_data?.mid != null && { label: 'Mid / Nice', value: car.market_data.mid },
    car.market_data?.high != null && { label: 'Show / Concours', value: car.market_data.high },
  ].filter(Boolean) as { label: string; value: number }[]

  // Always the full, fixed list — sections no longer disappear when a car
  // is missing that data, they show Unavailable inside instead.
  const sections = [
    { id: 'quick-facts', label: 'Quick Facts' },
    { id: 'overview', label: 'Overview' },
    { id: 'collectibility', label: 'Why collectors want it' },
    { id: 'ratings', label: 'How it scores' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'variants-trims', label: 'Which one to look for' },
    { id: 'character', label: "What it's like" },
    { id: 'lineage', label: 'Where it comes from' },
    { id: 'rivals', label: 'Rivals' },
    { id: 'market-data', label: 'Market Data' },
    { id: 'known-issues', label: 'What owning one is like' },
    { id: 'upkeep-parts', label: 'Upkeep & Parts' },
    { id: 'resources', label: 'Resources' },
  ]

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

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero — breadcrumb + title above a flat image, no gradient overlay */}
        <div className="detail-container pt-8 pb-6">
          <div className="flex items-center gap-1 text-xs mb-3">
            <Link href="/" className="text-accent no-underline">Browse</Link>
            <span className="text-text-tertiary">&rsaquo;</span>
            <span className="text-text-primary">{name}</span>
          </div>

          <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
            <h1 className="text-hero font-bold text-text-primary leading-tight m-0">
              {car.make} {car.model}
              {car.generation && <span className="text-text-secondary font-normal"> {car.generation}</span>}
            </h1>
            <div className="flex items-center gap-3">
              <ShareButton
                car={{
                  name,
                  infoLine: `${car.country} · ${car.class} · ${years}`,
                  image: car.hero_image || '/placeholder.png',
                }}
              />
              <span className="w-px h-2.5 bg-border-mid" />
              <SaveButton modelId={car.id} />
              <EditButton slug={car.slug} />
            </div>
          </div>

          {/* Gallery — hero image with a thumbnail rail; click a thumbnail to
              swap the large display, click the large image for a lightbox */}
          <CarGallery images={allImages} alt={name} />
        </div>

        {/* Body */}
        <div className="detail-container pb-20">
          {/* Sticky subnav — no top padding here; the 24px gap below the
              gallery comes from the hero container's own pb-6 above, so
              the gap has one source instead of two stacked paddings. */}
          <nav className="sticky top-14 z-40 pb-4">
            <OverflowNav items={sections} />
          </nav>

          {/* Body/side containership — main content column stays plain
              (inherits the page background), sidebar is fixed-width. Below
              lg, CSS Grid's default auto-placement would put the sidebar
              (source order: second) after all of the main content, since
              there's only one column to stack into — order-first on the
              sidebar below (reset via lg:order-none) puts it right after
              the subnav instead, without changing the desktop layout. */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          <div>
          {/* Quick Facts — its own scrollspy landmark so the subnav's first
              tab tracks what's actually visible right under it, instead of
              staying stuck on "Overview" (whose own section starts further
              down the page). */}
          <section id="quick-facts" className="scroll-mt-40">
          <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] mt-6 mb-8">
            {([
              { label: 'Country', value: car.country || NA },
              { label: 'Production', value: years },
              { label: 'Units built', value: car.units_produced ? car.units_produced.toLocaleString() : NA },
              { label: 'Class', value: car.class || NA },
            ] as { label: string; value: React.ReactNode }[])
              .map(stat => (
                <div key={stat.label} className="stat-cell">
                  <div className="text-micro font-semibold tracking-widest text-text-tertiary uppercase mb-1">
                    {stat.label}
                  </div>
                  <div className="text-sm font-medium text-text-primary">
                    {stat.value}
                  </div>
                </div>
              ))}
          </div>
          </section>

          {/* Overview */}
          <section id="overview" className="mt-2 scroll-mt-40">
            <h2 className="text-lg font-bold text-text-primary tracking-tight mb-5">Overview</h2>
            <div className="max-w-170">
              {car.overview ? renderText(car.overview) : <Unavailable />}
            </div>
          </section>

          {/* Why collectors want it */}
          <Section id="collectibility" label="Why collectors want it">
            {hasCollectibility ? (
              <>
                {(car.callout || car.claim_to_fame) && (
                  <div className="flex gap-2 flex-wrap mb-5">
                    {car.callout && (
                      <span className="text-label font-semibold uppercase tracking-wide text-accent bg-accent-subtle px-3 py-1.5 rounded-full border border-accent-border">
                        {car.callout}
                      </span>
                    )}
                    {car.claim_to_fame && (
                      <span className="text-label font-semibold uppercase tracking-wide text-accent bg-accent-subtle px-3 py-1.5 rounded-full border border-accent-border">
                        {car.claim_to_fame}
                      </span>
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

          {/* How it scores — analog index + per-axis score bars. All 7 axes
              always render (label + track); one with no score just stays
              an empty grey track with a — value, never a fabricated zero. */}
          <Section id="ratings" label="How it scores">
            {hasRatings ? (
              <div className="flex flex-col gap-8">
                {car.analog_index !== null && (
                  <div className="stat-cell">
                    <div className="text-micro font-semibold tracking-widest text-text-tertiary uppercase mb-1">Analog Index</div>
                    <div className="text-xl font-semibold text-accent-secondary tracking-heading">{car.analog_index}/10</div>
                  </div>
                )}
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
            ) : <Unavailable />}
          </Section>

          {/* Specifications — numbers only */}
          <Section id="specifications" label="Specifications">
            {hasSpecifications ? (
              <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                {car.specs.map(group => (
                  <div key={group.group}>
                    <div className="text-label font-bold tracking-widest text-accent uppercase mb-3">
                      {group.group}
                    </div>
                    <div className="flex flex-col gap-0">
                      {group.specs.map(spec => (
                        <div key={spec.label} className="flex justify-between items-baseline py-2 border-b border-border gap-3">
                          <span className="text-body text-text-secondary flex-shrink-0">{spec.label}</span>
                          <span className="text-body text-text-primary font-medium text-right">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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

          {/* What it's like — Character */}
          <Section id="character" label="What it's like">
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

          {/* Market Data */}
          <Section id="market-data" label="Market Data">
            {hasMarketSection ? (
              <>
                {(car.desirability_tier || car.value_trajectory) && (
                  <div className="flex gap-3 mb-5">
                    {car.desirability_tier && <span className="pill pill-active">{car.desirability_tier}</span>}
                    {car.value_trajectory && (
                      <span className="pill">{VALUE_TRAJECTORY_DISPLAY[car.value_trajectory]}</span>
                    )}
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

          {/* Back */}
          <div className="mt-15 pt-8 border-t border-border">
            <Link href="/" className="text-body text-text-secondary no-underline inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              All cars
            </Link>
          </div>
          </div>

          {/* Sidebar. Same shadow as the subnav pill, same corner radius as
              the gallery/hero images. mt-6 (24px) lines its top up with the
              stat-grid opposite it — and since sticky offsets are measured
              from the margin edge, the same mt-6 also keeps that 24px gap
              once stuck: 56px (site header, h-14) + 96px (subnav's own h-16
              + py-4) = 152px to the subnav's bottom edge, +24px margin =
              the card's actual top when pinned. lg-only — below that
              breakpoint this is a single stacked column, not the
              two-column layout, so sticking here would pin it awkwardly
              mid-page. self-start keeps it at its own natural height
              instead of stretching to match the main column (grid's
              default stretch), which would leave it no room to actually
              stick. */}
          <div className="flex flex-col gap-10 mt-6 order-first lg:order-none lg:sticky lg:top-[152px] lg:self-start">
            {/* Everything below holds multiple/longer values (a list, a
                paragraph, a link) rather than one short fact, so it gets
                its own icon + label + value row instead of a stat-cell.
                Single column — this card is narrower than the main
                content column, no room for two. */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col gap-6">
                {([
                  {
                    label: 'Nickname',
                    value: (
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <span>{car.nickname || NA}</span>
                        {car.is_icon && <span className="pill pill-active">★ Icon</span>}
                        {car.homologation_special && <span className="pill pill-active">Homologation Special</span>}
                        {car.poster_car && <span className="pill pill-active">Poster Car</span>}
                      </span>
                    ),
                    icon: (
                      <>
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </>
                    ),
                  },
                  {
                    label: 'Drivetrain',
                    value: car.drivetrain || NA,
                    icon: (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ),
                  },
                  {
                    label: 'Engine',
                    value: car.engine_layout || NA,
                    icon: (
                      <>
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <rect x="9" y="9" width="6" height="6" />
                        <line x1="9" y1="1" x2="9" y2="4" />
                        <line x1="15" y1="1" x2="15" y2="4" />
                        <line x1="9" y1="20" x2="9" y2="23" />
                        <line x1="15" y1="20" x2="15" y2="23" />
                        <line x1="20" y1="9" x2="23" y2="9" />
                        <line x1="20" y1="14" x2="23" y2="14" />
                        <line x1="1" y1="9" x2="4" y2="9" />
                        <line x1="1" y1="14" x2="4" y2="14" />
                      </>
                    ),
                  },
                  {
                    label: 'Engine Detail',
                    value: car.engine_signature || NA,
                    icon: (
                      <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </>
                    ),
                  },
                  {
                    label: 'Body',
                    value: car.body_styles?.length ? car.body_styles.join(', ') : NA,
                    icon: (
                      <>
                        <polygon points="12,2 2,7 12,12 22,7 12,2" />
                        <polyline points="2,17 12,22 22,17" />
                        <polyline points="2,12 12,17 22,12" />
                      </>
                    ),
                  },
                  {
                    label: 'Designer',
                    value: car.designer || NA,
                    icon: <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
                  },
                  {
                    label: 'Wikipedia',
                    value: car.wikipedia_url ? (
                      <a href={car.wikipedia_url} target="_blank" rel="noopener noreferrer" className="text-accent no-underline">
                        View ↗
                      </a>
                    ) : NA,
                    icon: (
                      <>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15,3 21,3 21,9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </>
                    ),
                  },
                ] as { label: string; value: React.ReactNode; icon: React.ReactNode }[])
                  .map(row => (
                    <div key={row.label} className="flex gap-4">
                      <svg
                        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="text-text-secondary shrink-0 mt-0.5"
                      >
                        {row.icon}
                      </svg>
                      <div>
                        <div className="text-body font-semibold text-text-primary mb-1">{row.label}</div>
                        <div className="text-body text-text-secondary">{row.value}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg min-h-96" />

            {/* Report an issue — links to a dedicated page rather than a
                dialog, so Google sign-in's redirect (which always lands on
                the homepage) doesn't need to restore any in-page state. */}
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <p className="text-label text-text-tertiary leading-relaxed m-0">
                This page was generated by AI and may contain inaccuracies.
              </p>
              <Link
                href={`/cars/${car.slug}/report`}
                className="inline-flex items-center gap-1.5 text-label text-text-secondary underline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Report a mistake on this vehicle profile.
              </Link>
            </div>
          </div>
          </div>
        </div>
      </main>
      <SiteFooter />
      <BackToTop />
    </>
  )
}
