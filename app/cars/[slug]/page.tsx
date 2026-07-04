import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import SaveButton from '@/components/SaveButton'
import { getModel, getModelSlugs } from '@/lib/supabase'
import type { Car } from '@/lib/types'

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

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-border pt-10 mt-10">
      <h2 className="eyebrow mb-6">{label}</h2>
      {children}
    </section>
  )
}

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const car: Car | null = await getModel(slug)
  if (!car) notFound()

  const name = `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`
  const years = car.year_end ? `${car.year_start}–${car.year_end}` : `${car.year_start}–present`

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs', label: 'Specs' },
    car.market_data && { id: 'market', label: 'Market' },
    car.maintenance && { id: 'maintenance', label: 'Maintenance' },
    car.resources?.length > 0 && { id: 'resources', label: 'Resources' },
  ].filter(Boolean) as { id: string; label: string }[]

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
      return <p key={i} className="leading-[1.8] text-text-secondary mb-5">{para}</p>
    })
  }

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <div className="relative h-[clamp(280px,40vw,520px)] bg-text-primary overflow-hidden">
          <Image
            src={car.hero_image || '/placeholder.png'}
            alt={name}
            fill
            className={car.hero_image ? 'object-cover' : 'object-contain'}
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-text-primary/95 via-text-primary/30 to-transparent" />
          {/* Title over hero */}
          <div className="absolute bottom-0 left-0 right-0 px-8 pb-8">
            <div className="max-w-page mx-auto">
              <div className="text-label font-semibold tracking-widest text-accent uppercase mb-2">
                {car.country} &middot; {car.class}
              </div>
              <h1 className="text-hero font-bold tracking-[-0.03em] text-white leading-[1.1] m-0">
                {car.make} {car.model}
                {car.generation && <span className="text-white/50 font-normal"> {car.generation}</span>}
              </h1>
              <div className="text-sm text-white/45 mt-1.5">
                {years}
                {car.units_produced && ` · ${car.units_produced.toLocaleString()} produced`}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="site-container pb-20">
          {/* Sticky subnav */}
          <nav className="sticky top-14 z-40 bg-text-primary/95 border-b border-border -mx-6 px-6 backdrop-blur-sm">
            <div className="flex gap-0 overflow-x-auto">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} className="text-xs font-medium text-text-secondary no-underline px-4 py-3 border-b-2 border-transparent whitespace-nowrap transition-colors">
                  {s.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Save to Garage */}
          <div className="pt-6">
            <SaveButton modelId={car.id} />
          </div>

          {/* Quick stats bar */}
          <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] my-8">
            {[
              { label: 'Production', value: years },
              car.drivetrain && { label: 'Drivetrain', value: car.drivetrain },
              car.engine_layout && { label: 'Engine', value: car.engine_layout },
              car.body_styles?.length && { label: 'Body', value: car.body_styles.join(', ') },
              car.units_produced && { label: 'Units built', value: car.units_produced.toLocaleString() },
            ].filter(Boolean).map((stat: any) => (
              <div key={stat.label} className="stat-cell">
                <div className="text-micro font-semibold tracking-[0.08em] text-text-tertiary uppercase mb-1">
                  {stat.label}
                </div>
                <div className="text-sm font-medium text-text-primary">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Overview */}
          {car.overview && (
            <section id="overview" className="mt-2">
              <h2 className="eyebrow mb-5">Overview</h2>
              <div className="max-w-170">
                {renderText(car.overview)}
              </div>
            </section>
          )}

          {/* Specs */}
          {car.specs?.length > 0 && (
            <Section id="specs" label="Specifications">
              <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                {car.specs.map(group => (
                  <div key={group.group}>
                    <div className="text-label font-bold tracking-[0.08em] text-accent uppercase mb-3">
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
            </Section>
          )}

          {/* Market */}
          {car.market_data && (
            <Section id="market" label="Market Data">
              <div className="stat-grid grid-cols-3 max-w-120 mb-5">
                {[
                  { label: 'Entry / Driver', value: car.market_data.low },
                  { label: 'Mid / Nice', value: car.market_data.mid },
                  { label: 'Show / Concours', value: car.market_data.high },
                ].map(tier => (
                  <div key={tier.label} className="stat-cell">
                    <div className="text-micro font-semibold tracking-[0.08em] text-text-tertiary uppercase mb-1.5">
                      {tier.label}
                    </div>
                    <div className="text-xl font-semibold text-accent tracking-[-0.02em]">
                      {tier.value ? formatMoney(tier.value) : '—'}
                    </div>
                  </div>
                ))}
              </div>
              {car.market_data.notes && (
                <p className="text-body text-text-secondary leading-[1.7] max-w-150">
                  {car.market_data.notes}
                </p>
              )}
              {car.market_data.as_of && (
                <p className="text-label text-text-tertiary mt-2">
                  Values as of {new Date(car.market_data.as_of).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}.
                </p>
              )}
            </Section>
          )}

          {/* Maintenance */}
          {car.maintenance && (
            <Section id="maintenance" label="Maintenance">
              <div className="max-w-170 prose">
                {renderText(car.maintenance)}
              </div>
            </Section>
          )}

          {/* Resources */}
          {car.resources?.length > 0 && (
            <Section id="resources" label="Resources">
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
            </Section>
          )}

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
      </main>
      <SiteFooter />
    </>
  )
}
