'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-browser'
import CarAutocomplete from '@/components/CarAutocomplete'
import type { CarRelationInput, CarRelationType, GenerationPickerOption } from '@/lib/car-schema'

type CatalogRow = {
  id: string
  slug: string
  code: string
  hero_image: string | null
  models: { name: string; makes: { name: string } }
}

// Scoped to ONE relation type per instance — rendered twice by
// GenerationFieldsEditor (once for 'related' under "Where it comes from",
// once for 'rival' under "Rivals") so each is its own independent section
// with its own header, matching the public page's Lineage/Rivals split
// (never a shared "Related & Rivals" group). `relations` is always the full
// array (both types); this component filters to its own type for display
// but onChange always receives the complete updated array.
export default function CarRelationsEditor({
  generationId, type, relations, onChange,
}: {
  generationId: string | undefined
  type: CarRelationType
  relations: CarRelationInput[]
  onChange: (relations: CarRelationInput[]) => void
}) {
  const [catalog, setCatalog] = useState<GenerationPickerOption[]>([])

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
        Save this car first, then add {type === 'related' ? 'related cars' : 'rivals'} from the edit page.
      </p>
    )
  }

  const catalogById = new Map(catalog.map(c => [c.id, c]))
  const entries = relations.map((r, i) => ({ r, i })).filter(({ r }) => r.relation_type === type)
  const excludeIds = [
    generationId,
    ...relations.filter(r => r.linked_generation_id).map(r => r.linked_generation_id as string),
  ]

  function addLinked(option: GenerationPickerOption) {
    onChange([...relations, {
      relation_type: type, linked_generation_id: option.id, label_text: null,
      sort_order: entries.length,
    }])
  }

  function addText(text: string) {
    onChange([...relations, {
      relation_type: type, linked_generation_id: null, label_text: text,
      sort_order: entries.length,
    }])
  }

  function remove(index: number) {
    onChange(relations.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-4">
      <CarAutocomplete catalog={catalog} excludeIds={excludeIds} onPick={addLinked} onAddText={addText} />
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entries.map(({ r, i }) => {
            const linked = r.linked_generation_id ? catalogById.get(r.linked_generation_id) : null
            return linked ? (
              <span key={i} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 border border-border rounded-lg">
                <Image
                  src={linked.hero_image || '/placeholder.png'} alt=""
                  width={28} height={28}
                  className={`rounded flex-shrink-0 ${linked.hero_image ? 'object-cover' : 'object-contain bg-bg-elevated'}`}
                />
                <span className="text-body text-text-primary">{linked.model.make.name} {linked.model.name} {linked.code}</span>
                <button type="button" onClick={() => remove(i)} className="text-text-tertiary bg-transparent border-none cursor-pointer leading-none ml-1">×</button>
              </span>
            ) : (
              <span key={i} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 border border-border rounded-lg">
                <Image src="/placeholder.png" alt="" width={28} height={28} className="rounded flex-shrink-0 object-contain bg-bg-elevated" />
                <span className="text-body text-text-primary">{r.label_text}</span>
                <button type="button" onClick={() => remove(i)} className="text-text-tertiary bg-transparent border-none cursor-pointer leading-none ml-1">×</button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
