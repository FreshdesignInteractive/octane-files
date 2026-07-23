import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import BackToTop from '@/components/BackToTop'
import { getFilterableMakes } from '@/lib/supabase'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Marques',
  description: 'Every marque in the Octane Files collection, A to Z.',
}

// Same shield glyph the car detail page's sidebar "Marque" row already
// uses — one icon standing in for every marque, not a per-marque logo (the
// data model has no logo field), so reusing the established icon keeps
// this visually tied to that row rather than inventing a new marque motif.
function MarqueIcon() {
  return (
    <svg
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-text-secondary shrink-0"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

export default async function MarquesPage() {
  const makes = await getFilterableMakes()
  // Sorted by whatever's actually displayed (full_name, falling back to
  // the short name) — not the RPC's own `mk.name` order, which is correct
  // for the Make filter dropdown but would file a marque like Porsche
  // (legal full name starts with "Dr.") somewhere a visitor wouldn't
  // expect on an A-Z page keyed to the name they can actually see.
  const sorted = [...makes].sort((a, b) =>
    (a.full_name || a.name).localeCompare(b.full_name || b.name)
  )

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="site-container pt-10 pb-20">
          <h1 className="text-heading font-bold text-text-primary mb-8">Marques</h1>

          <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {sorted.map(make => (
              <Link
                key={make.slug}
                href={`/marques/${make.slug}`}
                className="card p-5 flex items-center gap-4 no-underline"
              >
                <MarqueIcon />
                <div className="min-w-0">
                  <div className="text-paragraph font-bold text-text-primary truncate">
                    {make.full_name || make.name}
                  </div>
                  <div className="text-body text-text-tertiary">{make.country}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
      <BackToTop />
    </>
  )
}
