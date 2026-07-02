'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { Profile } from '@/lib/types'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  async function signInWithGoogle() {
    const supabase = createClient()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/auth/callback` },
    })
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '36px 32px 32px',
          width: '100%',
          maxWidth: 400,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4, borderRadius: 6,
          }}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Sign in to Octane Files
        </h2>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 28 }}>
          Sign in to post your cars, like builds, and join the community.
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            height: 48,
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: 99,
            fontSize: 14, fontWeight: 500, color: '#1a1a1a',
            cursor: 'pointer',
            transition: 'background 150ms, border-color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p style={{ fontSize: 11, color: '#aaa', marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
          By signing in you agree to our{' '}
          <Link href="/terms" onClick={onClose} style={{ color: '#666', textDecoration: 'underline' }}>terms</Link>
          {' '}and{' '}
          <Link href="/privacy" onClick={onClose} style={{ color: '#666', textDecoration: 'underline' }}>privacy policy</Link>.
        </p>
      </div>
    </div>
  )
}

function HeaderSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSearch(value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set('q', value)
    else p.delete('q')
    router.push(`/?${p.toString()}`, { scroll: false })
  }

  return (
    <div style={{ position: 'relative', width: '50%', maxWidth: 520, minWidth: 120 }}>
      <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Make, Model or Generation..."
        defaultValue={params.get('q') ?? ''}
        onChange={e => handleSearch(e.target.value)}
        style={{
          width: '100%',
          height: 36,
          background: '#f5f5f5',
          border: '1px solid #e8e8e8',
          borderRadius: 99,
          padding: '0 16px 0 36px',
          fontSize: 13,
          color: '#111',
          outline: 'none',
        }}
        onFocus={e => { e.target.style.borderColor = '#bbb'; e.target.style.background = '#fff' }}
        onBlur={e => { e.target.style.borderColor = '#e8e8e8'; e.target.style.background = '#f5f5f5' }}
      />
    </div>
  )
}

export default function SiteHeader() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(data ?? null)
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <header style={{ borderBottom: '1px solid var(--border)', background: '#ffffff' }}
        className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* Logo — always icon mark */}
          <Link href="/" className="flex items-center no-underline flex-shrink-0">
            <img src="/of-logo.svg" alt="Octane Files" style={{ height: 32, width: 'auto' }} />
          </Link>

          {/* Search — centered, 50% width */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Suspense fallback={<div style={{ width: '50%', height: 36, borderRadius: 99, background: '#f5f5f5' }} />}>
              <HeaderSearch />
            </Suspense>
          </div>

          <nav className="flex items-center gap-6 flex-shrink-0">
            <Link href="/" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
              className="hover:text-black transition-colors">
              Browse
            </Link>

            {profile === undefined ? null : profile === null ? (
              <button
                onClick={() => setShowSignIn(true)}
                style={{
                  fontSize: 13, fontWeight: 500, color: '#111111',
                  border: '1px solid #d0d0d0', borderRadius: 6,
                  padding: '5px 14px', background: 'none', cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <a href={`/garage/${profile.username}`} style={{
                  fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
                }} className="hover:text-black transition-colors">
                  My Garage
                </a>
                <button onClick={signOut} style={{
                  fontSize: 13, color: 'var(--text-tertiary)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }} className="hover:text-black transition-colors">
                  Sign Out
                </button>
                {profile.avatar_url && (
                  <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
                    width={28} height={28}
                    style={{ borderRadius: '50%', objectFit: 'cover' }} />
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
    </>
  )
}
