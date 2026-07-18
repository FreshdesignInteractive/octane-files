import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ReportForm from '@/components/ReportForm'

export const metadata = { title: 'Report a mistake' }

// General report flow, not tied to a specific car — linked from the About
// page's trust-section "Tell us" copy. Same ReportForm + sign-in gating as
// /cars/[slug]/report, just without the car lookup/preview card.
export default function ReportPage() {
  return (
    <>
      <SiteHeader />
      <main className="detail-container pt-15 pb-20 flex-1">
        <div className="max-w-125">
          <h1 className="text-heading font-bold mb-2">Report a mistake</h1>
          <p className="text-paragraph text-text-secondary mb-6">
            Spotted something wrong on the site? Let us know.
          </p>

          <ReportForm />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
