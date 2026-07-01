'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import CarCard from './CarCard'
import type { ModelSummary } from '@/lib/types'

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

  const [cars, setCars]       = useState<ModelSummary[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPending, start]    = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(makeUrl(activeClass, activeCountry, activeSearch, 0, INITIAL))
      .then(r => r.json())
      .then(({ data, total }: { data: ModelSummary[]; total: number }) => {
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
      const json = await res.json() as { data: ModelSummary[]; total: number }
      setCars(prev => [...prev, ...json.data])
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{ aspectRatio: '16/9', background: '#f0f0f0' }} />
            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ height: 20, width: '60%', background: '#ebebeb', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 14, width: '80%', background: '#f5f5f5', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (cars.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No cars found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 24,
      }}>
        {cars.map(car => <CarCard key={car.id} car={car} />)}
      </div>

      {cars.length < total && (
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <button
            onClick={loadMore}
            disabled={isPending}
            style={{
              height: 40,
              padding: '0 28px',
              background: '#111111',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: isPending ? 'default' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              transition: 'opacity 150ms',
            }}
          >
            {isPending ? 'Loading...' : `Load more  ·  ${total - cars.length} remaining`}
          </button>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-tertiary)' }}>
        Showing {cars.length} of {total}
      </p>
    </div>
  )
}
