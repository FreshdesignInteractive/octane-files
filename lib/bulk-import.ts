// Shared helpers for CSV enrichment data: resolving a CSV row's (make,
// model, generation code) to a live generation row, parsing + validating a
// row's enrichment fields against the schema in bulk-import-schema.ts,
// diffing current-vs-incoming values for the bulk importer's preview
// report, and applying parsed values onto a GenerationInput for the per-car
// quick-import flow. Blank cell = omitted key = "leave unchanged"
// throughout — callers never see a key for a field the CSV didn't provide.
//
// No server-only imports (resolveGeneration takes a SupabaseClient as a
// parameter rather than constructing one) — safe to import from either an
// API route or a 'use client' component.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ENRICHMENT_FIELDS, isRadarField, isRelationField, isMakeField, RADAR_FIELD_TO_AXIS, RELATION_FIELD_TYPE,
  type EnrichmentFieldKey,
} from './bulk-import-schema'
import type { RadarScores, GenerationInput } from './car-schema'

// True for any EnrichmentFieldKey that isn't a literal generations column —
// radar axes and market_notes merge into a JSONB column instead, and
// rivals/lineage don't touch generations at all. resolveGeneration must
// never name one of these in its SELECT list (see the units_produced_
// estimated live-breakage lesson — an explicit SELECT of a nonexistent
// column 42703s the whole query, not just that field).
function isSyntheticField(key: EnrichmentFieldKey): boolean {
  return isRadarField(key) || isRelationField(key) || isMakeField(key) || key === 'market_notes'
}

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

  // Synthetic keys (radar axes, market_notes, rivals/lineage) aren't real
  // columns — select the real radar_scores/market_data JSONB columns once
  // instead. rivals/lineage have no equivalent column at all (they read
  // car_relations, a child table); diffEnrichmentFields deliberately never
  // diffs those two, so nothing else needs selecting for them here.
  const realColumns = ENRICHMENT_FIELDS.filter(f => !isSyntheticField(f.key)).map(f => f.key)
  const selectCols = ['id', 'slug', 'archived_at', 'radar_scores', 'market_data', ...realColumns].join(', ')
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
    // Falls back to a legacy header only when the current one is blank —
    // a CSV built before a header rename (e.g. EngineSignature -> Engine)
    // still resolves to the same field, without a real column ever having
    // two values to reconcile (a row can't sensibly have both).
    let raw = (row[spec.header] ?? '').trim()
    if (raw === '') {
      for (const legacyHeader of spec.legacyHeaders ?? []) {
        raw = (row[legacyHeader] ?? '').trim()
        if (raw !== '') break
      }
    }
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
    } else if (spec.type === 'text_list') {
      // Free text, no allowlist — just split/trim/dedupe-empty. Duplicate
      // label_text for the same car+type is a DB-level unique index, so
      // there's no need to dedupe within the row either.
      const parts = raw.split(';').map(s => s.trim()).filter(Boolean)
      if (parts.length) values[spec.key] = parts
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
// rivals/lineage are deliberately never diffed here — they're additive
// (a duplicate label_text is a silent DB-level no-op, not an "update"),
// not a single before/after value like every other field. The preview UI
// reads them straight off `incoming` (i.e. the parsed values) instead.
export function diffEnrichmentFields(
  current: ResolvedGeneration,
  incoming: Partial<Record<EnrichmentFieldKey, EnrichmentValue>>
): FieldDiff[] {
  const diffs: FieldDiff[] = []
  const radarScores = (current.radar_scores as RadarScores | null) ?? {}
  const marketData = (current.market_data as { notes?: string | null } | null) ?? null
  for (const spec of ENRICHMENT_FIELDS) {
    if (!(spec.key in incoming)) continue
    // Neither has a single before/after value living on the resolved
    // generation row — relations are additive child rows, and
    // manufacturer_full_name lives on a different table (the linked
    // make) that resolveGeneration doesn't select. Same "no diff line for
    // this one" treatment as rivals/lineage.
    if (isRelationField(spec.key) || isMakeField(spec.key)) continue
    const to = incoming[spec.key]!
    const from = isRadarField(spec.key) ? radarScores[RADAR_FIELD_TO_AXIS[spec.key]] ?? null
      : spec.key === 'market_notes' ? (marketData?.notes ?? null)
      : current[spec.key]
    const changed = spec.type === 'enum_array'
      ? JSON.stringify([...(from as string[] ?? [])].sort()) !== JSON.stringify([...(to as string[])].sort())
      : from !== to
    if (changed) diffs.push({ field: spec.key, header: spec.header, from, to })
  }
  return diffs
}

// Merges parsed CSV values onto a GenerationInput for the per-car edit
// page's quick-import flow — same "only touch provided fields" rule as
// diffEnrichmentFields, and the same radar_scores merge-not-replace
// behavior as bulk_update_generation_enrichment (a CSV that only supplies
// RadarRarity doesn't clobber the other 6 already-set axes). Returns a new
// object; doesn't mutate `current`. A targeted cast is needed to assign a
// dynamic EnrichmentFieldKey onto GenerationInput's specifically-typed
// fields (e.g. `class: CarClassValue`) — same pattern the edit form's own
// <select> onChange handlers already use.
//
// rivals/lineage are skipped here, not applied — GenerationInput has no
// such field (car_relations is a separate child table, edited via
// CarRelationsEditor's own state in AdminModelForm). This per-car quick-
// import path doesn't create relation rows; only the bulk /commit route
// does, via buildRelationInserts below.
export function applyEnrichmentValues(
  current: GenerationInput,
  values: Partial<Record<EnrichmentFieldKey, EnrichmentValue>>
): GenerationInput {
  const next = { ...current } as unknown as Record<string, unknown>
  const radarScores: RadarScores = { ...(current.radar_scores ?? {}) }
  let marketData = current.market_data

  for (const spec of ENRICHMENT_FIELDS) {
    if (!(spec.key in values)) continue
    // Neither applies to a single GenerationInput this way — relations are
    // separate child rows the bulk /commit route creates directly, and
    // manufacturer_full_name has no GenerationInput field at all (it's
    // make-level, not per-generation); it only ever reaches the DB via
    // bulk_update_make_enrichment in the bulk importer's commit route, not
    // this per-car quick-import merge.
    if (isRelationField(spec.key) || isMakeField(spec.key)) continue
    const v = values[spec.key]!
    if (isRadarField(spec.key)) radarScores[RADAR_FIELD_TO_AXIS[spec.key]] = v as number
    else if (spec.key === 'market_notes') {
      marketData = { currency: 'USD', as_of: null, low: null, mid: null, high: null, ...marketData, notes: v as string }
    } else next[spec.key] = v
  }

  next.radar_scores = radarScores
  next.market_data = marketData
  return next as unknown as GenerationInput
}

// Flattens a matched row's parsed rivals/lineage arrays into the row shape
// bulk_add_car_relations expects. Called once per matched+included row when
// building the bulk /commit payload — every entry becomes its own plain-
// text car_relations row (relation_type from RELATION_FIELD_TYPE,
// linked_generation_id always null; upgrading to a real linked car is a
// picker-only action in the edit form).
export function buildRelationInserts(
  generationId: string,
  values: Partial<Record<EnrichmentFieldKey, EnrichmentValue>>
): { generation_id: string; relation_type: 'rival' | 'related'; label_text: string }[] {
  const inserts: { generation_id: string; relation_type: 'rival' | 'related'; label_text: string }[] = []
  for (const [key, relationType] of Object.entries(RELATION_FIELD_TYPE) as [keyof typeof RELATION_FIELD_TYPE, 'rival' | 'related'][]) {
    const entries = values[key] as string[] | undefined
    if (!entries?.length) continue
    for (const label_text of entries) inserts.push({ generation_id: generationId, relation_type: relationType, label_text })
  }
  return inserts
}
