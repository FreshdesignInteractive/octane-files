'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export interface AdminRow {
  slug: string
  code: string
  year_start: number
  year_end: number | null
  class: string
  archived_at: string | null
  hero_image: string | null
  overview: string | null
  specs: unknown[]
  market_data: unknown
  make: string
  model: string
  saves: number
}

const dot = (filled: boolean) => (
  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${filled ? 'bg-success' : 'bg-border'}`} />
)

export default function AdminModelsTable({ rows }: { rows: AdminRow[] }) {
  const [showArchived, setShowArchived] = useState(false)

  const live = useMemo(() => rows.filter(r => !r.archived_at), [rows])
  const archived = useMemo(() => rows.filter(r => r.archived_at), [rows])
  const visible = showArchived ? rows : live

  const hasImage = live.filter(r => r.hero_image).length
  const hasOverview = live.filter(r => r.overview).length
  const hasSpecs = live.filter(r => Array.isArray(r.specs) && r.specs.length > 0).length

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="m-0 text-body text-text-tertiary">{live.length} live cars · {archived.length} archived</p>
        </div>
        <div className="flex gap-5 text-xs text-text-secondary items-center">
          <span>🖼 {hasImage}/{live.length} images</span>
          <span>📝 {hasOverview}/{live.length} overviews</span>
          <span>⚙️ {hasSpecs}/{live.length} specs</span>
          <Link href="/admin/new" className="btn-primary h-9 px-4 no-underline">+ New Car</Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-label text-text-tertiary">
          <span className="flex items-center gap-1">{dot(true)} filled</span>
          <span className="flex items-center gap-1">{dot(false)} empty</span>
          <span className="ml-2">Columns: Image · Overview · Specs · Market</span>
        </div>
        <button
          onClick={() => setShowArchived(a => !a)}
          className={`pill ${showArchived ? 'pill-active' : ''}`}
        >
          {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="table">
          <thead>
            <tr className="bg-bg-elevated border-b border-border">
              <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Car</th>
              <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Years</th>
              <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Class</th>
              <th className="py-2.5 px-4 text-center font-semibold text-text-secondary">Status</th>
              <th className="py-2.5 px-4 text-right font-semibold text-text-secondary">Saves</th>
              <th className="py-2.5 px-4 text-right font-semibold text-text-secondary"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr
                key={r.slug}
                className={`${r.archived_at ? 'bg-bg-elevated opacity-60' : 'bg-white'} ${i < visible.length - 1 ? 'border-b border-border' : ''}`}
              >
                <td className="py-2.5 px-4 text-text-primary font-medium">
                  {r.make} {r.model}
                  {r.code && r.code.toLowerCase() !== r.model.toLowerCase() && (
                    <span className="text-text-tertiary font-normal"> · {r.code}</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-text-secondary">
                  {r.year_start}{r.year_end ? `–${r.year_end}` : '–'}
                </td>
                <td className="py-2.5 px-4 text-text-secondary">{r.class}</td>
                <td className="py-2.5 px-4 text-center">
                  {r.archived_at ? (
                    <span className="tag" style={{ background: 'var(--color-bg-elevated)' }}>Archived</span>
                  ) : (
                    <div className="flex gap-2 justify-center">
                      {dot(!!r.hero_image)}
                      {dot(!!r.overview)}
                      {dot(Array.isArray(r.specs) && r.specs.length > 0)}
                      {dot(!!r.market_data)}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right text-text-secondary">{r.saves}</td>
                <td className="py-2.5 px-4 text-right">
                  <Link href={`/admin/models/${r.slug}`} className="text-xs text-text-primary no-underline border border-border-mid rounded-md py-1 px-2.5">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
