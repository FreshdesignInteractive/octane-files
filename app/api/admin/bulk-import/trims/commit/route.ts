import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'

interface CommitTrimRow {
  generation_id: string
  name: string
  years: string | null
  description: string | null
  production_notes: string | null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { rows: CommitTrimRow[] } = await req.json()
  if (!body.rows?.length) {
    return NextResponse.json({ error: 'No rows to commit' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('bulk_upsert_trims', { rows: body.rows })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ upserted: data })
}
