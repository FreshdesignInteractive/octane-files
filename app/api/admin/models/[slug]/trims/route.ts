import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { resolveGenerationId, replaceGenerationChildRows } from '@/lib/admin-child-rows'
import type { TrimInput } from '@/lib/car-schema'

// Replace-all: the admin form's Trims editor sends the full desired list on
// every save, same "whole array" semantics as gallery_images/resources.
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
  const body: { trims: TrimInput[] } = await req.json()

  for (const t of body.trims) {
    if (!t.name?.trim()) {
      return NextResponse.json({ error: 'Every trim needs a name' }, { status: 400 })
    }
  }

  const generationId = await resolveGenerationId(supabase, slug)
  if (!generationId) return NextResponse.json({ error: 'Car not found' }, { status: 404 })

  const result = await replaceGenerationChildRows(supabase, 'trims', generationId, body.trims)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ trims: result.data })
}
