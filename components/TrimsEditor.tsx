'use client'

import type { TrimInput } from '@/lib/car-schema'

// Reuses the Resources array pattern (GenerationFieldsEditor's row/add/remove
// shape) one field wider. Disabled until the car itself has been saved once —
// a trim row needs a real generation_id, which doesn't exist yet mid-create.
export default function TrimsEditor({
  generationId, trims, onChange,
}: {
  generationId: string | undefined
  trims: TrimInput[]
  onChange: (trims: TrimInput[]) => void
}) {
  if (!generationId) {
    return (
      <p className="text-body text-text-tertiary italic">
        Save this car first, then add trims from the edit page.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {trims.map((t, i) => (
        <div key={i} className="grid grid-cols-[1.2fr_1fr_2fr_2fr_auto] gap-2 items-start">
          <input
            className="input" placeholder="Name (e.g. Hemi 'Cuda)"
            value={t.name}
            onChange={e => onChange(trims.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
          />
          <input
            className="input" placeholder="Years"
            value={t.years ?? ''}
            onChange={e => onChange(trims.map((x, j) => j === i ? { ...x, years: e.target.value || null } : x))}
          />
          <input
            className="input" placeholder="Description"
            value={t.description ?? ''}
            onChange={e => onChange(trims.map((x, j) => j === i ? { ...x, description: e.target.value || null } : x))}
          />
          <input
            className="input" placeholder="Production notes"
            value={t.production_notes ?? ''}
            onChange={e => onChange(trims.map((x, j) => j === i ? { ...x, production_notes: e.target.value || null } : x))}
          />
          <button type="button" onClick={() => onChange(trims.filter((_, j) => j !== i))} className="btn-secondary px-3">Remove</button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...trims, { name: '', years: null, description: null, production_notes: null }])}
        className="btn-secondary self-start px-3"
      >
        + Add trim
      </button>
    </div>
  )
}
