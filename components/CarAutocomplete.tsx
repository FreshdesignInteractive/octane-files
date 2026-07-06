'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { GenerationPickerOption } from '@/lib/car-schema'

// Sibling to DesignerAutocomplete: same type-to-filter-a-locally-held-list
// interaction (no debounce, no per-keystroke call) — but multi-select-append
// rather than single-value overwrite, and with a hybrid outcome: pick a
// suggestion to link a real car, or press "+ Add as text" for one that isn't
// in the catalog (cross-make lineage, etc). The catalog itself is fetched
// once by the parent (CarRelationsEditor) and passed in, since the parent
// also needs it to resolve display info for already-selected chips.
export default function CarAutocomplete({
  catalog, excludeIds, onPick, onAddText,
}: {
  catalog: GenerationPickerOption[]
  excludeIds: string[]
  onPick: (option: GenerationPickerOption) => void
  onAddText: (text: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.trim().toLowerCase()
  const suggestions = catalog.filter(c =>
    !excludeIds.includes(c.id) &&
    (q === '' || `${c.model.make.name} ${c.model.name} ${c.code}`.toLowerCase().includes(q))
  )

  function pick(option: GenerationPickerOption) {
    onPick(option)
    setQuery('')
    setOpen(false)
  }

  function addAsText() {
    if (!query.trim()) return
    onAddText(query.trim())
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAsText() } }}
          placeholder="Type to search the catalog, or enter a car not in it"
        />
        <button type="button" onClick={addAsText} disabled={!query.trim()} className="btn-secondary px-3 disabled:opacity-60">
          + Add as text
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-border rounded-md shadow-dropdown z-10 max-h-60 overflow-y-auto">
          {suggestions.slice(0, 8).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-body text-text-primary hover:bg-bg-elevated border-none bg-transparent cursor-pointer"
            >
              {c.hero_image ? (
                <Image src={c.hero_image} alt="" width={32} height={32} className="rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded bg-border flex-shrink-0" />
              )}
              <span>{c.model.make.name} {c.model.name} {c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
