import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'Contact Us — Octane Files' }

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Contact Us</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Have a question or want to get in touch? Reach us at{' '}
          <a href="mailto:hello@octanefiles.com" style={{ color: '#111', fontWeight: 500 }}>
            hello@octanefiles.com
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
