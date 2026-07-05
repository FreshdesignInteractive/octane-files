'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { CAR_CLASSES, COUNTRIES } from '@/lib/car-schema'

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const [makes, setMakes] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('makes').select('name').order('name').then(({ data }: { data: { name: string }[] | null }) => {
      setMakes((data ?? []).map(m => m.name))
    })
  }, [])

  const activeClass   = params.get('class') ?? ''
  const activeCountry = params.get('country') ?? ''
  const activeMake    = params.get('make') ?? ''

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/?${p.toString()}`, { scroll: false })
  }, [params, router])

  const pillClass = (active: boolean) => `pill ${active ? 'pill-active' : ''}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-text-tertiary font-medium mr-0.5">Make:</span>
        <select
          className="select h-8 text-xs w-45"
          value={activeMake}
          onChange={e => update('make', e.target.value)}
        >
          <option value="">All makes</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Country filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-tertiary font-medium mr-0.5">Country:</span>
        <button className={pillClass(!activeCountry)} onClick={() => update('country', '')}>All</button>
        {COUNTRIES.map(c => (
          <button key={c} className={pillClass(activeCountry === c)} onClick={() => update('country', activeCountry === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Class filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-tertiary font-medium mr-0.5">Class:</span>
        <button className={pillClass(!activeClass)} onClick={() => update('class', '')}>All</button>
        {CAR_CLASSES.map(c => (
          <button key={c.value} className={pillClass(activeClass === c.value)} onClick={() => update('class', activeClass === c.value ? '' : c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
