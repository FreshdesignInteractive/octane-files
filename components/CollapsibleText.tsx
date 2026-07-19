'use client'

import { useEffect, useRef, useState } from 'react'

// Wraps long free-text fields (introduction, why_collectible, driving
// character, etc.) so they visually collapse to a fixed number of lines
// with a "Show more"/"Show less" toggle. Never truncates the underlying
// content — the full text is always in the DOM, no server-side cut, no
// character limit on what gets written. The toggle only renders at all if
// the content actually overflows the clamp (checked via a ResizeObserver,
// so it re-evaluates on viewport-width changes too, since the same line
// count wraps very differently on mobile vs desktop); short text (a
// 3-line field, say) renders exactly as it always has, no button.
//
// The clamp itself has to be an inline style, not a Tailwind class —
// Tailwind requires statically-scannable class names, and this component
// takes an arbitrary `lines` prop, so `line-clamp-${lines}` could never be
// generated at build time. This is exactly the "genuinely data-driven
// dynamic value that can't be expressed as a class" exception.
export default function CollapsibleText({ lines = 7, children }: { lines?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    const observer = new ResizeObserver(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded, lines])

  return (
    <div>
      {/* [&>*:last-child]:mb-0 neutralizes the content's own trailing
          margin (renderText's paragraphs each carry mb-5 for spacing
          between paragraphs) — without it, the gap above the button
          differs between collapsed (clipped before the margin) and
          expanded (margin renders in full) states. */}
      <div
        ref={ref}
        className="[&>*:last-child]:mb-0"
        style={expanded ? undefined : {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: lines,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-body font-medium text-accent bg-transparent border-none cursor-pointer p-0 mt-2"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
