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
// low-mid-high/resources (structured/nested, not flat CSV columns), lineage/
// rivals (car_relations — linked-vs-text doesn't fit a flat cell), trims
// (separate CSV type), and year_start/year_end/production_years/code
// (identity fields — changing these redefines the car and belongs in the
// form, not a bulk import).
//
// The 7 radar axes are synthetic keys (radar_desirability, etc.) — there is
// no literal generations.radar_desirability column. They merge into the
// radar_scores JSONB column via bulk_update_generation_enrichment (see
// imports/step18_callout_rename.sql). lib/bulk-import.ts special-cases these
// keys when building the SELECT list and when diffing against current values.

import {
  CAR_CLASSES, BODY_STYLES, DRIVETRAIN_TYPES, ENGINE_LAYOUTS,
  DESIRABILITY_TIERS, VALUE_TRAJECTORIES, RADAR_AXES, type RadarAxisKey,
} from './car-schema'

export type RadarFieldKey =
  | 'radar_desirability' | 'radar_rarity' | 'radar_driving_thrill' | 'radar_investment_trajectory'
  | 'radar_usability' | 'radar_ease_of_restoration' | 'radar_cultural_impact'

export type EnrichmentFieldKey =
  | 'nickname' | 'designer' | 'wikipedia_url' | 'engine_signature' | 'class' | 'engine_layout'
  | 'units_produced' | 'is_icon' | 'homologation_special' | 'poster_car' | 'body_styles' | 'drivetrain'
  | 'overview'
  | 'callout' | 'claim_to_fame' | 'why_collectible' | 'buyers_flag'
  | 'analog_index' | RadarFieldKey
  | 'variants_to_know'
  | 'driving_character' | 'design_notes' | 'motorsport_pedigree' | 'cultural_notes'
  | 'desirability_tier' | 'value_trajectory'
  | 'known_issues' | 'maintenance'

export type FieldType = 'text' | 'enum' | 'enum_array' | 'boolean' | 'integer'

export interface FieldSpec {
  key: EnrichmentFieldKey
  header: string
  type: FieldType
  allowedValues?: readonly string[]
  // Inclusive range for integer fields (AnalogIndex + the 7 radar axes).
  range?: readonly [number, number]
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

const radarFieldSpecs: FieldSpec[] = RADAR_AXES.map(axis => ({
  key: (Object.keys(RADAR_FIELD_TO_AXIS) as RadarFieldKey[]).find(k => RADAR_FIELD_TO_AXIS[k] === axis.key)!,
  header: `Radar${axis.label.replace(/\s+/g, '')}`,
  type: 'integer',
  range: [1, 10] as const,
}))

// Canonical order — mirrors Identity & Classification -> Overview -> Why
// collectors want it -> How it scores -> Which one to look for -> What it's
// like -> Market Data -> What owning one is like, i.e. the same section
// order as the edit and public pages, skipping structured-only sections.
export const ENRICHMENT_FIELDS: FieldSpec[] = [
  { key: 'nickname', header: 'Nickname', type: 'text' },
  { key: 'designer', header: 'Designer', type: 'text' },
  { key: 'wikipedia_url', header: 'WikipediaURL', type: 'text' },
  { key: 'engine_signature', header: 'EngineSignature', type: 'text' },
  { key: 'class', header: 'Class', type: 'enum', allowedValues: CAR_CLASSES.map(c => c.value) },
  { key: 'engine_layout', header: 'EngineLayout', type: 'enum', allowedValues: ENGINE_LAYOUTS },
  { key: 'units_produced', header: 'UnitsProduced', type: 'integer' },
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

  { key: 'analog_index', header: 'AnalogIndex', type: 'integer', range: [1, 10] },
  ...radarFieldSpecs,

  { key: 'variants_to_know', header: 'VariantsToKnow', type: 'text' },

  { key: 'driving_character', header: 'DrivingCharacter', type: 'text' },
  { key: 'design_notes', header: 'DesignNotes', type: 'text' },
  { key: 'motorsport_pedigree', header: 'MotorsportPedigree', type: 'text' },
  { key: 'cultural_notes', header: 'CulturalNotes', type: 'text' },

  { key: 'desirability_tier', header: 'DesirabilityTier', type: 'enum', allowedValues: DESIRABILITY_TIERS },
  { key: 'value_trajectory', header: 'ValueTrajectory', type: 'enum', allowedValues: VALUE_TRAJECTORIES.map(v => v.value) },

  { key: 'known_issues', header: 'KnownIssues', type: 'text' },
  { key: 'maintenance', header: 'Maintenance', type: 'text' },
]

// The three key columns used to resolve a row to an existing generation —
// never part of ENRICHMENT_FIELDS, always required, never diffed/written.
export const KEY_COLUMNS = ['Make', 'Model', 'Generation'] as const

export const KNOWN_ENRICHMENT_HEADERS = new Set<string>([...KEY_COLUMNS, ...ENRICHMENT_FIELDS.map(f => f.header)])

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
