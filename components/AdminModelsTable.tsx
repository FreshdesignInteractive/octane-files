'use client'

import Link from 'next/link'
import { CAR_CLASSES } from '@/lib/car-schema'

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

// Live cars only — archived cars live on their own dedicated page
// (app/admin/archived), not bundled into this list via a toggle.
export default function AdminModelsTable({ rows, archivedCount }: { rows: AdminRow[]; archivedCount: number }) {
  const hasImage = rows.filter(r => r.hero_image).length
  const hasOverview = rows.filter(r => r.overview).length
  const hasSpecs = rows.filter(r => Array.isArray(r.specs) && r.specs.length > 0).length

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="m-0 text-body text-text-tertiary">{rows.length} live cars</p>
        </div>
        <div className="flex gap-5 text-xs text-text-secondary items-center">
          <span>🖼 {hasImage}/{rows.length} images</span>
          <span>📝 {hasOverview}/{rows.length} overviews</span>
          <span>⚙️ {hasSpecs}/{rows.length} specs</span>
          <Link href="/admin/archived" className="text-xs text-text-primary no-underline border border-border-mid rounded-md py-2 px-3.5">
            View archived ({archivedCount})
          </Link>
          <Link href="/admin/bulk-import" className="text-xs text-text-primary no-underline border border-border-mid rounded-md py-2 px-3.5">
            Bulk Import
          </Link>
          <Link href="/admin/new" className="btn-primary h-9 px-4 no-underline">+ New Car</Link>
        </div>
      </div>

      <div className="flex items-center mb-4">
        <div className="flex gap-4 text-label text-text-tertiary">
          <span className="flex items-center gap-1">{dot(true)} filled</span>
          <span className="flex items-center gap-1">{dot(false)} empty</span>
          <span className="ml-2">Columns: Image · Overview · Specs · Market</span>
        </div>
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
            {rows.map((r, i) => (
              <tr key={r.slug} className={`bg-white ${i < rows.length - 1 ? 'border-b border-border' : ''}`}>
                <td className="py-2.5 px-4 text-text-primary font-medium">
                  {r.make} {r.model}
                  {r.code && r.code.toLowerCase() !== r.model.toLowerCase() && (
                    <span className="text-text-tertiary font-normal"> · {r.code}</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-text-secondary">
                  {r.year_start}{r.year_end ? `–${r.year_end}` : '–'}
                </td>
                <td className="py-2.5 px-4 text-text-secondary">{CAR_CLASSES.find(c => c.value === r.class)?.label ?? r.class}</td>
                <td className="py-2.5 px-4 text-center">
                  <div className="flex gap-2 justify-center">
                    {dot(!!r.hero_image)}
                    {dot(!!r.overview)}
                    {dot(Array.isArray(r.specs) && r.specs.length > 0)}
                    {dot(!!r.market_data)}
                  </div>
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
