'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://www.octanefiles.com/auth/callback',
        queryParams: { prompt: 'select_account' },
      },
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
      className="fixed inset-0 z-[200] bg-overlay flex items-center justify-center p-6"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl pt-9 px-8 pb-8 w-full max-w-[400px] relative shadow-modal"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-text-tertiary flex items-center justify-center p-1 rounded-md"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <h2 className="text-xl font-bold text-text-primary tracking-[-0.02em] mb-2">
          Sign in to Octane Files
        </h2>
        <p className="text-body text-text-secondary leading-[1.6] mb-7">
          Sign in to post your cars, like builds, and join the community.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2.5 h-12 bg-white border border-border-mid rounded-full text-sm font-medium text-text-primary cursor-pointer transition-colors hover:bg-bg-elevated"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-label text-text-tertiary mt-5 text-center leading-[1.6]">
          By signing in you agree to our{' '}
          <Link href="/terms" onClick={onClose} className="text-text-secondary underline">terms</Link>
          {' '}and{' '}
          <Link href="/privacy" onClick={onClose} className="text-text-secondary underline">privacy policy</Link>.
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
    <div className="relative w-1/2 max-w-130 min-w-30">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Make, Model or Generation..."
        defaultValue={params.get('q') ?? ''}
        onChange={e => handleSearch(e.target.value)}
        className="w-full h-9 bg-bg-elevated border border-border rounded-full pl-9 pr-4 text-body text-text-primary outline-none transition-colors focus:border-border-mid focus:bg-white"
      />
    </div>
  )
}

function AvatarMenu({ profile, onSignOut }: { profile: NonNullable<Profile>, onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-transparent border-none cursor-pointer p-0 flex"
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
            width={32} height={32} className="avatar w-8 h-8" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center text-body font-semibold text-white">
            {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-xl shadow-dropdown min-w-[200px] z-[300] overflow-hidden">
          <div className="p-4 text-sm font-semibold text-text-primary">
            {profile.display_name ?? profile.username}
          </div>
          <div className="h-px bg-border" />
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-transparent border-none cursor-pointer text-sm text-text-primary text-left transition-colors hover:bg-bg-elevated"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function SiteHeader() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires INITIAL_SESSION immediately on mount — handles both
    // "already logged in" and "not logged in" cases without a separate getSession call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) { setProfile(null); return }

        // Show avatar immediately from Google OAuth metadata — no DB round-trip.
        const meta = session.user.user_metadata ?? {}
        setProfile({
          id: session.user.id,
          username: (session.user.email ?? '').split('@')[0],
          display_name: meta.full_name ?? meta.name ?? null,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          bio: null,
          location: null,
          website: null,
          created_at: '',
          updated_at: '',
        })

        // Update in background with the stored profile (bio, custom username, etc.)
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => { if (data) setProfile(data as Profile) })

        if (event === 'SIGNED_IN' && window.location.search.includes('code=')) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-white">
        <div className="site-container h-14 flex items-center gap-4">
          {/* Logo — always icon mark */}
          <Link href="/" className="flex items-center no-underline flex-shrink-0">
            <img src="/of-logo.svg" alt="Octane Files" className="h-8 w-auto" />
          </Link>

          {/* Search — centered, 50% width */}
          <div className="flex-1 flex justify-center">
            <Suspense fallback={<div className="w-1/2 h-9 rounded-full bg-bg-elevated" />}>
              <HeaderSearch />
            </Suspense>
          </div>

          <nav className="flex items-center gap-6 flex-shrink-0">
            <Link href="/" className="text-body text-text-secondary no-underline hover:text-text-primary transition-colors">
              Browse
            </Link>

            {profile === undefined ? null : profile === null ? (
              <button
                onClick={() => setShowSignIn(true)}
                className="btn-secondary px-3.5 py-1.5"
              >
                Sign In
              </button>
            ) : (
              <>
                <Link href="/garage" className="text-body text-text-secondary no-underline hover:text-text-primary transition-colors">
                  Garage
                </Link>
                <AvatarMenu profile={profile} onSignOut={signOut} />
              </>
            )}
          </nav>
        </div>
      </header>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
    </>
  )
}
