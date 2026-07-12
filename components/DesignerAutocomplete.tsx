'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

// Type-to-search against existing designer values, pick one or type a
// genuinely new one — same find-or-create spirit as make/model, but backed
// by a plain text column rather than a table, so "new" just means typing a
// value that isn't in the suggestion list.
export default function DesignerAutocomplete({
  value, onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [known, setKnown] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('generations')
      .select('designer')
      .not('designer', 'is', null)
      .then(({ data }: { data: { designer: string }[] | null }) => {
        setKnown([...new Set((data ?? []).map(r => r.designer))].sort())
      })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const query = (value ?? '').trim().toLowerCase()
  const suggestions = query
    ? known.filter(d => d.toLowerCase().includes(query) && d.toLowerCase() !== query)
    : known

  return (
    <div ref={ref} className="relative">
      <input
        className="input"
        value={value ?? ''}
        onChange={e => { onChange(e.target.value || null); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Type to search existing designers, or enter a new one"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+var(--spacing-dropdown-gap))] left-0 right-0 bg-white border border-border rounded-md shadow-dropdown z-10 max-h-50 overflow-y-auto">
          {suggestions.slice(0, 8).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => { onChange(d); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-body text-text-primary hover:bg-bg-elevated border-none bg-transparent cursor-pointer"
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
