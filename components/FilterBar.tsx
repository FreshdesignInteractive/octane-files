'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { CAR_CLASSES, COUNTRIES, ERAS, SORTS, DEFAULT_SORT } from '@/lib/car-schema'
import FilterDropdown from '@/components/FilterDropdown'

type MenuKey = 'make' | 'country' | 'class' | 'era' | 'sort'

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const [makes, setMakes] = useState<string[]>([])
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // get_filterable_makes(), not a flat `.from('makes')` select — a make
    // with zero live (non-archived) generations shouldn't appear as a
    // filter option (see imports/step45_filterable_makes_rpc.sql). A
    // PostgREST nested-embed filter (makes -> models -> generations) isn't
    // reliable at 2 levels deep in this codebase — same reasoning that
    // pushed search_generations() into a dedicated RPC.
    supabase.rpc('get_filterable_makes').then(({ data }: { data: { name: string }[] | null }) => {
      setMakes((data ?? []).map(m => m.name))
    })
  }, [])

  const activeClass   = params.get('class') ?? ''
  const activeCountry = params.get('country') ?? ''
  const activeMake    = params.get('make') ?? ''
  const activeEra     = params.get('era') ?? ''
  const activeSort    = params.get('sort') || DEFAULT_SORT
  const hasActiveFilter = !!(activeClass || activeCountry || activeMake || activeEra || activeSort !== DEFAULT_SORT)

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/browse?${p.toString()}`, { scroll: false })
  }, [params, router])

  // Sort always has a value (unlike the filters, which can clear to "All"),
  // so picking the default explicitly should still drop it from the URL —
  // same "default is omitted" convention the filters already follow.
  const updateSort = useCallback((value: string) => {
    update('sort', value === DEFAULT_SORT ? '' : value)
  }, [update])

  function resetFilters() {
    router.push('/browse', { scroll: false })
  }

  const makeOptions = makes.map(m => ({ value: m, label: m }))
  const countryOptions = COUNTRIES.map(c => ({ value: c, label: c }))
  const classOptions = CAR_CLASSES.map(c => ({ value: c.value, label: c.label }))
  const eraOptions = ERAS.map(e => ({ value: e.value, label: e.label }))
  const sortOptions = SORTS.map(s => ({ value: s.value, label: s.label }))

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
          allLabel="All Classes"
          options={classOptions}
          activeValue={activeClass}
          onChange={v => update('class', v)}
          isOpen={openMenu === 'class'}
          onOpen={() => setOpenMenu('class')}
          onClose={() => setOpenMenu(null)}
        />
        <FilterDropdown
          label="Era"
          allLabel="All Eras"
          options={eraOptions}
          activeValue={activeEra}
          onChange={v => update('era', v)}
          isOpen={openMenu === 'era'}
          onOpen={() => setOpenMenu('era')}
          onClose={() => setOpenMenu(null)}
        />
      </div>

      {/* Sort + Reset: right-aligned as a pair on desktop; on mobile they
          share one full-width row (flex-1 each) instead of each getting
          their own full-width row like the filters above. */}
      <div className="flex gap-3 flex-shrink-0">
        <FilterDropdown
          label="Sort"
          options={sortOptions}
          activeValue={activeSort}
          onChange={updateSort}
          isOpen={openMenu === 'sort'}
          onOpen={() => setOpenMenu('sort')}
          onClose={() => setOpenMenu(null)}
          showAllOption={false}
          align="right"
          widthClassName="flex-1 sm:flex-none sm:w-auto"
          triggerPrefix="Sort: "
        />
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilter}
          className="btn-secondary flex-1 sm:flex-none sm:w-auto justify-center gap-2 px-4 h-10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset
        </button>
      </div>
    </div>
  )
}
