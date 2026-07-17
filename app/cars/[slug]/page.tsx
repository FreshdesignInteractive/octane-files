import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import SaveButton from '@/components/SaveButton'
import EditButton from '@/components/EditButton'
import CarGallery from '@/components/CarGallery'
import ShareButton from '@/components/ShareButton'
import BackToTop from '@/components/BackToTop'
import CarDetailTabs from '@/components/CarDetailTabs'
import { getModel, getModelSlugs } from '@/lib/supabase'
import type { Car } from '@/lib/types'
import { carDisplayName } from '@/lib/car-schema'

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await getModelSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const car = await getModel(slug)
  if (!car) return { title: 'Not Found' }
  const name = carDisplayName(car.make, car.model, car.generation)
  return {
    title: name,
    description: car.overview?.slice(0, 160),
  }
}

const NA = '—'

// Roundness alone can't say exact vs. approximate — 500 can be a documented
// figure while 15,000,000 is round *because* it's an estimate, so the flag
// (not the magnitude) decides the format. Exact: full figure, separators,
// any magnitude. Estimated: "~" prefix, abbreviated to millions only at
// >=1M ("~15 million" / "~1.5 million"); below 1M it's still "~" + the
// figure with separators, same as the exact path.
function formatUnitsProduced(value: number | null, estimated: boolean): string {
  if (value === null) return NA
  if (!estimated) return value.toLocaleString()
  if (value >= 1_000_000) {
    const millions = Math.round((value / 1_000_000) * 10) / 10
    return `~${millions} million`
  }
  return `~${value.toLocaleString()}`
}

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const car: Car | null = await getModel(slug)
  if (!car) notFound()

  const name = carDisplayName(car.make, car.model, car.generation)
  const years = car.year_end ? `${car.year_start}–${car.year_end}` : `${car.year_start}–present`
  // A search, not the homepage — nearly every car has a Wikipedia page, so
  // this fallback (un-entered wikipedia_url) still keeps the link's promise
  // instead of dumping the visitor on wikipedia.org with nothing to show.
  const wikipediaHref = car.wikipedia_url || `https://en.wikipedia.org/w/index.php?${new URLSearchParams({ search: name })}`

  const galleryImages = car.gallery_images?.filter(Boolean) ?? []
  const allImages = [car.hero_image || '/placeholder.png', ...galleryImages]

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
              {car.generation && car.generation.toLowerCase() !== car.model.toLowerCase() && (
                <span className="text-text-secondary font-normal"> {car.generation}</span>
              )}
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
          {/* Body/side containership — main content column stays plain
              (inherits the page background), sidebar is fixed-width. Below
              lg, CSS Grid's default auto-placement would put the sidebar
              (source order: second) after all of the main content, since
              there's only one column to stack into — order-first on the
              sidebar below (reset via lg:order-none) puts it right after
              the subnav instead, without changing the desktop layout. */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          <div>
          <CarDetailTabs car={car} />

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

          {/* Sidebar. Same shadow as the nav pill, same corner radius as
              the gallery/hero images. mt-6 (24px) lines its top up with the
              stat-grid opposite it — and since sticky offsets are measured
              from the margin edge, the same mt-6 also keeps that 24px gap
              once stuck: 56px (site header, h-14) + 96px (CarDetailTabs'
              nav — OverflowNav's own h-16 + its wrapper's pb-4) = 152px to
              the nav's bottom edge, the card's actual top when pinned.
              lg-only — below that breakpoint this is a single stacked
              column, not the two-column layout, so sticking here would pin
              it awkwardly mid-page. self-start keeps it at its own natural
              height instead of stretching to match the main column (grid's
              default stretch), which would leave it no room to actually
              stick. */}
          <div className="flex flex-col gap-4 mt-6 order-first lg:order-none lg:sticky lg:top-[152px] lg:self-start">
            {/* Cards keep their own gap-8 (32px) between each other; the
                outer gap-4 (16px) only applies below, between this group
                and the report-a-mistake text. */}
            <div className="flex flex-col gap-8">
            {/* Single-value facts — same stat-grid card/cells used
                everywhere else on this page, just relocated here.
                Explicit grid-cols-2/4 steps rather than auto-fit — with 4
                items, auto-fit could land on 3 columns (leaving one item
                stranded alone on its own row) at in-between widths below
                the lg breakpoint, where this card is still full main-
                column width rather than squeezed into the 380px sidebar.
                2 up narrow, 4 across once there's room, back to 2 once
                the lg two-column layout narrows this card again.
                shadow-sm added here (not on the shared .stat-grid class)
                since this instance sits as a standalone sidebar card next
                to one below that also has a shadow — the other .stat-grid
                usage (Market Data tiers) is inline content, not a card,
                and shouldn't pick this up. .stat-grid's own rounded-2xl
                already matches the gallery images and the icon-row card,
                no override needed here. */}
            <div className="stat-grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 shadow-sm">
              {([
                { label: 'Country of Origin', value: car.country || NA },
                { label: 'Class', value: car.class || NA },
                { label: 'Production Years', value: years },
                { label: 'Units Built', value: formatUnitsProduced(car.units_produced, car.units_produced_estimated) },
              ] as { label: string; value: React.ReactNode }[])
                .map(stat => (
                  <div key={stat.label} className="stat-cell">
                    <div className="text-micro font-semibold tracking-widest text-text-tertiary uppercase mb-0.5">
                      {stat.label}
                    </div>
                    <div className="text-sm font-medium text-text-primary">
                      {stat.value}
                    </div>
                  </div>
                ))}
            </div>

            {/* Everything below holds multiple/longer values (a list, a
                paragraph, a link) rather than one short fact, so it gets
                its own icon + label + value row instead of a stat-cell.
                Single column — this card is narrower than the main
                content column, no room for two. */}
            <div className="bg-white border border-border rounded-2xl shadow-sm p-6">
              <div className="flex flex-col gap-4">
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
                    label: 'Body',
                    value: car.body_styles?.length ? car.body_styles.join(', ') : NA,
                    icon: (
                      <>
                        <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" />
                        <path d="M7 14h.01" />
                        <path d="M17 14h.01" />
                        <rect width="18" height="8" x="3" y="10" rx="2" />
                        <path d="M5 18v2" />
                        <path d="M19 18v2" />
                      </>
                    ),
                  },
                  {
                    // engine_layout + drivetrain rendered as one combined
                    // fact rather than two rows — same underlying "how the
                    // car is laid out" question, and drivetrain is
                    // meaningless without knowing where the engine sits.
                    label: 'Layout',
                    value: [car.engine_layout, car.drivetrain].filter(Boolean).join(', ') || NA,
                    icon: (
                      <>
                        <rect x="2" y="2" width="3" height="6" rx="1" />
                        <rect x="19" y="2" width="3" height="6" rx="1" />
                        <rect x="2" y="16" width="3" height="6" rx="1" />
                        <rect x="19" y="16" width="3" height="6" rx="1" />
                        <line x1="5" y1="5" x2="9" y2="5" />
                        <line x1="15" y1="5" x2="19" y2="5" />
                        <line x1="5" y1="19" x2="19" y2="19" />
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                        <line x1="12" y1="7" x2="12" y2="17" />
                        <circle cx="12" cy="19" r="2" />
                      </>
                    ),
                  },
                  {
                    label: 'Engine',
                    value: car.engine_signature || NA,
                    icon: (
                      <>
                        <path d="M6 10 L8 7 L17 7 L19 10 L19 12 L22 12 L22 16 L19 16 L19 18 L17 21 L8 21 L6 18 Z" />
                        <line x1="11" y1="7" x2="11" y2="3" />
                        <line x1="14" y1="7" x2="14" y2="3" />
                        <line x1="10" y1="3" x2="15" y2="3" />
                        <line x1="1" y1="9" x2="1" y2="17" />
                        <line x1="1" y1="13" x2="6" y2="13" />
                      </>
                    ),
                  },
                  {
                    label: 'Transmission',
                    value: car.transmission || NA,
                    icon: (
                      <>
                        <path d="M3 6 L16 6 L16 9 L19 9 L19 11 L22 11 L22 13 L19 13 L19 15 L16 15 L16 18 L9 18 L9 20 L5 20 L5 18 L3 18 Z" />
                      </>
                    ),
                  },
                  {
                    label: 'Designer',
                    value: car.designer || NA,
                    icon: (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="10" r="4" />
                        <path d="M18 20a6 6 0 0 0-12 0" />
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
                        <div className="text-body font-semibold text-text-primary mb-0.5">{row.label}</div>
                        <div className="text-body text-text-secondary">{row.value}</div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Wikipedia is an exit link, not a spec — always a single
                  line, never a label/value row like the facts above. Falls
                  back to a Wikipedia search (not the homepage) when no
                  wikipedia_url is entered, so the link still keeps its
                  promise. Centered, unlike the left-aligned facts above. */}
              <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border">
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-sm border border-border text-text-primary text-xs font-serif font-bold shrink-0"
                  aria-hidden="true"
                >
                  W
                </span>
                <a href={wikipediaHref} target="_blank" rel="noopener noreferrer" className="text-body text-accent no-underline">
                  Read more about this car on Wikipedia
                </a>
              </div>
            </div>
            </div>

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
