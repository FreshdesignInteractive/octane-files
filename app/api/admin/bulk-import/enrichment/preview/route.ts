import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import { KNOWN_ENRICHMENT_HEADERS } from '@/lib/bulk-import-schema'
import { resolveGeneration, parseEnrichmentFields, diffEnrichmentFields, findUnknownColumns } from '@/lib/bulk-import'

// Read-only: resolves + validates + diffs every row, never writes. The
// admin reviews this report and only the rows they keep checked get sent
// to /commit.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { headers: string[]; rows: Record<string, string>[] } = await req.json()
  const unknownColumns = findUnknownColumns(body.headers, KNOWN_ENRICHMENT_HEADERS)

  // Every row is independently try/caught — one row throwing (a bad Supabase
  // response, an unexpected shape) must never abort the batch and hide every
  // other row's results. The whole point of a single-pass preview is that
  // ALL problems come back together, not "fix this one, re-upload, hit the
  // next" one exception at a time.
  const results = []
  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const make = row.Make ?? '', model = row.Model ?? '', generation = row.Generation ?? ''
    try {
      const { values, errors } = parseEnrichmentFields(row)
      const resolved = await resolveGeneration(supabase, make, model, generation)

      if (!resolved) {
        results.push({ row_index: i, make, model, generation, match: { status: 'unmatched' as const } })
        continue
      }
      if (errors.length > 0) {
        results.push({
          row_index: i, make, model, generation,
          match: { status: 'invalid' as const, generation_id: resolved.id, slug: resolved.slug, errors },
        })
        continue
      }
      results.push({
        row_index: i, make, model, generation,
        match: {
          status: 'matched' as const,
          generation_id: resolved.id,
          slug: resolved.slug,
          archived: !!resolved.archived_at,
          fields: values,
          diffs: diffEnrichmentFields(resolved, values),
        },
      })
    } catch (err) {
      results.push({
        row_index: i, make, model, generation,
        match: { status: 'error' as const, message: err instanceof Error ? err.message : String(err) },
      })
    }
  }

  return NextResponse.json({ unknownColumns, rows: results })
}
