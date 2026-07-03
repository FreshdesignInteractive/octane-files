import { Suspense } from 'react'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import FilterBar from '@/components/FilterBar'
import CarGrid from '@/components/CarGrid'

// Static shell — no server-side Supabase calls.
// CarGrid fetches its own data from /api/models client-side.
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-white">
        <section className="border-b border-border bg-white py-5">
          <div className="site-container">
            <Suspense>
              <FilterBar />
            </Suspense>
          </div>
        </section>

        <section className="site-container bg-white pt-8 pb-20">
          <Suspense>
            <CarGrid />
          </Suspense>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
