'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const CLASSES = ['Exotic', 'Grand Tourer', 'Icons', 'Luxury', 'Muscle', 'Off-Road', 'Sports']
const COUNTRIES = ['Australia', 'France', 'Germany', 'Italy', 'Japan', 'Sweden', 'UK', 'USA']

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()

  const activeClass   = params.get('class') ?? ''
  const activeCountry = params.get('country') ?? ''

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/?${p.toString()}`, { scroll: false })
  }, [params, router])

  const pillClass = (active: boolean) => `pill ${active ? 'pill-active' : ''}`

  return (
    <div className="flex flex-col gap-3">
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
        {CLASSES.map(c => (
          <button key={c} className={pillClass(activeClass === c)} onClick={() => update('class', activeClass === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
