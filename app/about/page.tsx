import Link from 'next/link'
import Image from 'next/image'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ScrollReveal from '@/components/ScrollReveal'
import { getLiveCarCount } from '@/lib/supabase'

export const revalidate = 3600

export const metadata = {
  title: 'About',
  description: 'A curated encyclopedia of collector cars. Why each one matters, which to look for, and what owning one is really like. Every number verified.',
}

const HERO_LINES: { line: string; image?: string; alt?: string }[] = [
  {
    line: 'The car on your bedroom wall.',
    image: '/about-pic-1.webp',
    alt: 'A poster of a classic car on a bedroom wall, the kind every collector remembers staring at.',
  },
  {
    line: 'The one your father kept under a cover.',
    image: '/about-pic-2.webp',
    alt: 'A car under a cover in a home garage, the cover half pulled back.',
  },
  {
    line: 'The one you sold when life got practical, then spent twenty years tracking down.',
    image: '/about-pic-3.webp',
    alt: 'A faded snapshot-style photo of a classic car in a driveway.',
  },
  {
    line: 'You never got over it.',
    image: '/about-pic-4.webp',
    alt: 'A close-up detail shot, hands on the wheel of a classic car.',
  },
  {
    line: 'You were never supposed to.',
    image: '/about-pic-5.webp',
    alt: 'The same classic car, uncovered and out on the road.',
  },
]

const VALUE_CARDS = [
  {
    title: 'Why it matters',
    line: 'The case for the car. The story, not a restated spec sheet.',
    icon: (
      <>
        <path d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      </>
    ),
  },
  {
    title: 'Which one to look for',
    line: 'The variants and trims that matter, ranked.',
    icon: (
      <>
        <path d="m12.83 2.18 8.58 3.9a1 1 0 0 1 0 1.83l-8.58 3.91a2 2 0 0 1-1.66 0L2.6 8.09a1 1 0 0 1 0-1.83l8.58-3.9a2 2 0 0 1 1.66 0z" />
        <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.6" />
        <path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.6" />
      </>
    ),
  },
  {
    title: 'What owning one is like',
    line: 'What breaks, what it costs, what to expect. Stated plainly.',
    icon: (
      <>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
      </>
    ),
  },
  {
    title: 'How it scores',
    line: 'Eight scores per car. Honest, not flattering.',
    icon: (
      <>
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </>
    ),
  },
]

const PROCESS_STEPS = [
  {
    step: '1. Research',
    line: 'Marque authorities first: NCRS for Corvettes, Marti Reports for Fords, Galen Govier for Mopars. Not the first search result.',
  },
  {
    step: '2. Verify',
    line: 'Every production figure, date, and price checked this session or written around. When sources disagree, we say so on the page.',
  },
  {
    step: '3. Write',
    line: 'Original prose, written to be read. The Ford fracture, not "hand crank quirks."',
  },
  {
    step: '4. Review',
    line: 'AI helps research and draft. A human reads every page before it ships.',
  },
]

export default async function AboutPage() {
  const carCount = await getLiveCarCount()

  return (
    <>
      <SiteHeader />
      <main className="flex-1">

        {/* ── Section 1 — Hero ──────────────────────────────────────────
            One 16:9 card per line, same detail-container/1120px content
            width as every other section on this page. Cards without a
            photo yet keep bg-text-primary (an existing token) as a
            placeholder fill so the boundary is visible; swap each one for
            a real photo + alt text as they're sourced. */}
        <section className="detail-container py-16 sm:py-20">
          <div className="flex flex-col gap-12">
            {HERO_LINES.map(({ line, image, alt }) => (
              <ScrollReveal key={line}>
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-text-primary flex items-center justify-center p-6 sm:p-10">
                  {image && (
                    <>
                      <Image src={image} alt={alt ?? ''} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-overlay to-transparent" />
                    </>
                  )}
                  <p className="relative text-hero font-bold text-white text-center m-0">
                    {line}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── Section 2 — The reveal ────────────────────────────────── */}
        <section className="detail-container py-20">
          <ScrollReveal className="max-w-180 mx-auto text-center">
            <h2 className="text-hero font-bold text-text-primary mb-6">
              Every car here earned its page.
            </h2>
            <p className="text-paragraph text-text-secondary leading-relaxed">
              Octane Files is a curated encyclopedia of collector cars. Not every car
              ever made, but the ones people never got over, and everything actually
              worth knowing about them. Written to be read, not skimmed. Built for the
              evening you sit down to look one thing up and lose track of time.
            </p>
          </ScrollReveal>
        </section>

        {/* ── Section 3 — What you'll find ──────────────────────────── */}
        <section className="detail-container py-20">
          <ScrollReveal>
            <p className="text-paragraph text-text-secondary text-center max-w-160 mx-auto mb-12">
              The spec sheets are everywhere. The judgment isn&apos;t. Every page gives you:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUE_CARDS.map(card => (
                <div
                  key={card.title}
                  className="bg-white border border-border rounded-2xl p-6"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent mb-4">
                    {card.icon}
                  </svg>
                  <div className="text-body font-semibold text-text-primary mb-1.5">{card.title}</div>
                  <p className="text-body text-text-secondary leading-relaxed m-0">{card.line}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ── Section 4 — How a page gets made ──────────────────────── */}
        <section className="detail-container py-20">
          <ScrollReveal>
            <h2 className="text-hero font-bold text-text-primary text-center max-w-180 mx-auto mb-12">
              If we state a number, we verified it.
            </h2>
            <div className="bg-bg-elevated border border-border rounded-2xl p-8 sm:p-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {PROCESS_STEPS.map((s, i) => (
                  <div key={s.step} className={i > 0 ? 'sm:border-l sm:border-border sm:pl-8' : ''}>
                    <div className="text-label font-bold tracking-widest text-accent-secondary uppercase mb-2">{s.step}</div>
                    <p className="text-body text-text-secondary leading-relaxed m-0">{s.line}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-body text-text-secondary text-center mt-8">
              Spot something wrong? <Link href="/report" className="text-accent underline">Tell us.</Link>{' '}We&apos;d rather fix it than defend it.
            </p>
          </ScrollReveal>
        </section>

        {/* ── Section 5 — Stats band ────────────────────────────────── */}
        <section className="w-full bg-bg-elevated border-t border-b border-border">
          <div className="detail-container py-16">
            <ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
                <div>
                  <div className="text-hero font-bold text-accent-secondary tracking-heading">{carCount}</div>
                  <p className="text-body text-text-secondary mt-2 mb-0">Cars in the encyclopedia, each chosen on purpose</p>
                </div>
                <div>
                  <div className="text-hero font-bold text-accent-secondary tracking-heading">8</div>
                  <p className="text-body text-text-secondary mt-2 mb-0">Dimensions scored on every car, rarity to driving thrill</p>
                </div>
                <div>
                  <div className="text-hero font-bold text-accent-secondary tracking-heading">1</div>
                  <p className="text-body text-text-secondary mt-2 mb-0">Rule: if we state a number, we verified it</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Section 6 — Where we're going ─────────────────────────── */}
        <section className="detail-container py-20">
          <ScrollReveal className="max-w-160 mx-auto text-center">
            <h2 className="text-heading font-bold text-text-primary mb-3">
              The encyclopedia is where we start.
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              We&apos;re building Octane Files into the place collector car enthusiasts go
              first. For knowledge now, and for more down the road.
            </p>
          </ScrollReveal>
        </section>

        {/* ── Section 7 — Closing CTA ───────────────────────────────── */}
        <section className="w-full bg-bg-elevated border-t border-border">
          <div className="detail-container py-16 flex flex-col items-center gap-6 text-center">
            <ScrollReveal className="flex flex-col items-center gap-6">
              <p className="text-hero font-bold text-text-primary m-0">
                Start with the car you never got over.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/" className="btn-primary h-11 px-6">Explore the encyclopedia</Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
