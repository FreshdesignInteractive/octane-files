'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import CarCard from './CarCard'
import type { CarSummary } from '@/lib/types'

const INITIAL = 24
const PAGE    = 12

function makeUrl(cls: string, country: string, q: string, offset: number, limit: number) {
  const p = new URLSearchParams()
  if (cls)     p.set('class',   cls)
  if (country) p.set('country', country)
  if (q)       p.set('q',       q)
  p.set('offset', String(offset))
  p.set('limit',  String(limit))
  return `/api/models?${p}`
}

export default function CarGrid() {
  const params        = useSearchParams()
  const activeClass   = params.get('class')   ?? ''
  const activeCountry = params.get('country') ?? ''
  const activeSearch  = params.get('q')       ?? ''

  const [cars, setCars]       = useState<CarSummary[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPending, start]    = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(makeUrl(activeClass, activeCountry, activeSearch, 0, INITIAL))
      .then(r => r.json())
      .then(({ data, total }: { data: CarSummary[]; total: number }) => {
        if (cancelled) return
        setCars(data ?? [])
        setTotal(total ?? 0)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeClass, activeCountry, activeSearch])

  function loadMore() {
    start(async () => {
      const res  = await fetch(makeUrl(activeClass, activeCountry, activeSearch, cars.length, PAGE))
      const json = await res.json() as { data: CarSummary[]; total: number }
      setCars(prev => [...prev, ...json.data])
    })
  }

  if (loading) {
    return (
      <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="border border-border rounded-card overflow-hidden">
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
    return (
      <div className="text-center py-20">
        <p className="text-sm text-text-tertiary">No cars found. Try adjusting your filters.</p>
      </div>
    )
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

      <p className="text-center mt-5 text-xs text-text-tertiary">
        Showing {cars.length} of {total}
      </p>
    </div>
  )
}
