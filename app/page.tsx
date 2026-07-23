import Link from 'next/link'
import { redirect } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { getLiveCarCount } from '@/lib/supabase'

export const revalidate = 3600

// Placeholder portal homepage — real design TBD once the affiliate/service
// partnerships behind these tiles exist. Browse and Garage are the only two
// live sections today; everything else is a "Coming soon" placeholder tile
// so the page reads honestly rather than overselling capability that isn't
// built yet. Swap SERVICES' content (and add live: true) as each section
// goes live — the tile rendering itself doesn't need to change.
const SERVICES: {
  title: string
  description: string
  href?: string
  live: boolean
  icon: React.ReactNode
}[] = [
  {
    title: 'Browse Cars',
    description: 'Specs, history, and market data for every car in the catalog.',
    href: '/browse',
    live: true,
    icon: <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h1m14-6a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-1M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />,
  },
  {
    title: 'Garage',
    description: 'Post the cars you own, save the ones you want, and follow builds.',
    href: '/garage',
    live: true,
    icon: <path d="M2 20a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v0a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v0zM4 18l2-9a2 2 0 0 1 2-1.5h8A2 2 0 0 1 18 9l2 9M7 13h10" />,
  },
  {
    title: 'Valuations',
    description: 'Track market value trends and price bands for collector cars.',
    live: false,
    icon: <path d="M3 3v18h18M18.7 8l-5.1 5.1-3-3L3 17.5" />,
  },
  {
    title: 'Financing',
    description: 'Compare classic car loan rates from specialist lenders.',
    live: false,
    icon: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></>,
  },
  {
    title: 'Insurance',
    description: 'Get agreed-value insurance quotes built for collector cars.',
    live: false,
    icon: <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6z" />,
  },
  {
    title: 'Marketplace',
    description: 'Buy and sell verified collector cars, listed by owners and dealers.',
    live: false,
    icon: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />,
  },
  {
    title: 'Specialists',
    description: 'Find trusted restorers, appraisers, and marque experts near you.',
    live: false,
    icon: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87" /></>,
  },
  {
    title: 'Events',
    description: 'Concours, cars & coffee, and auctions worth the drive.',
    live: false,
    icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  },
]

function ServiceTile({ title, description, href, live, icon }: (typeof SERVICES)[number]) {
  const content = (
    <>
      <div className="w-11 h-11 rounded-full bg-accent-subtle flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          {icon}
        </svg>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-body font-semibold text-text-primary">{title}</div>
        {!live && <span className="pill h-5 px-2 text-micro">Coming soon</span>}
      </div>
      <p className="text-body text-text-secondary leading-relaxed m-0">{description}</p>
    </>
  )

  if (live && href) {
    return (
      <Link href={href} className="card p-6 no-underline block">
        {content}
      </Link>
    )
  }

  // Not live yet — no destination, so this isn't a link at all (same
  // reasoning as CarCard's unprofiled-car tiles: a card that looks
  // clickable but isn't is worse than one that plainly reads as static).
  return <div className="card cursor-default hover:shadow-none hover:translate-y-0 p-6">{content}</div>
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  // Browse used to live at "/" — old bookmarks/shared links carrying its
  // filter/sort params (?make=, ?country=, ?class=, ?era=, ?sort=, ?q=)
  // should still land on a filtered car list, not a bare placeholder page.
  const params = await searchParams
  const legacyBrowseKeys = ['make', 'country', 'class', 'era', 'sort', 'q']
  if (legacyBrowseKeys.some(key => params[key])) {
    const qs = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => !!entry[1])
    ).toString()
    redirect(`/browse${qs ? `?${qs}` : ''}`)
  }

  const carCount = await getLiveCarCount()

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="detail-container pt-16 pb-14 sm:pt-20 sm:pb-16 text-center">
          <p className="eyebrow text-accent mb-4">The Collector Car Portal</p>
          <h1 className="text-hero font-bold text-text-primary mb-4">
            Every collector car move, in one place.
          </h1>
          <p className="text-paragraph text-text-secondary max-w-150 mx-auto mb-8">
            {carCount}+ cars researched and verified, with the services collectors
            actually need being built out alongside them, one at a time.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/browse" className="btn-primary h-11 px-6">Browse Cars</Link>
            <Link href="/garage" className="btn-secondary h-11 px-6">Explore Garage</Link>
          </div>
        </section>

        {/* Services */}
        <section className="detail-container pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map(service => (
              <ServiceTile key={service.title} {...service} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
