import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'Privacy Policy — Octane Files' }

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20">
        <div className="max-w-180">
          <h1 className="text-heading font-bold tracking-[-0.03em] mb-2">Privacy Policy</h1>
          <p className="text-body text-text-tertiary mb-10">Last updated: June 2026</p>
          <p className="text-base text-text-secondary leading-[1.8]">
            This page is coming soon. Our privacy policy will describe how Octane Files collects,
            uses, and protects your personal information.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
