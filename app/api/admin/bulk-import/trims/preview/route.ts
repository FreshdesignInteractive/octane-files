import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { KNOWN_TRIM_HEADERS } from '@/lib/bulk-import-schema'
import { resolveGeneration, findUnknownColumns } from '@/lib/bulk-import'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { headers: string[]; rows: Record<string, string>[] } = await req.json()
  const unknownColumns = findUnknownColumns(body.headers, KNOWN_TRIM_HEADERS)

  const results = []
  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const make = row.Make ?? '', model = row.Model ?? '', generation = row.Generation ?? ''
    const name = (row.Name ?? '').trim()
    const years = (row.Years ?? '').trim() || null
    const description = (row.Description ?? '').trim() || null
    const productionNotes = (row.ProductionNotes ?? '').trim() || null

    if (!name) {
      results.push({ row_index: i, make, model, generation, match: { status: 'invalid' as const, errors: [{ field: 'name', header: 'Name', value: '', reason: 'Name is required' }] } })
      continue
    }

    const resolved = await resolveGeneration(supabase, make, model, generation)
    if (!resolved) {
      results.push({ row_index: i, make, model, generation, match: { status: 'unmatched' as const } })
      continue
    }

    const { data: existing } = await supabase
      .from('trims').select('id').eq('generation_id', resolved.id).eq('name', name).maybeSingle()

    results.push({
      row_index: i, make, model, generation,
      match: {
        status: 'matched' as const,
        generation_id: resolved.id,
        slug: resolved.slug,
        archived: !!resolved.archived_at,
        would_update_existing: !!existing,
        name, years, description, production_notes: productionNotes,
      },
    })
  }

  return NextResponse.json({ unknownColumns, rows: results })
}
