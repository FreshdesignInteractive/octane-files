import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import type { GenerationInput } from '@/lib/car-schema'

// Writes go through the signed-in admin's own session, not a service-role
// bypass — RLS's "Admin write" policy (is_admin()) independently gates the
// write at the database level, on top of the explicit check below. If the
// app-level check ever had a bug, the database would still refuse the write.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const body: Partial<GenerationInput> & { archived_at?: string | null } = await req.json()

  const { data, error } = await supabase
    .from('generations')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
