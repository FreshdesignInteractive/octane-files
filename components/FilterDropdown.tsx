'use client'

import { useEffect, useRef } from 'react'

export type FilterOption = { value: string; label: string }

// Single-select dropdown: "All <label>" is always the first option (clears
// the filter), everything else is a radio-style list. max-h-96 (Tailwind's
// own largest native step) caps the panel so a long list (Make) scrolls
// instead of growing past a usable height — not literally "20 rows" since
// that would make the panel taller than most viewports below the trigger,
// but the same generous "show a lot, scroll for the rest" behavior.
export default function FilterDropdown({
  label,
  allLabel,
  options,
  activeValue,
  onChange,
  isOpen,
  onOpen,
  onClose,
}: {
  label: string
  allLabel: string
  options: FilterOption[]
  activeValue: string
  onChange: (value: string) => void
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const allOptions: FilterOption[] = [{ value: '', label: allLabel }, ...options]
  const activeOption = allOptions.find(o => o.value === activeValue) ?? allOptions[0]

  useEffect(() => {
    if (!isOpen) return
    function handler(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') onClose(); return }
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [isOpen, onClose])

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => (isOpen ? onClose() : onOpen())}
        aria-label={label}
        aria-expanded={isOpen}
        className={`btn-secondary w-full sm:w-auto justify-between gap-2 px-4 h-10 ${isOpen ? 'bg-bg-elevated' : ''}`}
      >
        {activeOption.label}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+var(--spacing-dropdown-gap))] left-0 w-full sm:w-auto sm:min-w-48 bg-white border border-border rounded-lg shadow-dropdown z-[var(--z-overlay)] overflow-hidden">
          <div className="max-h-96 overflow-y-auto py-1">
            {allOptions.map(opt => {
              const isActive = opt.value === activeValue
              return (
                <button
                  key={opt.value || '__all'}
                  type="button"
                  onClick={() => { onChange(opt.value); onClose() }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm text-text-primary whitespace-nowrap transition-colors ${
                    isActive ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isActive ? 'border-accent' : 'border-border-mid'}`}>
                    {isActive && <span className="w-2 h-2 rounded-full bg-accent" />}
                  </span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
