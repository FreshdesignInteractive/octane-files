'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CAR_CLASSES } from '@/lib/car-schema'
import type { AdminRow } from '@/components/AdminModelsTable'

export default function AdminArchivedTable({ rows: initialRows }: { rows: AdminRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [pending, setPending] = useState<string | null>(null)

  async function unarchive(slug: string) {
    setPending(slug)
    const res = await fetch(`/api/admin/models/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived_at: null }),
    })
    setPending(null)
    if (res.ok) setRows(rs => rs.filter(r => r.slug !== slug))
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/admin" className="text-xs text-text-tertiary no-underline">← All models</Link>
          <h1 className="mt-2 mb-1 text-2xl font-bold text-text-primary">Admin · Archived</h1>
          <p className="m-0 text-body text-text-tertiary">{rows.length} archived cars</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-body text-text-tertiary">Nothing archived right now.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="table">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Car</th>
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Years</th>
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Class</th>
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
                  <td className="py-2.5 px-4 text-right flex gap-2 justify-end">
                    <Link href={`/admin/models/${r.slug}`} className="text-xs text-text-primary no-underline border border-border-mid rounded-md py-1 px-2.5">
                      View
                    </Link>
                    <button
                      onClick={() => unarchive(r.slug)}
                      disabled={pending === r.slug}
                      className="btn-secondary text-xs py-1 px-2.5 disabled:opacity-60"
                    >
                      {pending === r.slug ? 'Restoring...' : 'Unarchive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
