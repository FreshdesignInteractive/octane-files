import { Suspense } from 'react'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import FilterBar from '@/components/FilterBar'
import CarGrid from '@/components/CarGrid'
import BackToTop from '@/components/BackToTop'

export const metadata: Metadata = {
  title: 'Browse Cars',
  description: 'The definitive reference for collector cars — specs, history, market data, and maintenance for the cars that matter.',
}

// Static shell — no server-side Supabase calls.
// CarGrid fetches its own data from /api/models client-side.
export default function BrowsePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border-subtle bg-bg-subtle py-5">
          <div className="site-container">
            <Suspense>
              <FilterBar />
            </Suspense>
          </div>
        </section>

        <section className="site-container pt-8 pb-20">
          <Suspense>
            <CarGrid />
          </Suspense>
        </section>
      </main>

      <SiteFooter />
      <BackToTop />
    </>
  )
}
