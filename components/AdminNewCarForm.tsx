'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import GenerationFieldsEditor from '@/components/GenerationFieldsEditor'
import { emptyGenerationInput, COUNTRIES, type GenerationInput, type MakeRecord, type ModelRecord } from '@/lib/car-schema'

export default function AdminNewCarForm() {
  const router = useRouter()
  const [makes, setMakes] = useState<MakeRecord[]>([])
  const [models, setModels] = useState<ModelRecord[]>([])

  const [makeId, setMakeId] = useState<string>('')
  const [addingMake, setAddingMake] = useState(false)
  const [newMakeName, setNewMakeName] = useState('')
  const [newMakeCountry, setNewMakeCountry] = useState('USA')

  const [modelId, setModelId] = useState<string>('')
  const [addingModel, setAddingModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')

  const [generation, setGeneration] = useState<GenerationInput>(emptyGenerationInput())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [duplicateSlug, setDuplicateSlug] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('makes').select('id, name, slug, country').order('name').then(({ data }: { data: MakeRecord[] | null }) => setMakes(data ?? []))
  }, [])

  // Live duplicate check — only meaningful against an existing model (a new
  // model can't already have this generation). Debounced so it doesn't fire
  // on every keystroke.
  useEffect(() => {
    if (addingModel || !modelId || !generation.code.trim()) { setDuplicateSlug(null); return }
    const code = generation.code.trim()
    const timeout = setTimeout(() => {
      const supabase = createClient()
      supabase.from('generations').select('slug').eq('model_id', modelId).eq('code', code).maybeSingle()
        .then(({ data }: { data: { slug: string } | null }) => setDuplicateSlug(data?.slug ?? null))
    }, 400)
    return () => clearTimeout(timeout)
  }, [modelId, addingModel, generation.code])

  useEffect(() => {
    if (!makeId) { setModels([]); return }
    const supabase = createClient()
    supabase.from('models').select('id, make_id, name, slug').eq('make_id', makeId).order('name').then(({ data }: { data: ModelRecord[] | null }) => setModels(data ?? []))
  }, [makeId])

  const makeName = addingMake ? newMakeName : makes.find(m => m.id === makeId)?.name ?? ''
  const modelName = addingModel ? newModelName : models.find(m => m.id === modelId)?.name ?? ''
  const readyToShowGeneration = !!makeName && !!modelName

  async function submit() {
    setSaving(true)
    setMsg('')
    const payload = {
      make: addingMake ? { name: newMakeName, country: newMakeCountry } : { id: makeId },
      model: addingModel ? { name: newModelName } : { id: modelId },
      generation,
    }
    const res = await fetch('/api/admin/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      router.push(`/admin/models/${data.slug}`)
    } else {
      const err = await res.json().catch(() => ({}))
      setMsg(err.error ?? 'Error creating car')
    }
  }

  return (
    <div className="max-w-215 mx-auto pt-10 px-6 pb-20 font-[system-ui,sans-serif]">
      <a href="/admin" className="text-xs text-text-tertiary no-underline">← All models</a>
      <h1 className="mt-2 mb-8 text-2xl font-bold text-text-primary">Add a New Car</h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="field">
          <label className="field-label">Make</label>
          {!addingMake ? (
            <>
              <select className="select" value={makeId} onChange={e => { setMakeId(e.target.value); setModelId(''); setAddingModel(false) }}>
                <option value="">Select a make…</option>
                {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button type="button" onClick={() => { setAddingMake(true); setMakeId(''); setModelId(''); setAddingModel(true) }} className="text-xs text-text-tertiary underline mt-1.5">
                + Add a new make
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <input className="input" placeholder="Make name" value={newMakeName} onChange={e => setNewMakeName(e.target.value)} />
              <select className="select" value={newMakeCountry} onChange={e => setNewMakeCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => { setAddingMake(false); setNewMakeName(''); setAddingModel(false) }} className="text-xs text-text-tertiary underline self-start">
                Use an existing make instead
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label className="field-label">Model</label>
          {!addingModel ? (
            <>
              <select className="select" value={modelId} disabled={!makeId && !addingMake} onChange={e => setModelId(e.target.value)}>
                <option value="">Select a model…</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button type="button" disabled={!makeId && !addingMake} onClick={() => { setAddingModel(true); setModelId('') }} className="text-xs text-text-tertiary underline mt-1.5 disabled:opacity-40">
                + Add a new model
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <input className="input" placeholder="Model name" value={newModelName} onChange={e => setNewModelName(e.target.value)} />
              {!addingMake && (
                <button type="button" onClick={() => { setAddingModel(false); setNewModelName('') }} className="text-xs text-text-tertiary underline self-start">
                  Use an existing model instead
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {readyToShowGeneration ? (
        <>
          <div className="mb-6 pb-4 border-b border-border text-body text-text-secondary">
            Creating a new generation under <strong className="text-text-primary">{makeName} {modelName}</strong>
          </div>
          {duplicateSlug && (
            <div className="mb-6 p-4 rounded-lg border border-error bg-bg-elevated text-body flex items-center justify-between gap-4">
              <span className="text-error font-medium">This car already exists.</span>
              <a href={`/admin/models/${duplicateSlug}`} className="text-error underline font-medium whitespace-nowrap">Edit it instead →</a>
            </div>
          )}
          <GenerationFieldsEditor
            value={generation}
            onChange={u => setGeneration(g => ({ ...g, ...u }))}
            generationId={undefined}
            trims={[]}
            onTrimsChange={() => {}}
            relations={[]}
            onRelationsChange={() => {}}
          />
          <div className="mt-8 flex justify-end gap-2.5 items-center">
            {msg && <span className="text-xs text-error">{msg}</span>}
            <button onClick={submit} disabled={saving || !generation.code.trim() || !!duplicateSlug} className="btn-primary h-10 px-7">
              {saving ? 'Creating...' : 'Create car'}
            </button>
          </div>
        </>
      ) : (
        <p className="text-body text-text-tertiary">Choose or add a make and model above to continue.</p>
      )}
    </div>
  )
}
