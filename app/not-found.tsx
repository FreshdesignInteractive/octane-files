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
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: '#999', textTransform: 'uppercase', marginBottom: 16 }}>
          404
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 700, color: '#111', marginBottom: 12, lineHeight: 1.1 }}>
          Page not found
        </h1>
        <p style={{ fontSize: 15, color: '#666', marginBottom: 32, maxWidth: 360 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 40,
          padding: '0 20px',
          background: '#111',
          color: '#fff',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
        }}>
          ← Back to browse
        </Link>
      </main>
    </>
  )
}
