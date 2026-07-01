import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'About Us — Octane Files' }

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>About Us</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Octane Files is a curated encyclopedia of classic and collectible automobiles.
          Built for enthusiasts, collectors, and anyone who appreciates automotive history.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
