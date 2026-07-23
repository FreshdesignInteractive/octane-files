'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NoCarsFound from './NoCarsFound'
import type { CarSummary } from '@/lib/types'
import { PLACEHOLDER_HERO_IMAGE } from '@/lib/placeholder-images'

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// Shared engine behind every search entry point: the header's on-demand
// modal (variant="modal") and the dedicated /search page's always-visible
// bar (variant="inline"). Both fetch the same whole-catalog snapshot once
// and filter it client-side for instant typeahead suggestions; Enter on
// either one runs a full-catalog relevance search and lands on /search —
// a dedicated page, not /browse, since a text search has no filters to
// show alongside it (see NoCarsFound's hint text differing from Browse's
// empty state for the same reason).
export default function SearchBox({
  variant,
  onClose,
  initialQuery = '',
}: {
  variant: 'modal' | 'inline'
  // Required for variant="modal" (closes the dialog). Unused for
  // variant="inline" — there's nothing to close, the page itself is the
  // search experience; that variant manages its own dropdown-open state.
  onClose?: () => void
  initialQuery?: string
}) {
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const justClearedRef = useRef(false)
  const [query, setQuery] = useState(initialQuery)
  const [catalog, setCatalog] = useState<CarSummary[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  // Only meaningful for variant="inline" — whether the dropdown panel is
  // showing. variant="modal" ignores this; the whole modal already is the
  // open/closed state, so its panel just follows `query` directly.
  const [dropdownOpen, setDropdownOpen] = useState(false)

  function close() {
    if (variant === 'modal') onClose?.()
    else setDropdownOpen(false)
  }

  function runFullSearch(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    close()
    router.push(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false })
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

  // Escape: modal closes entirely; inline just hides its dropdown.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close() reads current variant/onClose via closure each render, fine to omit from deps here
  }, [])

  // Inline only: clicking outside the box closes the dropdown without
  // touching the typed text — same click-outside convention FilterDropdown
  // already uses elsewhere on the Browse page.
  useEffect(() => {
    if (variant !== 'inline') return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [variant])

  const q = query.trim().toLowerCase()
  const suggestions = q
    ? catalog.filter(c => `${c.make} ${c.model} ${c.generation}`.toLowerCase().includes(q)).slice(0, 6)
    : []

  function handleType(value: string) {
    setQuery(value)
    setActiveIndex(-1)
    if (variant === 'inline') setDropdownOpen(value.trim() !== '')
  }

  function selectCar(slug: string) {
    close()
    router.push(`/cars/${slug}`)
  }

  function clear() {
    setQuery('')
    setActiveIndex(-1)
    if (variant === 'inline') setDropdownOpen(false)
    // The imperative .focus() below dispatches a real focus event
    // synchronously, before this render's setQuery('') has actually
    // committed — so onFocus's own `suggestions` would still read the
    // pre-clear (non-empty) list and immediately reopen the dropdown we
    // just closed. This flag makes the next onFocus a no-op once.
    justClearedRef.current = true
    inputRef.current?.focus()
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

  const inputRow = (
    <div className={variant === 'modal' ? 'relative border-b border-border' : 'relative'}>
      <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Make, Model or Generation..."
        value={query}
        onChange={e => handleType(e.target.value)}
        onFocus={() => {
          if (justClearedRef.current) { justClearedRef.current = false; return }
          if (variant === 'inline' && suggestions.length > 0) setDropdownOpen(true)
        }}
        onKeyDown={handleKeyDown}
        // text-base (16px), not text-body (13px) — iOS Safari auto-zooms
        // the whole page on focusing any input under 16px.
        className={
          variant === 'modal'
            ? 'w-full h-14 pl-11 pr-11 text-base text-text-primary outline-none border-none rounded-t-2xl'
            : 'w-full h-11 pl-11 pr-11 text-base text-text-primary outline-none border border-border rounded-full bg-white focus:border-border-mid transition-colors'
        }
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary bg-transparent border-none cursor-pointer p-0 flex items-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )

  const resultsBlock = suggestions.length > 0 ? (
    <div className="max-h-96 overflow-y-auto py-1">
      {suggestions.map((car, i) => (
        <Link
          key={car.id}
          href={`/cars/${car.slug}`}
          onClick={close}
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
    <NoCarsFound
      compact
      hint="Try adjusting your search or request a car to be added."
      onLinkClick={close}
    />
  ) : (
    <p className="text-body text-text-tertiary px-4 py-6 text-center m-0">
      Start typing a make, model, or generation.
    </p>
  )

  if (variant === 'modal') {
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-[var(--z-overlay)] bg-overlay flex items-start justify-center p-3 sm:p-6 sm:pt-[15vh]"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-150 shadow-modal overflow-hidden"
        >
          {inputRow}
          {resultsBlock}
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      {inputRow}
      {dropdownOpen && (
        <div className="absolute top-[calc(100%+var(--spacing-dropdown-gap))] left-0 right-0 bg-white border border-border rounded-lg shadow-dropdown z-[var(--z-overlay)] overflow-hidden">
          {resultsBlock}
        </div>
      )}
    </div>
  )
}
