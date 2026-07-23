import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import SearchBox from '@/components/SearchBox'
import CarGrid from '@/components/CarGrid'
import BackToTop from '@/components/BackToTop'

export const metadata: Metadata = { title: 'Search' }

// Reached only by pressing Enter in the header search (SearchBox's
// runFullSearch) — a text search has no filters to show alongside it, so
// this is a dedicated page rather than reusing /browse's filter bar +
// grid layout. Landing here with no ?q= (a typed/bookmarked bare /search
// URL) has nothing to search for, so it redirects to /browse instead of
// rendering an empty page with no way to filter.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  if (!q) redirect('/browse')

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border-subtle bg-bg-subtle py-5">
          <div className="site-container">
            <SearchBox variant="inline" initialQuery={q} />
          </div>
        </section>

        <section className="site-container pt-8 pb-20">
          <Suspense>
            <CarGrid noResultsHint="Try adjusting your search or request a car to be added." />
          </Suspense>
        </section>
      </main>

      <SiteFooter />
      <BackToTop />
    </>
  )
}
