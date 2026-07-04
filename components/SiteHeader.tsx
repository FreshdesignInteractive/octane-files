'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { checkIsAdmin } from '@/lib/is-admin'
import SignInDialog from '@/components/SignInDialog'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

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

function AvatarMenu({ profile, isAdmin, onSignOut }: { profile: NonNullable<Profile>, isAdmin: boolean, onSignOut: () => void }) {
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
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary no-underline transition-colors hover:bg-bg-elevated"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Admin
            </Link>
          )}
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires INITIAL_SESSION immediately on mount — handles both
    // "already logged in" and "not logged in" cases without a separate getSession call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) { setProfile(null); setIsAdmin(false); return }

        checkIsAdmin(supabase).then(setIsAdmin)

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
          .then(({ data }: { data: Profile | null }) => { if (data) setProfile(data) })

        if (event === 'SIGNED_IN' && window.location.search.includes('code=')) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsAdmin(false)
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
                <AvatarMenu profile={profile} isAdmin={isAdmin} onSignOut={signOut} />
              </>
            )}
          </nav>
        </div>
      </header>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
    </>
  )
}
