import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import type { EnrichmentValue } from '@/lib/bulk-import'
import type { EnrichmentFieldKey } from '@/lib/bulk-import-schema'

// Writes only what the last preview approved — the client sends already-
// resolved generation_ids and already-validated field values, no raw CSV
// strings, no re-parsing.
//
// Three separate RPC calls, not one transaction: flat generations fields
// via bulk_update_generation_enrichment (unchanged), rivals/lineage via
// bulk_add_car_relations (car_relations is a child table, not a generations
// column, so it can't ride the same UPDATE), and ManufacturerFullName via
// bulk_update_make_enrichment (writes to makes, not generations — same
// reasoning). The same body.rows array is reused for both the generations
// and make RPCs unmodified: each RPC's jsonb_to_recordset only pulls the
// columns it explicitly declares, so a row carrying manufacturer_full_name
// is silently ignored by bulk_update_generation_enrichment, and a row with
// no manufacturer_full_name is silently a no-op inside bulk_update_make_
// enrichment (see its WHERE ... IS NOT NULL). Each call is its own atomic
// transaction; a failure in one doesn't roll back the others. That's an
// acceptable trade-off here specifically because relation inserts are
// purely additive/idempotent and make-enrichment writes are simple last-
// value-wins overwrites — re-running this commit after a partial failure
// is always safe, never double-writes or corrupts state.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: {
    rows: ({ generation_id: string } & Partial<Record<EnrichmentFieldKey, EnrichmentValue>>)[]
    relations?: { generation_id: string; relation_type: 'rival' | 'related'; label_text: string }[]
  } = await req.json()

  if (!body.rows?.length) {
    return NextResponse.json({ error: 'No rows to commit' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('bulk_update_generation_enrichment', { rows: body.rows })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: makeError } = await supabase.rpc('bulk_update_make_enrichment', { rows: body.rows })
  if (makeError) {
    return NextResponse.json({ error: `Generation fields updated, but ManufacturerFullName failed: ${makeError.message}`, updated: data }, { status: 500 })
  }

  let relationsAdded = 0
  if (body.relations?.length) {
    const { data: relData, error: relError } = await supabase.rpc('bulk_add_car_relations', { rows: body.relations })
    if (relError) {
      return NextResponse.json({ error: `Generation fields updated, but rivals/lineage failed: ${relError.message}`, updated: data }, { status: 500 })
    }
    relationsAdded = relData ?? 0
  }

  return NextResponse.json({ updated: data, relationsAdded })
}
