// Explicit CSV header <-> generations column mapping for the bulk enrichment
// importer. Deliberately a hand-written dict, not a string-transform of
// header names — safer to read and safer to extend. Enum allow-lists are
// re-exported from car-schema.ts so there is exactly one source of truth
// for valid values, same as the admin form.
//
// Column order mirrors the canonical section order used by the edit page
// (GenerationFieldsEditor.tsx) and the public page (app/cars/[slug]/page.tsx)
// wherever a field appears in both — see imports/CSV_TEMPLATE_GUIDE.md.
//
// Covers GenerationInput's flat, CSV-shaped fields only. Deliberately
// excludes: hero_image/gallery_images (image upload flow), specs/market_data
// low-mid-high (structured/nested, not flat CSV columns), resources, trims
// (separate CSV type), and year_start/year_end/production_years/code
// (identity fields — changing these redefines the car and belongs in the
// form, not a bulk import).
//
// The 7 radar axes, plus market_notes/rivals/lineage, are synthetic keys —
// there is no literal generations.radar_desirability/market_notes column,
// and rivals/lineage don't land on generations at all (they become plain-
// text car_relations rows, see bulk_add_car_relations in
// imports/step21_bulk_relations_and_market_notes.sql). The radar axes and
// market_notes merge into the radar_scores/market_data JSONB columns via
// bulk_update_generation_enrichment. lib/bulk-import.ts special-cases all
// of these keys when building the SELECT list and when diffing against
// current values.

import {
  CAR_CLASSES, BODY_STYLES, DRIVETRAIN_TYPES, ENGINE_LAYOUTS,
  DESIRABILITY_TIERS, VALUE_TRAJECTORIES, RADAR_AXES, type RadarAxisKey,
} from './car-schema'

export type RadarFieldKey =
  | 'radar_desirability' | 'radar_rarity' | 'radar_driving_thrill' | 'radar_investment_trajectory'
  | 'radar_usability' | 'radar_ease_of_restoration' | 'radar_cultural_impact'

// Not literal generations columns — rivals/lineage become plain-text
// car_relations rows (relation_type rival/related) instead of a column
// value. Free text, not linked-car entries; upgrading a text entry to a
// real linked car is still a picker-only action in the edit form.
export type RelationFieldKey = 'rivals' | 'lineage'

export type EnrichmentFieldKey =
  | 'nickname' | 'designer' | 'wikipedia_url' | 'engine_signature' | 'transmission' | 'class' | 'engine_layout'
  | 'units_produced' | 'units_produced_estimated' | 'is_icon' | 'homologation_special' | 'poster_car' | 'body_styles' | 'drivetrain'
  | 'overview'
  | 'callout' | 'claim_to_fame' | 'why_collectible' | 'buyers_flag'
  | 'electronic_dependence' | 'electronic_dependence_notes' | RadarFieldKey
  | 'variants_to_know'
  | 'driving_character' | 'design_notes' | 'motorsport_pedigree' | 'cultural_notes'
  | RelationFieldKey
  | 'desirability_tier' | 'value_trajectory' | 'market_notes'
  | 'known_issues' | 'maintenance'

export type FieldType = 'text' | 'text_list' | 'enum' | 'enum_array' | 'boolean' | 'integer'

export interface FieldSpec {
  key: EnrichmentFieldKey
  header: string
  type: FieldType
  allowedValues?: readonly string[]
  // Inclusive range for integer fields (ElectronicDependence + the 7 radar axes).
  range?: readonly [number, number]
  // Old header names this field used to be exported/imported under, still
  // accepted on read so CSVs generated before a header rename keep working.
  // Never used for the template/catalog CSV we generate — only as a
  // fallback in parseEnrichmentFields when the current header is blank.
  legacyHeaders?: readonly string[]
}

// Maps each synthetic radar CSV field to the RadarAxisKey it merges into
// within radar_scores. Single source of truth shared by lib/bulk-import.ts
// (SELECT-list exclusion + diffing) — keep this in step with RADAR_AXES.
export const RADAR_FIELD_TO_AXIS: Record<RadarFieldKey, RadarAxisKey> = {
  radar_desirability: 'desirability',
  radar_rarity: 'rarity',
  radar_driving_thrill: 'driving_thrill',
  radar_investment_trajectory: 'investment_trajectory',
  radar_usability: 'usability',
  radar_ease_of_restoration: 'ease_of_restoration',
  radar_cultural_impact: 'cultural_impact',
}

export function isRadarField(key: EnrichmentFieldKey): key is RadarFieldKey {
  return key in RADAR_FIELD_TO_AXIS
}

// Maps each relation CSV field to the car_relations.relation_type it
// becomes — shared with lib/bulk-import.ts's commit-payload builder.
export const RELATION_FIELD_TYPE: Record<RelationFieldKey, 'rival' | 'related'> = {
  rivals: 'rival',
  lineage: 'related',
}

export function isRelationField(key: EnrichmentFieldKey): key is RelationFieldKey {
  return key in RELATION_FIELD_TYPE
}

// Headers are hand-written, not derived from RADAR_AXES' labels — a naive
// `Radar${label.replace(/\s+/g, '')}` derivation once silently produced
// "RadarEaseofRestoration" (lowercase "of") instead of the intended
// RadarEaseOfRestoration, because stripping whitespace doesn't recapitalize
// the words it joins. Explicit beats derived for a list this short.
const RADAR_FIELD_HEADERS: Record<RadarFieldKey, string> = {
  radar_desirability: 'RadarDesirability',
  radar_rarity: 'RadarRarity',
  radar_driving_thrill: 'RadarDrivingThrill',
  radar_investment_trajectory: 'RadarInvestmentTrajectory',
  radar_usability: 'RadarUsability',
  radar_ease_of_restoration: 'RadarEaseOfRestoration',
  radar_cultural_impact: 'RadarCulturalImpact',
}

const radarFieldSpecs: FieldSpec[] = RADAR_AXES.map(axis => {
  const key = (Object.keys(RADAR_FIELD_TO_AXIS) as RadarFieldKey[]).find(k => RADAR_FIELD_TO_AXIS[k] === axis.key)!
  return { key, header: RADAR_FIELD_HEADERS[key], type: 'integer', range: [1, 10] as const }
})

// Canonical order — mirrors Identity & Classification -> Overview -> Why
// collectors want it -> The scorecard -> Which one to look for -> What it's
// like -> Market Data -> What owning one is like, i.e. the same section
// order as the edit and public pages, skipping structured-only sections.
export const ENRICHMENT_FIELDS: FieldSpec[] = [
  { key: 'nickname', header: 'Nickname', type: 'text' },
  { key: 'designer', header: 'Designer', type: 'text' },
  { key: 'wikipedia_url', header: 'WikipediaURL', type: 'text' },
  { key: 'engine_signature', header: 'Engine', type: 'text', legacyHeaders: ['EngineSignature'] },
  { key: 'transmission', header: 'Transmission', type: 'text' },
  { key: 'engine_layout', header: 'EngineLayout', type: 'enum', allowedValues: ENGINE_LAYOUTS },
  { key: 'class', header: 'Class', type: 'enum', allowedValues: CAR_CLASSES.map(c => c.value) },
  { key: 'units_produced', header: 'UnitsProduced', type: 'integer' },
  { key: 'units_produced_estimated', header: 'UnitsProducedEstimated', type: 'boolean' },
  { key: 'is_icon', header: 'IsIcon', type: 'boolean' },
  { key: 'homologation_special', header: 'HomologationSpecial', type: 'boolean' },
  { key: 'poster_car', header: 'PosterCar', type: 'boolean' },
  { key: 'body_styles', header: 'BodyStyles', type: 'enum_array', allowedValues: BODY_STYLES },
  { key: 'drivetrain', header: 'Drivetrain', type: 'enum_array', allowedValues: DRIVETRAIN_TYPES },

  { key: 'overview', header: 'Overview', type: 'text' },

  { key: 'callout', header: 'Callout', type: 'text' },
  { key: 'claim_to_fame', header: 'ClaimToFame', type: 'text' },
  { key: 'why_collectible', header: 'WhyCollectible', type: 'text' },
  { key: 'buyers_flag', header: 'BuyersGuide', type: 'text' },

  // Analog Index (1-10) is retired — superseded by these two, same
  // position in column order. The old column survives read-only as
  // analog_index_legacy, same non-bulk-editable treatment as
  // desirability_tier_legacy, so it's not in ENRICHMENT_FIELDS at all.
  { key: 'electronic_dependence', header: 'ElectronicDependence', type: 'integer', range: [1, 5] },
  { key: 'electronic_dependence_notes', header: 'ElectronicDependenceNotes', type: 'text' },
  ...radarFieldSpecs,

  { key: 'variants_to_know', header: 'VariantsToKnow', type: 'text' },

  { key: 'driving_character', header: 'DrivingCharacter', type: 'text' },
  { key: 'design_notes', header: 'DesignNotes', type: 'text' },
  { key: 'motorsport_pedigree', header: 'MotorsportPedigree', type: 'text' },
  { key: 'cultural_notes', header: 'CulturalNotes', type: 'text' },

  // Semicolon-separated; each entry lands as its own plain-text
  // car_relations row (relation_type rival/related, linked_generation_id
  // null). A duplicate label_text for the same car+type is silently
  // skipped on re-upload (DB-level unique index), so re-running an
  // unchanged CSV is always safe.
  { key: 'lineage', header: 'Lineage', type: 'text_list' },
  { key: 'rivals', header: 'Rivals', type: 'text_list' },

  { key: 'desirability_tier', header: 'DesirabilityTier', type: 'enum', allowedValues: DESIRABILITY_TIERS },
  { key: 'value_trajectory', header: 'ValueTrajectory', type: 'enum', allowedValues: VALUE_TRAJECTORIES.map(v => v.value) },
  { key: 'market_notes', header: 'MarketNotes', type: 'text' },

  { key: 'known_issues', header: 'KnownIssues', type: 'text' },
  { key: 'maintenance', header: 'Maintenance', type: 'text' },
]

// The three key columns used to resolve a row to an existing generation —
// never part of ENRICHMENT_FIELDS, always required, never diffed/written.
export const KEY_COLUMNS = ['Make', 'Model', 'Generation'] as const

export const KNOWN_ENRICHMENT_HEADERS = new Set<string>([
  ...KEY_COLUMNS,
  ...ENRICHMENT_FIELDS.map(f => f.header),
  ...ENRICHMENT_FIELDS.flatMap(f => f.legacyHeaders ?? []),
])

export const TRIM_FIELDS = [
  { key: 'name', header: 'Name' },
  { key: 'years', header: 'Years' },
  { key: 'description', header: 'Description' },
  { key: 'production_notes', header: 'ProductionNotes' },
] as const

export const KNOWN_TRIM_HEADERS = new Set<string>([...KEY_COLUMNS, ...TRIM_FIELDS.map(f => f.header)])

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function csvLine(fields: string[]): string {
  return fields.map(csvEscape).join(',')
}

// One representative value per field type, so the exact expected format
// (enum casing, ';'-separated arrays, Yes/No booleans) is unambiguous —
// free-text fields are left blank since there's no format to demonstrate.
// The Make/Model/Generation on the example row deliberately don't match
// any real car, so uploading the template unmodified is harmless (shows up
// as "Unmatched" in preview) rather than accidentally overwriting a car.
function exampleValueFor(spec: FieldSpec): string {
  if (spec.type === 'enum') return spec.allowedValues![0]
  if (spec.type === 'enum_array') return spec.allowedValues!.slice(0, 2).join(';')
  // No allowedValues to demonstrate (free text), but still worth showing
  // the ';' delimiter format for a multi-entry field.
  if (spec.type === 'text_list') return 'Example A;Example B'
  if (spec.type === 'boolean') return 'Yes'
  if (spec.type === 'integer') return spec.range ? String(spec.range[0]) : '1'
  return ''
}

// Clean CSV — no embedded '#' comment rows. Column meaning, allowed values,
// and the empty-cell rule are documented once in imports/CSV_TEMPLATE_GUIDE.md
// instead, so the file that gets uploaded is exactly the file that gets
// filled in, with no guide rows to strip or accidentally leave in place.
export function buildEnrichmentTemplateCsv(): string {
  const headers = [...KEY_COLUMNS, ...ENRICHMENT_FIELDS.map(f => f.header)]
  const example = ['ExampleMake', 'ExampleModel', '1st Gen', ...ENRICHMENT_FIELDS.map(exampleValueFor)]
  return [csvLine(headers), csvLine(example)].join('\n') + '\n'
}

export function buildTrimsTemplateCsv(): string {
  const headers = [...KEY_COLUMNS, ...TRIM_FIELDS.map(f => f.header)]
  const example = ['ExampleMake', 'ExampleModel', '1st Gen', 'Example Trim Name', '1969', '', '']
  return [csvLine(headers), csvLine(example)].join('\n') + '\n'
}

// Pre-fills Make/Model/Generation for every real car in the catalog, with
// every content column left blank — for handing off to someone (or another
// AI with no access to this codebase/database) to fill in en masse without
// ever having to invent an identity, which would otherwise silently show up
// as "Unmatched" in preview if the wording didn't exactly match a real car.
export function buildEnrichmentCatalogCsv(cars: { make: string; model: string; generation: string }[]): string {
  const headers = [...KEY_COLUMNS, ...ENRICHMENT_FIELDS.map(f => f.header)]
  const blankFields = ENRICHMENT_FIELDS.map(() => '')
  const rows = cars.map(c => csvLine([c.make, c.model, c.generation, ...blankFields]))
  return [csvLine(headers), ...rows].join('\n') + '\n'
}
