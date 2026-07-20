import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ReportForm from '@/components/ReportForm'
import { getModel } from '@/lib/supabase'
import { PLACEHOLDER_HERO_IMAGE } from '@/lib/placeholder-images'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const car = await getModel(slug)
  if (!car) return { title: 'Not Found' }
  const name = `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`
  return { title: `Report a mistake — ${name}` }
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const car = await getModel(slug)
  if (!car) notFound()

  const name = `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`

  return (
    <>
      <SiteHeader />
      <main className="detail-container pt-15 pb-20 flex-1">
        <div className="max-w-125">
          <Link href={`/cars/${car.slug}`} className="text-body text-text-secondary no-underline inline-flex items-center gap-2 mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Back to {name}
          </Link>

          <h1 className="text-heading font-bold mb-2">Report a mistake</h1>
          <p className="text-paragraph text-text-secondary mb-6">
            Let us know what issue you find with this vehicle profile.
          </p>

          <div className="flex items-center gap-3 mb-8 p-3 border border-border rounded-lg bg-white">
            <div className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-elevated">
              <Image
                src={car.hero_image || PLACEHOLDER_HERO_IMAGE}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="text-body font-semibold text-text-primary">{name}</div>
          </div>

          <ReportForm carName={name} carSlug={car.slug} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
