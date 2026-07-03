import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'Terms of Use — Octane Files' }

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20">
        <div className="max-w-180">
          <h1 className="text-heading font-bold tracking-[-0.03em] mb-2">Terms of Use</h1>
          <p className="text-body text-text-tertiary mb-10">Last updated: June 2026</p>
          <p className="text-base text-text-secondary leading-[1.8]">
            This page is coming soon. Our terms of use will outline the rules and guidelines
            for using the Octane Files platform.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
