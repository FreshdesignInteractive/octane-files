import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { getModel, getModelSlugs } from '@/lib/supabase'
import type { Model } from '@/lib/types'

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
    <section id={id} style={{ borderTop: '1px solid var(--border)', paddingTop: 40, marginTop: 40 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 24,
      }}>
        {label}
      </h2>
      {children}
    </section>
  )
}

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const car: Model | null = await getModel(slug)
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
      return <p key={i} style={{ lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{para}</p>
    })
  }

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <div style={{
          position: 'relative',
          height: 'clamp(280px, 40vw, 520px)',
          background: '#0d0d0d',
          overflow: 'hidden',
        }}>
          <Image
            src={car.hero_image || '/placeholder.png'}
            alt={name}
            fill
            className={car.hero_image ? 'object-cover' : 'object-contain'}
            priority
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.3) 50%, transparent 100%)',
          }} />
          {/* Title over hero */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 32px 32px' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8,
              }}>
                {car.country} &middot; {car.class}
              </div>
              <h1 style={{
                fontSize: 'clamp(26px, 4vw, 44px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                lineHeight: 1.1,
                margin: 0,
              }}>
                {car.make} {car.model}
                {car.generation && <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}> {car.generation}</span>}
              </h1>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                {years}
                {car.units_produced && ` · ${car.units_produced.toLocaleString()} produced`}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 80px' }}>
          {/* Sticky subnav */}
          <nav style={{
            position: 'sticky', top: 56, zIndex: 40,
            background: 'rgba(10,10,10,0.95)',
            borderBottom: '1px solid var(--border)',
            marginLeft: -24, marginRight: -24, padding: '0 24px',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderBottom: '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'color 150ms',
                }}>
                  {s.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Quick stats bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 1,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            margin: '32px 0',
          }}>
            {[
              { label: 'Production', value: years },
              car.drivetrain && { label: 'Drivetrain', value: car.drivetrain },
              car.engine_layout && { label: 'Engine', value: car.engine_layout },
              car.body_styles?.length && { label: 'Body', value: car.body_styles.join(', ') },
              car.units_produced && { label: 'Units built', value: car.units_produced.toLocaleString() },
            ].filter(Boolean).map((stat: any) => (
              <div key={stat.label} style={{
                background: 'var(--bg-card)',
                padding: '16px 18px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Overview */}
          {car.overview && (
            <section id="overview" style={{ marginTop: 8 }}>
              <h2 style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 20,
              }}>Overview</h2>
              <div style={{ maxWidth: 680 }}>
                {renderText(car.overview)}
              </div>
            </section>
          )}

          {/* Specs */}
          {car.specs?.length > 0 && (
            <Section id="specs" label="Specifications">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
                {car.specs.map(group => (
                  <div key={group.group}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12,
                    }}>
                      {group.group}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {group.specs.map(spec => (
                        <div key={spec.label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          padding: '9px 0',
                          borderBottom: '1px solid var(--border)',
                          gap: 12,
                        }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>{spec.label}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{spec.value}</span>
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                maxWidth: 480,
                marginBottom: 20,
              }}>
                {[
                  { label: 'Entry / Driver', value: car.market_data.low },
                  { label: 'Mid / Nice', value: car.market_data.mid },
                  { label: 'Show / Concours', value: car.market_data.high },
                ].map(tier => (
                  <div key={tier.label} style={{ background: 'var(--bg-card)', padding: '18px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>
                      {tier.label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                      {tier.value ? formatMoney(tier.value) : '—'}
                    </div>
                  </div>
                ))}
              </div>
              {car.market_data.notes && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 600 }}>
                  {car.market_data.notes}
                </p>
              )}
              {car.market_data.as_of && (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  Values as of {new Date(car.market_data.as_of).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}.
                </p>
              )}
            </Section>
          )}

          {/* Maintenance */}
          {car.maintenance && (
            <Section id="maintenance" label="Maintenance">
              <div style={{ maxWidth: 680 }} className="prose">
                {renderText(car.maintenance)}
              </div>
            </Section>
          )}

          {/* Resources */}
          {car.resources?.length > 0 && (
            <Section id="resources" label="Resources">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
                {car.resources.map(r => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    textDecoration: 'none',
                    transition: 'border-color 150ms',
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize', marginTop: 2 }}>{r.type}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Back */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            <Link href="/" style={{
              fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
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
