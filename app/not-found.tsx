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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 8 }}>
          404
        </h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
          This page could not be found.
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
