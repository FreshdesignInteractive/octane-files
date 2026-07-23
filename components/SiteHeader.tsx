'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { checkIsAdmin } from '@/lib/is-admin'
import SignInDialog from '@/components/SignInDialog'
import NoCarsFound from '@/components/NoCarsFound'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Profile, CarSummary } from '@/lib/types'
import { PLACEHOLDER_HERO_IMAGE } from '@/lib/placeholder-images'

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// The full search experience, in an overlay opened on demand — same
// trigger-opens-a-dimmed-modal shell as SignInDialog, so this isn't new
// modal mechanics, just a new use of the existing pattern. Everything below
// (whole-catalog fetch + local typeahead filtering, Enter-to-run-a-full-
// catalog-search) is unchanged from when this lived inline in the header;
// only the container changed from "always visible" to "opens on demand".
function SearchDialog({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<CarSummary[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  // Full-text search always lands on /browse. If the dialog was opened
  // while already on /browse, its other active filters (make/class/era/
  // sort) carry over — opened from anywhere else, it starts from a clean
  // ?q= only, ignoring whatever unrelated params that other page has.
  function runFullSearch(value: string) {
    const p = new URLSearchParams(pathname === '/browse' ? params.toString() : '')
    if (value) p.set('q', value)
    else p.delete('q')
    onClose()
    router.push(`/browse?${p.toString()}`, { scroll: false })
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/models?limit=500')
      .then(r => r.json())
      .then(({ data }: { data: CarSummary[] }) => { if (!cancelled) setCatalog(data ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const suggestions = q
    ? catalog.filter(c => `${c.make} ${c.model} ${c.generation}`.toLowerCase().includes(q)).slice(0, 6)
    : []

  function selectCar(slug: string) {
    onClose()
    router.push(`/cars/${slug}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectCar(suggestions[activeIndex].slug); return }
    }
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      runFullSearch(query)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[var(--z-overlay)] bg-overlay flex items-start justify-center p-3 sm:p-6 sm:pt-[15vh]"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-150 shadow-modal overflow-hidden"
      >
        <div className="relative border-b border-border">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Make, Model or Generation..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
            onKeyDown={handleKeyDown}
            // text-base (16px), not text-body (13px) — iOS Safari
            // auto-zooms the whole page on focusing any input under 16px,
            // which is exactly the "page zooms in" bug this fixes.
            className="w-full h-14 pl-11 pr-11 text-base text-text-primary outline-none border-none rounded-t-2xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setActiveIndex(-1); inputRef.current?.focus() }}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary bg-transparent border-none cursor-pointer p-0 flex items-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {suggestions.length > 0 ? (
          <div className="max-h-96 overflow-y-auto py-1">
            {suggestions.map((car, i) => (
              <Link
                key={car.id}
                href={`/cars/${car.slug}`}
                onClick={onClose}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-4 py-2.5 no-underline transition-colors hover:bg-bg-elevated ${i === activeIndex ? 'bg-bg-elevated' : ''}`}
              >
                <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-bg-elevated flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- hero_image can be any manually-pasted external URL, not just Supabase/Wikimedia; next/image throws on unlisted hostnames, a plain img never does */}
                  <img src={car.hero_image || PLACEHOLDER_HERO_IMAGE} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-body text-text-primary">
                  {car.make} {car.model} {car.generation}
                </span>
              </Link>
            ))}
          </div>
        ) : q ? (
          <NoCarsFound compact onLinkClick={onClose} />
        ) : (
          <p className="text-body text-text-tertiary px-4 py-6 text-center m-0">
            Start typing a make, model, or generation.
          </p>
        )}
      </div>
    </div>
  )
}

// Always-mounted trigger (button + ⌘K/Ctrl+K listener) for the dialog
// above. Kept as its own component, inside the same Suspense boundary the
// dialog needs for useSearchParams, so opening/closing the dialog doesn't
// require a second Suspense boundary of its own.
function SearchTrigger() {
  const pathname = usePathname()
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
      {open && <SearchDialog onClose={() => setOpen(false)} pathname={pathname} />}
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
            <Suspense fallback={<span className="w-15 h-5" />}>
              <SearchTrigger />
            </Suspense>

            <Link href="/browse" className="text-body text-text-secondary no-underline hover:text-text-primary transition-colors">
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
