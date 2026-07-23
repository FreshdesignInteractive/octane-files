'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import CarCard from './CarCard'
import NoCarsFound from './NoCarsFound'
import type { CarSummary } from '@/lib/types'

const INITIAL = 24
const PAGE    = 12

// An options object (not positional params) so a future filter or sort
// addition can't silently land in the wrong slot the way a positional list
// invites — see the Era filter's CarGrid bug this was hardened after.
function makeUrl(query: {
  cls: string; country: string; make: string; era: string; sort: string; q: string
  offset: number; limit: number
}) {
  const p = new URLSearchParams()
  if (query.cls)     p.set('class',   query.cls)
  if (query.country) p.set('country', query.country)
  if (query.make)    p.set('make',    query.make)
  if (query.era)     p.set('era',     query.era)
  if (query.sort)    p.set('sort',    query.sort)
  if (query.q)       p.set('q',       query.q)
  p.set('offset', String(query.offset))
  p.set('limit',  String(query.limit))
  return `/api/models?${p}`
}

export default function CarGrid({ noResultsHint }: { noResultsHint?: string } = {}) {
  const params        = useSearchParams()
  const activeClass   = params.get('class')   ?? ''
  const activeCountry = params.get('country') ?? ''
  const activeMake    = params.get('make')    ?? ''
  const activeEra     = params.get('era')     ?? ''
  const activeSort    = params.get('sort')    ?? ''
  const activeSearch  = params.get('q')       ?? ''

  const [cars, setCars]       = useState<CarSummary[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPending, start]    = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(makeUrl({ cls: activeClass, country: activeCountry, make: activeMake, era: activeEra, sort: activeSort, q: activeSearch, offset: 0, limit: INITIAL }))
      .then(r => r.json())
      .then(({ data, total }: { data: CarSummary[]; total: number }) => {
        if (cancelled) return
        setCars(data ?? [])
        setTotal(total ?? 0)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeClass, activeCountry, activeMake, activeEra, activeSort, activeSearch])

  function loadMore() {
    start(async () => {
      const res  = await fetch(makeUrl({ cls: activeClass, country: activeCountry, make: activeMake, era: activeEra, sort: activeSort, q: activeSearch, offset: cars.length, limit: PAGE }))
      const json = await res.json() as { data: CarSummary[]; total: number }
      setCars(prev => [...prev, ...json.data])
    })
  }

  if (loading) {
    return (
      <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="border border-border rounded-2xl overflow-hidden">
            <div className="aspect-video bg-bg-elevated" />
            <div className="p-4">
              <div className="h-5 w-3/5 bg-bg-elevated rounded-sm mb-2" />
              <div className="h-3.5 w-4/5 bg-bg-elevated rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (cars.length === 0) {
    return <NoCarsFound hint={noResultsHint} />
  }

  return (
    <div>
      <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {cars.map(car => <CarCard key={car.id} car={car} />)}
      </div>

      {cars.length < total && (
        <div className="text-center mt-12">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="btn-primary h-10 px-7"
          >
            {isPending
              ? 'Loading…'
              : total - cars.length <= PAGE
                ? `Load remaining ${total - cars.length}`
                : `Load ${PAGE} more  ·  ${total - cars.length} remaining`}
          </button>
        </div>
      )}

      <p className="text-center mt-5 text-label text-text-tertiary">
        Showing {cars.length} of {total}
      </p>
    </div>
  )
}
