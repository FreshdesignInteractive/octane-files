import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import BackToTop from '@/components/BackToTop'
import CarCard from '@/components/CarCard'
import { createClient } from '@/lib/supabase-server'
import { getModels } from '@/lib/supabase'
import type { MakeRecord } from '@/lib/car-schema'

export const revalidate = 3600

// Server-rendered (not the homepage's client-fetched CarGrid) specifically
// for SEO: the full car grid needs to be in the initial HTML, not built up
// after a client-side fetch. getModels({ make }) already supports this
// exact filter (used by the homepage's own ?make= browse filter) — no new
// query needed, just called directly here instead of through /api/models.
// 200 is comfortably above any real marque's catalog size in this dataset
// (the largest today is under 20) — no pagination for v1, matching "the
// grid is the page."
const MAX_CARS = 200

async function getMake(slug: string): Promise<MakeRecord | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('makes')
    .select('id, name, slug, country, full_name, intro_text')
    .eq('slug', slug)
    .single()
  return (data as MakeRecord) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const make = await getMake(slug)
  if (!make) return { title: 'Not Found' }
  const name = make.full_name || make.name
  const description = `Every ${name} generation in the Octane Files collection — specs, history, and market data for the cars that matter.`
  return {
    title: name,
    description,
    openGraph: { title: name, description, type: 'website' },
    twitter: { card: 'summary', title: name, description },
  }
}

export default async function MarquePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const make = await getMake(slug)
  if (!make) notFound()

  const { data: cars } = await getModels({ make: make.name, limit: MAX_CARS })
  const name = make.full_name || make.name

  return (
    <>
      <SiteHeader />
      <main className="detail-container pt-8 pb-20 flex-1">
        <div className="flex items-center gap-1 text-xs mb-6">
          <Link href="/marques" className="text-accent no-underline">Marques</Link>
          <span className="text-text-tertiary">&rsaquo;</span>
          <span className="text-text-primary">{name}</span>
        </div>

        <div className="max-w-170 mb-10">
          <h1 className="text-heading font-bold text-text-primary mb-2">{name}</h1>
          <div className="text-body text-text-tertiary">{make.country}</div>
          {make.intro_text && (
            <p className="text-paragraph text-text-secondary leading-relaxed mt-4 m-0">{make.intro_text}</p>
          )}
        </div>

        {/* Sponsor unit slot — intentionally empty, nothing rendered yet.
            Reserved so a future sponsor placement doesn't need to
            renegotiate this page's layout when it's added. */}

        {cars.length > 0 ? (
          <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {cars.map(car => <CarCard key={car.id} car={car} />)}
          </div>
        ) : (
          <p className="text-body text-text-tertiary">No cars from {name} in the Octane Files collection yet.</p>
        )}
      </main>
      <SiteFooter />
      <BackToTop />
    </>
  )
}
