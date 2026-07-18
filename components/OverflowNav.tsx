'use client'

import { useEffect, useRef, useState } from 'react'

export type OverflowNavItem = { id: string; label: string }

const MORE_BUTTON_WIDTH = 44
const ITEM_GAP = 32 // matches gap-8 below

// Standard pattern for "tabs that might not all fit": render the real,
// visible items plus an identical off-screen copy of every item used only
// to measure true widths. A ResizeObserver on the visible track recomputes,
// on every resize, how many items actually fit before the meatball button
// would be needed, and collapses the rest into a dropdown menu. Reusable
// anywhere a horizontal list of links/tabs needs the same overflow behavior.
//
// `activeId`, when passed, is a controlled override for which item is
// highlighted — skips the scrollspy IntersectionObserver entirely (there's
// nothing to observe when the caller's own items don't correspond to
// elements simultaneously present in the DOM, e.g. top-level tabs where
// only the active one is ever mounted). Omit it for the original
// uncontrolled behavior: highlight whichever item's target element is
// nearest the top of the viewport while scrolling.
export default function OverflowNav({ items, activeId: controlledActiveId }: { items: OverflowNavItem[]; activeId?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const measureRefs = useRef<(HTMLElement | null)[]>([])
  const [visibleCount, setVisibleCount] = useState(items.length)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [scrollspyActiveId, setScrollspyActiveId] = useState<string | null>(items[0]?.id ?? null)
  const activeId = controlledActiveId ?? scrollspyActiveId

  useEffect(() => {
    function recalculate() {
      const track = trackRef.current
      const widths = measureRefs.current.map(el => el?.offsetWidth ?? 0)
      if (!track || widths.some(w => w === 0)) return

      const available = track.offsetWidth
      let total = 0
      let count = 0
      for (let i = 0; i < widths.length; i++) {
        const width = widths[i] + (i > 0 ? ITEM_GAP : 0)
        const allFitWithoutMore = i === widths.length - 1 && total + width <= available
        const budget = allFitWithoutMore ? available : available - MORE_BUTTON_WIDTH
        if (total + width > budget) break
        total += width
        count++
      }
      setVisibleCount(count)
    }

    recalculate()
    const ro = new ResizeObserver(recalculate)
    if (trackRef.current) ro.observe(trackRef.current)
    return () => ro.disconnect()
  }, [items])

  // Scrollspy: highlight whichever section's heading is currently nearest
  // the top of the viewport, below the sticky header + this nav itself.
  // Skipped entirely when the caller controls activeId itself.
  useEffect(() => {
    if (controlledActiveId !== undefined) return
    const elements = items
      .map(item => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setScrollspyActiveId(topMost.target.id)
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [items, controlledActiveId])

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); return }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [menuOpen])

  const visible = items.slice(0, visibleCount)
  const overflow = items.slice(visibleCount)

  return (
    // w-full, not left to intrinsic content sizing — with a short item
    // list (few tabs, or few items that fit before the overflow menu
    // kicks in) the row's own content isn't wide enough to reach the full
    // available width on its own, so the pill would otherwise shrink to
    // fit instead of spanning the content column like this nav always has.
    <div className="relative w-full bg-white rounded-full shadow-lg h-16 px-8 flex items-center">
      {/* Off-screen measuring clones — identical classes to the real links,
          so offsetWidth reflects true rendered width at the current font.
          `invisible` alone only hides them visually; it doesn't stop them
          contributing to the page's scrollable width, and they're
          deliberately unclipped/full-width to measure every label. The
          zero-size, overflow-hidden wrapper is what actually contains
          them — offsetWidth on the children is unaffected by an ancestor
          clipping them. */}
      <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="flex gap-8">
          {items.map((item, i) => (
            <span
              key={item.id}
              ref={el => { measureRefs.current[i] = el }}
              className="text-sm font-medium whitespace-nowrap px-4 py-2"
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div ref={trackRef} className="flex-1 min-w-0 flex items-center gap-8 overflow-hidden">
        {visible.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`text-sm font-medium no-underline whitespace-nowrap px-4 py-2 rounded-full transition-colors ${
              item.id === activeId ? 'bg-accent-subtle text-accent' : 'text-text-primary hover:bg-bg-elevated'
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      {overflow.length > 0 && (
        <div ref={menuRef} className="relative flex-shrink-0 ml-4">
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="More sections"
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary bg-transparent border-none cursor-pointer transition-colors hover:bg-bg-elevated"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-border rounded-lg shadow-dropdown py-2 min-w-50 z-50">
              {overflow.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2 text-sm no-underline transition-colors ${
                    item.id === activeId ? 'bg-accent-subtle text-accent' : 'text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
