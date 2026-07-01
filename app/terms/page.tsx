import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'Terms of Use — Octane Files' }

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Terms of Use</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 40 }}>Last updated: June 2026</p>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          This page is coming soon. Our terms of use will outline the rules and guidelines
          for using the Octane Files platform.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
