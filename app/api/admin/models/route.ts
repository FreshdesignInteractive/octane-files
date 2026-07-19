import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { deriveGenerationSlug, slugify } from '@/lib/car-schema'
import type { GenerationInput } from '@/lib/car-schema'

// The "+ New Car" cascading create flow: find-or-create make, find-or-create
// model, then create the generation. Adding a new make/model is always an
// explicit choice on the client (a distinct "add new" toggle, never inferred
// from free text) — this route just resolves whichever the client picked.
interface CreateCarPayload {
  make: { id: string } | { name: string; country: string }
  model: { id: string } | { name: string }
  generation: GenerationInput
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: CreateCarPayload = await req.json()

  let makeId: string
  let makeName: string
  if ('id' in payload.make) {
    const { data: existingMake, error } = await supabase
      .from('makes').select('id, name').eq('id', payload.make.id).single()
    if (error || !existingMake) return NextResponse.json({ error: 'Make not found' }, { status: 400 })
    makeId = existingMake.id
    makeName = existingMake.name
  } else {
    const { name, country } = payload.make
    if (!name?.trim() || !country?.trim()) {
      return NextResponse.json({ error: 'New make needs both a name and a country' }, { status: 400 })
    }
    const { data: newMake, error } = await supabase
      .from('makes').insert({ name, slug: slugify(name), country }).select('id, name').single()
    if (error) return NextResponse.json({ error: `Could not create make: ${error.message}` }, { status: 500 })
    makeId = newMake.id
    makeName = newMake.name
  }

  let modelId: string
  let modelName: string
  if ('id' in payload.model) {
    const { data: existingModel, error } = await supabase
      .from('models').select('id, name').eq('id', payload.model.id).eq('make_id', makeId).single()
    if (error || !existingModel) return NextResponse.json({ error: 'Model not found under this make' }, { status: 400 })
    modelId = existingModel.id
    modelName = existingModel.name
  } else {
    const { name } = payload.model
    if (!name?.trim()) {
      return NextResponse.json({ error: 'New model needs a name' }, { status: 400 })
    }
    const { data: newModel, error } = await supabase
      .from('models').insert({ make_id: makeId, name, slug: slugify(`${makeName}-${name}`) }).select('id, name').single()
    if (error) return NextResponse.json({ error: `Could not create model: ${error.message}` }, { status: 500 })
    modelId = newModel.id
    modelName = newModel.name
  }

  const gen = payload.generation
  if (!gen.code?.trim()) {
    return NextResponse.json({ error: 'Generation code is required' }, { status: 400 })
  }

  // Check for a conflict explicitly rather than upserting — a human clicking
  // "Create" once should get a clear error, not a silent overwrite.
  const { data: conflict } = await supabase
    .from('generations').select('slug').eq('model_id', modelId).eq('code', gen.code).maybeSingle()
  if (conflict) {
    return NextResponse.json(
      { error: `A generation with code "${gen.code}" already exists for ${makeName} ${modelName} (${conflict.slug}) — edit it instead.` },
      { status: 409 }
    )
  }

  const slug = gen.slug?.trim() || deriveGenerationSlug(makeName, modelName, gen.code)

  const { data: created, error: createError } = await supabase
    .from('generations')
    .insert({ ...gen, model_id: modelId, slug })
    .select('slug')
    .single()

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
  return NextResponse.json(created)
}
