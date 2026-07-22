import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import RequestCarForm from '@/components/RequestCarForm'

export const metadata: Metadata = { title: 'Request to Add a Car — Octane Files' }

export default async function RequestCarPage({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
  const { car } = await searchParams
  return (
    <>
      <SiteHeader />
      <main className="detail-container pt-15 pb-20 flex-1">
        <div className="max-w-125 mx-auto text-center">
          {/* Placeholder icon — swap for a real illustration whenever one's ready */}
          <svg
            width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-text-tertiary mx-auto mb-6"
          >
            <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h1m14-6a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-1" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </svg>

          <h1 className="text-heading font-bold mb-2">Request to Add a Car</h1>
          <p className="text-paragraph text-text-secondary mb-8">
            Let us know what car is missing and we&apos;ll take a look.
          </p>

          <div className="text-left">
            <RequestCarForm initialMessage={car} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
