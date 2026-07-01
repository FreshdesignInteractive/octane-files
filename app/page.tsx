import { Suspense } from 'react'
import SiteHeader from '@/components/SiteHeader'
import FilterBar from '@/components/FilterBar'
import CarGrid from '@/components/CarGrid'

// Static shell — no server-side Supabase calls.
// CarGrid fetches its own data from /api/models client-side.
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main style={{ flex: 1, background: '#ffffff' }}>
        <section style={{
          borderBottom: '1px solid var(--border)',
          padding: '20px 24px',
          background: '#ffffff',
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Suspense>
              <FilterBar />
            </Suspense>
          </div>
        </section>

        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px', background: '#ffffff' }}>
          <Suspense>
            <CarGrid />
          </Suspense>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', background: '#ffffff' }}>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          &copy; {new Date().getFullYear()} Freshdesign Interactive, Inc.
        </p>
      </footer>
    </>
  )
}
