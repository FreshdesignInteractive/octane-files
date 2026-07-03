import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 57px)',
        padding: '0 24px',
        textAlign: 'center',
        background: '#f2f2f2',
      }}>
        <h1 style={{ fontSize: 120, fontWeight: 800, color: '#111', lineHeight: 1, marginBottom: 24 }}>
          404
        </h1>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 16 }}>
          Page not found
        </h2>
        <p style={{ fontSize: 18, color: '#666', marginBottom: 40, maxWidth: 480, lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Head back home and find what you need.
        </p>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 56,
          padding: '0 36px',
          background: '#111',
          color: '#fff',
          borderRadius: 999,
          fontSize: 16,
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          ‹ Back to home
        </Link>
      </main>
    </>
  )
}
