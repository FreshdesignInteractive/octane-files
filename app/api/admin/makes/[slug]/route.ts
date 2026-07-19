import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'

// Only full_name/intro_text are editable here — name/slug/country stay
// fixed (renaming a make would move its /marques/[slug] URL and the
// Manufacturer link on every one of its cars, same class of problem the
// generation slug auto-derivation already solves for individual cars; not
// tackled here since it wasn't asked for). Writes go through the signed-in
// admin's own session — RLS's existing "Admin write" ON makes policy
// (is_admin()) independently gates the write, same pattern as every other
// admin write route.
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
  const body: { full_name?: string | null; intro_text?: string | null } = await req.json()

  const { data, error } = await supabase
    .from('makes')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
