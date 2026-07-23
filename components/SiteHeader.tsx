'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { checkIsAdmin } from '@/lib/is-admin'
import SignInDialog from '@/components/SignInDialog'
import SearchBox, { SearchIcon } from '@/components/SearchBox'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

// Always-mounted trigger (button + ⌘K/Ctrl+K listener) for the search
// modal.
function SearchTrigger() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 text-body text-text-secondary hover:text-text-primary transition-colors"
      >
        <SearchIcon />
        Search
      </button>
      {open && <SearchBox variant="modal" onClose={() => setOpen(false)} />}
    </>
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
        <div className="absolute top-[calc(100%+var(--spacing-dropdown-gap))] right-0 bg-white rounded-xl shadow-dropdown min-w-50 z-[var(--z-overlay)] overflow-hidden">
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
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires INITIAL_SESSION immediately on mount — handles both
    // "already logged in" and "not logged in" cases without a separate getSession call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // requireAdmin() (and anything else gating a page behind sign-in)
      // redirects here with ?signin=1 since there's no dedicated /login
      // route — this is what actually opens the dialog on arrival. Checked
      // once, on the same INITIAL_SESSION firing used for the rest of this
      // mount-time setup below.
      if (event === 'INITIAL_SESSION' && window.location.search.includes('signin=1')) {
        setShowSignIn(true)
        router.replace(window.location.pathname)
      }

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
          router.replace(window.location.pathname)
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white">
        <div className="w-full px-10 h-14 flex items-center gap-4">
          {/* Logo — always icon mark */}
          <Link href="/" className="flex items-center no-underline flex-shrink-0">
            <img src="/of-logo.svg" alt="Octane Files" className="h-8 w-auto" />
          </Link>

          {/* Pushes the nav group to the right — search is now a modal
              trigger, not a persistent inline box, so there's no reason to
              reserve center space for it (more room for future portal nav
              items, per the NerdWallet-style direction). */}
          <div className="flex-1" />

          <nav className="flex items-center gap-6 flex-shrink-0">
            <SearchTrigger />

            <Link href="/browse" className="text-body text-text-secondary no-underline hover:text-text-primary transition-colors">
              Browse Cars
            </Link>

            <Link href="/marques" className="text-body text-text-secondary no-underline hover:text-text-primary transition-colors">
              Marques
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
