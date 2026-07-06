import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import type { EnrichmentValue } from '@/lib/bulk-import'
import type { EnrichmentFieldKey } from '@/lib/bulk-import-schema'

// Writes only what the last preview approved — the client sends already-
// resolved generation_ids and already-validated field values, no raw CSV
// strings, no re-parsing. One RPC call, one transaction, all-or-nothing.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { rows: ({ generation_id: string } & Partial<Record<EnrichmentFieldKey, EnrichmentValue>>)[] } = await req.json()

  if (!body.rows?.length) {
    return NextResponse.json({ error: 'No rows to commit' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('bulk_update_generation_enrichment', { rows: body.rows })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ updated: data })
}
