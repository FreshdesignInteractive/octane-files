import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { resolveGenerationId, replaceGenerationChildRows } from '@/lib/admin-child-rows'
import type { CarRelationInput } from '@/lib/car-schema'

// Replace-all, same semantics as the trims route. Re-validates the XOR
// (linked car OR plain text, never both/neither) server-side so a violation
// surfaces as a clean 400 rather than a raw Postgres CHECK-violation string.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const body: { relations: CarRelationInput[] } = await req.json()

  for (const r of body.relations) {
    const hasLink = !!r.linked_generation_id
    const hasText = !!r.label_text?.trim()
    if (hasLink === hasText) {
      return NextResponse.json(
        { error: 'Each relation must be either a linked car or plain text, not both or neither' },
        { status: 400 }
      )
    }
  }

  const generationId = await resolveGenerationId(supabase, slug)
  if (!generationId) return NextResponse.json({ error: 'Car not found' }, { status: 404 })

  for (const r of body.relations) {
    if (r.linked_generation_id === generationId) {
      return NextResponse.json({ error: 'A car cannot be related to itself' }, { status: 400 })
    }
  }

  const result = await replaceGenerationChildRows(supabase, 'car_relations', generationId, body.relations)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ relations: result.data })
}
