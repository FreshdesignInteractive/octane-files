'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { CAR_CLASSES, COUNTRIES } from '@/lib/car-schema'
import FilterDropdown from '@/components/FilterDropdown'

type MenuKey = 'make' | 'country' | 'class'

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const [makes, setMakes] = useState<string[]>([])
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('makes').select('name').order('name').then(({ data }: { data: { name: string }[] | null }) => {
      setMakes((data ?? []).map(m => m.name))
    })
  }, [])

  const activeClass   = params.get('class') ?? ''
  const activeCountry = params.get('country') ?? ''
  const activeMake    = params.get('make') ?? ''
  const hasActiveFilter = !!(activeClass || activeCountry || activeMake)

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/?${p.toString()}`, { scroll: false })
  }, [params, router])

  function resetFilters() {
    router.push('/', { scroll: false })
  }

  const makeOptions = makes.map(m => ({ value: m, label: m }))
  const countryOptions = COUNTRIES.map(c => ({ value: c, label: c }))
  const classOptions = CAR_CLASSES.map(c => ({ value: c.value, label: c.label }))

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <FilterDropdown
          label="Make"
          allLabel="All Makes"
          options={makeOptions}
          activeValue={activeMake}
          onChange={v => update('make', v)}
          isOpen={openMenu === 'make'}
          onOpen={() => setOpenMenu('make')}
          onClose={() => setOpenMenu(null)}
        />
        <FilterDropdown
          label="Country"
          allLabel="All Countries"
          options={countryOptions}
          activeValue={activeCountry}
          onChange={v => update('country', v)}
          isOpen={openMenu === 'country'}
          onOpen={() => setOpenMenu('country')}
          onClose={() => setOpenMenu(null)}
        />
        <FilterDropdown
          label="Class"
          allLabel="All Class"
          options={classOptions}
          activeValue={activeClass}
          onChange={v => update('class', v)}
          isOpen={openMenu === 'class'}
          onOpen={() => setOpenMenu('class')}
          onClose={() => setOpenMenu(null)}
        />
      </div>

      <button
        type="button"
        onClick={resetFilters}
        disabled={!hasActiveFilter}
        className="btn-secondary w-full sm:w-auto justify-center gap-2 px-4 h-10 flex-shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Reset Filters
      </button>
    </div>
  )
}
