import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import type { EnrichmentValue } from '@/lib/bulk-import'
import type { EnrichmentFieldKey } from '@/lib/bulk-import-schema'

// Writes only what the last preview approved — the client sends already-
// resolved generation_ids and already-validated field values, no raw CSV
// strings, no re-parsing.
//
// Two separate RPC calls, not one transaction: flat generations fields via
// bulk_update_generation_enrichment (unchanged), and rivals/lineage via
// bulk_add_car_relations (new — car_relations is a child table, not a
// generations column, so it can't ride the same UPDATE). Each call is its
// own atomic transaction; a failure in one doesn't roll back the other.
// That's an acceptable trade-off here specifically because relation
// inserts are purely additive and idempotent (a duplicate label_text is a
// silent DB-level no-op via the partial unique index) — re-running this
// commit after a partial failure is always safe, never double-writes.
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
