'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-browser'
import CarAutocomplete from '@/components/CarAutocomplete'
import { CAR_RELATION_TYPES, type CarRelationInput, type CarRelationType, type GenerationPickerOption } from '@/lib/car-schema'

type CatalogRow = {
  id: string
  slug: string
  code: string
  hero_image: string | null
  models: { name: string; makes: { name: string } }
}

const TYPE_LABEL: Record<CarRelationType, string> = { related: 'Related', rival: 'Rival' }

// Hybrid picker for related_cars/rivals_alternatives, now car_relations rows:
// a Related/Rival toggle picks which bucket a new entry lands in, then
// CarAutocomplete's type-or-pick interaction either links a real catalog
// car or appends a plain-text label. Disabled until the car itself has been
// saved once — a relation row needs a real generation_id.
export default function CarRelationsEditor({
  generationId, relations, onChange,
}: {
  generationId: string | undefined
  relations: CarRelationInput[]
  onChange: (relations: CarRelationInput[]) => void
}) {
  const [catalog, setCatalog] = useState<GenerationPickerOption[]>([])
  const [activeType, setActiveType] = useState<CarRelationType>('related')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('generations')
      .select('id, slug, code, hero_image, models!inner(name, makes!inner(name))')
      .is('archived_at', null)
      .then(({ data }: { data: CatalogRow[] | null }) => {
        setCatalog((data ?? []).map(r => ({
          id: r.id,
          slug: r.slug,
          code: r.code,
          hero_image: r.hero_image,
          model: { name: r.models.name, make: { name: r.models.makes.name } },
        })))
      })
  }, [])

  if (!generationId) {
    return (
      <p className="text-body text-text-tertiary italic">
        Save this car first, then add related cars and rivals from the edit page.
      </p>
    )
  }

  const catalogById = new Map(catalog.map(c => [c.id, c]))
  const excludeIds = [
    generationId,
    ...relations.filter(r => r.linked_generation_id).map(r => r.linked_generation_id as string),
  ]

  function addLinked(option: GenerationPickerOption) {
    onChange([...relations, {
      relation_type: activeType, linked_generation_id: option.id, label_text: null,
      sort_order: relations.length,
    }])
  }

  function addText(text: string) {
    onChange([...relations, {
      relation_type: activeType, linked_generation_id: null, label_text: text,
      sort_order: relations.length,
    }])
  }

  function remove(index: number) {
    onChange(relations.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {CAR_RELATION_TYPES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveType(t)}
            className={`pill ${activeType === t ? 'pill-active' : ''}`}
          >
            Add as {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <CarAutocomplete catalog={catalog} excludeIds={excludeIds} onPick={addLinked} onAddText={addText} />

      {CAR_RELATION_TYPES.map(type => {
        const entries = relations
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => r.relation_type === type)
        if (entries.length === 0) return null
        return (
          <div key={type}>
            <div className="text-label font-bold tracking-[0.08em] text-text-tertiary uppercase mb-2">{TYPE_LABEL[type]}</div>
            <div className="flex flex-wrap gap-2">
              {entries.map(({ r, i }) => {
                const linked = r.linked_generation_id ? catalogById.get(r.linked_generation_id) : null
                return linked ? (
                  <span key={i} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 border border-border rounded-lg">
                    {linked.hero_image ? (
                      <Image src={linked.hero_image} alt="" width={28} height={28} className="rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-border flex-shrink-0" />
                    )}
                    <span className="text-body text-text-primary">{linked.model.make.name} {linked.model.name} {linked.code}</span>
                    <button type="button" onClick={() => remove(i)} className="text-text-tertiary bg-transparent border-none cursor-pointer leading-none ml-1">×</button>
                  </span>
                ) : (
                  <span key={i} className="pill flex items-center gap-2 pr-1.5">
                    {r.label_text}
                    <button type="button" onClick={() => remove(i)} className="text-text-tertiary bg-transparent border-none cursor-pointer leading-none">×</button>
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
