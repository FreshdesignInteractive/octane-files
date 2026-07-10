// Shared server-side helpers for the bulk CSV importer: resolving a CSV
// row's (make, model, generation code) to a live generation row, parsing +
// validating a row's enrichment fields against the schema in
// bulk-import-schema.ts, and diffing current-vs-incoming values for the
// preview report. Blank cell = omitted key = "leave unchanged" throughout —
// callers never see a key for a field the CSV didn't provide.

import type { SupabaseClient } from '@supabase/supabase-js'
import { ENRICHMENT_FIELDS, isRadarField, RADAR_FIELD_TO_AXIS, type EnrichmentFieldKey } from './bulk-import-schema'
import type { RadarScores } from './car-schema'

export interface ResolvedGeneration {
  id: string
  slug: string
  archived_at: string | null
  [key: string]: unknown
}

// Exact case-insensitive match (ILIKE with no wildcards), same as the phase
// dry-run scripts' makeByName/model-ilike/generation-eq-code chain.
export async function resolveGeneration(
  supabase: SupabaseClient, make: string, model: string, code: string
): Promise<ResolvedGeneration | null> {
  const { data: makeRow } = await supabase.from('makes').select('id').ilike('name', make.trim()).maybeSingle()
  if (!makeRow) return null

  const { data: modelRow } = await supabase.from('models').select('id').eq('make_id', makeRow.id).ilike('name', model.trim()).maybeSingle()
  if (!modelRow) return null

  // radar_* keys are synthetic (no literal generations.radar_desirability
  // column) — select the real radar_scores JSONB column once instead.
  const realColumns = ENRICHMENT_FIELDS.filter(f => !isRadarField(f.key)).map(f => f.key)
  const selectCols = ['id', 'slug', 'archived_at', 'radar_scores', ...realColumns].join(', ')
  const { data: gen } = await supabase
    .from('generations')
    .select(selectCols)
    .eq('model_id', modelRow.id)
    .eq('code', code.trim())
    .maybeSingle()

  return (gen as unknown as ResolvedGeneration) ?? null
}

export type EnrichmentValue = string | number | boolean | string[]

export interface FieldValidationError {
  field: EnrichmentFieldKey
  header: string
  value: string
  reason: string
}

export interface ParsedEnrichmentRow {
  values: Partial<Record<EnrichmentFieldKey, EnrichmentValue>>
  errors: FieldValidationError[]
}

// Blank cell -> key omitted entirely, never written even as null. Invalid
// enum/boolean/integer values are collected as errors, not silently coerced
// or dropped — the caller (preview route) surfaces these and excludes the
// row from commit.
export function parseEnrichmentFields(row: Record<string, string>): ParsedEnrichmentRow {
  const values: Partial<Record<EnrichmentFieldKey, EnrichmentValue>> = {}
  const errors: FieldValidationError[] = []

  for (const spec of ENRICHMENT_FIELDS) {
    const raw = (row[spec.header] ?? '').trim()
    if (raw === '') continue

    if (spec.type === 'text') {
      values[spec.key] = raw
    } else if (spec.type === 'enum') {
      const match = spec.allowedValues!.find(v => v.toLowerCase() === raw.toLowerCase())
      if (!match) errors.push({ field: spec.key, header: spec.header, value: raw, reason: `"${raw}" is not one of ${spec.allowedValues!.join('/')}` })
      else values[spec.key] = match
    } else if (spec.type === 'enum_array') {
      const parts = raw.split(';').map(s => s.trim()).filter(Boolean)
      const resolved: string[] = []
      for (const p of parts) {
        const match = spec.allowedValues!.find(v => v.toLowerCase() === p.toLowerCase())
        if (!match) errors.push({ field: spec.key, header: spec.header, value: p, reason: `"${p}" is not one of ${spec.allowedValues!.join('/')}` })
        else resolved.push(match)
      }
      if (resolved.length) values[spec.key] = resolved
    } else if (spec.type === 'boolean') {
      const v = raw.toLowerCase()
      if (v === 'yes' || v === 'true') values[spec.key] = true
      else if (v === 'no' || v === 'false') values[spec.key] = false
      else errors.push({ field: spec.key, header: spec.header, value: raw, reason: 'must be Yes/No or true/false' })
    } else if (spec.type === 'integer') {
      const n = parseInt(raw, 10)
      if (Number.isNaN(n)) {
        errors.push({ field: spec.key, header: spec.header, value: raw, reason: 'must be a whole number' })
      } else if (spec.range && (n < spec.range[0] || n > spec.range[1])) {
        errors.push({ field: spec.key, header: spec.header, value: raw, reason: `must be between ${spec.range[0]} and ${spec.range[1]}` })
      } else {
        values[spec.key] = n
      }
    }
  }

  return { values, errors }
}

export function findUnknownColumns(headers: string[], known: Set<string>): string[] {
  return headers.filter(h => h.trim() !== '' && !known.has(h))
}

export interface FieldDiff {
  field: EnrichmentFieldKey
  header: string
  from: unknown
  to: EnrichmentValue
}

// Only fields present in `incoming` are compared — a blank cell never
// produces a diff entry, since it was never a candidate for change.
export function diffEnrichmentFields(
  current: ResolvedGeneration,
  incoming: Partial<Record<EnrichmentFieldKey, EnrichmentValue>>
): FieldDiff[] {
  const diffs: FieldDiff[] = []
  const radarScores = (current.radar_scores as RadarScores | null) ?? {}
  for (const spec of ENRICHMENT_FIELDS) {
    if (!(spec.key in incoming)) continue
    const to = incoming[spec.key]!
    const from = isRadarField(spec.key) ? radarScores[RADAR_FIELD_TO_AXIS[spec.key]] ?? null : current[spec.key]
    const changed = spec.type === 'enum_array'
      ? JSON.stringify([...(from as string[] ?? [])].sort()) !== JSON.stringify([...(to as string[])].sort())
      : from !== to
    if (changed) diffs.push({ field: spec.key, header: spec.header, from, to })
  }
  return diffs
}
