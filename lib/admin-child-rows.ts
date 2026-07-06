import type { SupabaseClient } from '@supabase/supabase-js'

// Shared plumbing for "child rows under a generation" (trims, car_relations):
// resolve the owning generation's id by slug, then replace-all — delete
// everything under that generation_id and insert the submitted set. Both
// child tables use this same replace-all semantics as every other array
// field in the admin form (gallery_images, resources), just via real rows
// instead of a JSONB column, so it's idempotent and safe to retry.

export async function resolveGenerationId(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await supabase.from('generations').select('id').eq('slug', slug).maybeSingle()
  return data?.id ?? null
}

export async function replaceGenerationChildRows<TRow extends object>(
  supabase: SupabaseClient,
  table: string,
  generationId: string,
  rows: TRow[]
): Promise<{ data: (TRow & { id: string; generation_id: string; created_at: string })[] } | { error: string }> {
  const { error: deleteError } = await supabase.from(table).delete().eq('generation_id', generationId)
  if (deleteError) return { error: deleteError.message }

  if (rows.length === 0) return { data: [] }

  const { data, error: insertError } = await supabase
    .from(table)
    .insert(rows.map(r => ({ ...r, generation_id: generationId })))
    .select()

  if (insertError) return { error: insertError.message }
  return { data: data ?? [] }
}
