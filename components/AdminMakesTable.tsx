'use client'

import { useState } from 'react'
import type { MakeRecord } from '@/lib/car-schema'

// Minimal, deliberately narrow: only full_name and intro_text are editable
// here. name/slug/country are fixed (see the API route's comment on why a
// rename isn't handled). Each row saves independently — there's no single
// "Save all" button, matching the low-frequency, one-row-at-a-time nature
// of this data (an admin fixing up one marque's full name, not editing all
// 53 in one sitting).
export default function AdminMakesTable({ makes }: { makes: MakeRecord[] }) {
  const [rows, setRows] = useState<MakeRecord[]>(makes)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState<Record<string, string>>({})

  function update(slug: string, updates: Partial<MakeRecord>) {
    setRows(rs => rs.map(r => r.slug === slug ? { ...r, ...updates } : r))
  }

  async function save(row: MakeRecord) {
    setSaving(s => ({ ...s, [row.slug]: true }))
    setMsg(m => ({ ...m, [row.slug]: '' }))
    const res = await fetch(`/api/admin/makes/${row.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: row.full_name, intro_text: row.intro_text }),
    })
    setSaving(s => ({ ...s, [row.slug]: false }))
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setMsg(m => ({ ...m, [row.slug]: err.error ?? 'Error saving' }))
      return
    }
    setMsg(m => ({ ...m, [row.slug]: 'Saved ✓' }))
    setTimeout(() => setMsg(m => ({ ...m, [row.slug]: '' })), 3000)
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map(row => (
        <div key={row.slug} className="p-4 rounded-lg border border-border-mid flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-body font-bold text-text-primary">{row.name}</span>
            <span className="text-xs text-text-tertiary">{row.country} &middot; /marques/{row.slug}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-tertiary">Full Company Name</span>
              <input
                className="input"
                value={row.full_name ?? ''}
                onChange={e => update(row.slug, { full_name: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-tertiary">Marque page intro (2-3 sentences)</span>
              <textarea
                className="textarea min-h-15"
                value={row.intro_text ?? ''}
                onChange={e => update(row.slug, { intro_text: e.target.value || null })}
              />
            </label>
          </div>
          <div className="flex items-center gap-2.5 self-start">
            {msg[row.slug] && <span className="text-xs text-success">{msg[row.slug]}</span>}
            <button
              type="button"
              onClick={() => save(row)}
              disabled={!!saving[row.slug]}
              className="btn-secondary h-8 px-4 disabled:opacity-60"
            >
              {saving[row.slug] ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
