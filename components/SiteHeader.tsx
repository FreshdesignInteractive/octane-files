'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { checkIsAdmin } from '@/lib/is-admin'
import SignInDialog from '@/components/SignInDialog'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Profile, CarSummary } from '@/lib/types'

function HeaderSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Always starts empty — search is ephemeral, not something that persists
  // across a reload. A hard refresh (or a bookmarked/shared link with a
  // stale ?q=) strips the param below rather than restoring it into the box.
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<CarSummary[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Typing only drives the dropdown, locally — it never touches the URL or
  // the page behind it. The page only changes on a deliberate action:
  // picking a suggestion, or pressing Enter to run a full catalog search.
  // (Previously this pushed a new URL on every keystroke, which made the
  // homepage grid run its own full-text search in parallel and blank out
  // to "No cars found" while the dropdown — correct — still showed matches.)
  function handleType(value: string) {
    setQuery(value)
    setOpen(value.trim() !== '')
    setActiveIndex(-1)
  }

  function runFullSearch(value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set('q', value)
    else p.delete('q')
    router.push(`/?${p.toString()}`, { scroll: false })
  }

  // Fetches the whole (small, ~300-row) catalog once on mount and filters
  // client-side — same pattern the admin car-picker already uses. No
  // per-keystroke network requests, no debounce, no race conditions, and
  // plain substring matching means "corv" finds "Corvette" immediately —
  // full-text search (used for the homepage grid below) only matches whole
  // stemmed words, which isn't what a typeahead should do.
  useEffect(() => {
    let cancelled = false
    fetch('/api/models?limit=500')
      .then(r => r.json())
      .then(({ data }: { data: CarSummary[] }) => { if (!cancelled) setCatalog(data ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Runs once per real page load (this component lives in the root layout,
  // so it only remounts on a hard refresh, not on client-side navigation).
  useEffect(() => {
    if (params.get('q')) {
      const p = new URLSearchParams(params.toString())
      p.delete('q')
      router.replace(p.toString() ? `/?${p.toString()}` : '/', { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only, deliberately not re-running on every params change
  }, [])

  const q = query.trim().toLowerCase()
  const suggestions = q
    ? catalog.filter(c => `${c.make} ${c.model} ${c.generation}`.toLowerCase().includes(q)).slice(0, 6)
    : []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectCar(slug: string) {
    setOpen(false)
    router.push(`/cars/${slug}`)
  }

  function clearSearch() {
    setQuery('')
    setOpen(false)
    runFullSearch('') // in case a full search was already active, reset the grid too
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectCar(suggestions[activeIndex].slug); return }
      if (e.key === 'Escape') { setOpen(false); return }
    }
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      setOpen(false)
      runFullSearch(query)
    }
  }

  return (
    <div ref={wrapRef} className="relative w-1/2 max-w-130 min-w-30">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Make, Model or Generation..."
        value={query}
        onChange={e => handleType(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        onKeyDown={handleKeyDown}
        className="w-full h-9 bg-bg-elevated border border-border rounded-full pl-9 pr-9 text-body text-text-primary outline-none transition-colors focus:border-border-mid focus:bg-white"
      />
      {query && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary bg-transparent border-none cursor-pointer p-0 flex items-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+var(--spacing-dropdown-gap))] left-0 right-0 bg-white border border-border rounded-lg shadow-dropdown z-[var(--z-overlay)] overflow-hidden">
          {suggestions.map((car, i) => (
            <Link
              key={car.id}
              href={`/cars/${car.slug}`}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center gap-3 px-3 py-2 no-underline transition-colors hover:bg-bg-elevated ${i === activeIndex ? 'bg-bg-elevated' : ''}`}
            >
              <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-bg-elevated flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- hero_image can be any manually-pasted external URL, not just Supabase/Wikimedia; next/image throws on unlisted hostnames, a plain img never does */}
                <img src={car.hero_image || '/placeholder.png'} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-body text-text-primary">
                {car.make} {car.model} {car.generation}
              </span>
            </Link>
          ))}
        </div>
      )}
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
        <div className="absolute top-[calc(100%+var(--spacing-dropdown-gap))] right-0 bg-white rounded-xl shadow-dropdown min-w-[200px] z-[var(--z-overlay)] overflow-hidden">
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
      // requireAdmin() (and anything else gating a page behind sign-in)
      // redirects here with ?signin=1 since there's no dedicated /login
      // route — this is what actually opens the dialog on arrival. Checked
      // once, on the same INITIAL_SESSION firing used for the rest of this
      // mount-time setup below.
      if (event === 'INITIAL_SESSION' && window.location.search.includes('signin=1')) {
        setShowSignIn(true)
        window.history.replaceState({}, '', window.location.pathname)
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
        <div className="w-full px-10 h-14 flex items-center gap-4">
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
