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
  const search        = params.get('q') ?? ''

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/?${p.toString()}`, { scroll: false })
  }, [params, router])

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    height: 30,
    padding: '0 13px',
    borderRadius: 99,
    border: active ? '1.5px solid #111111' : '1px solid var(--border)',
    background: active ? '#111111' : '#ffffff',
    color: active ? '#ffffff' : 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: active ? 500 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms',
    userSelect: 'none',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Make, Model or Generation..."
            defaultValue={search}
            onChange={e => update('q', e.target.value)}
            style={{
              width: '100%',
              height: 44,
              background: '#f5f5f5',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0 16px 0 40px',
              color: '#111111',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Country filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, marginRight: 2 }}>Country:</span>
        <button style={pillStyle(!activeCountry)} onClick={() => update('country', '')}>All</button>
        {COUNTRIES.map(c => (
          <button key={c} style={pillStyle(activeCountry === c)} onClick={() => update('country', activeCountry === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Class filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, marginRight: 2 }}>Class:</span>
        <button style={pillStyle(!activeClass)} onClick={() => update('class', '')}>All</button>
        {CLASSES.map(c => (
          <button key={c} style={pillStyle(activeClass === c)} onClick={() => update('class', activeClass === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
