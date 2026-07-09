// Explicit CSV header <-> generations column mapping for the bulk enrichment
// importer. Deliberately a hand-written dict, not a string-transform of
// header names — safer to read and safer to extend. Enum allow-lists are
// re-exported from car-schema.ts so there is exactly one source of truth
// for valid values, same as the admin form.
//
// Covers GenerationInput's flat, CSV-shaped fields only. Deliberately
// excludes: hero_image/gallery_images (image upload flow), specs/market_data/
// resources/radar_scores (structured/nested, not flat CSV columns), and
// year_start/year_end/production_years/code (identity fields — changing
// these redefines the car and belongs in the form, not a bulk import).

import {
  CAR_CLASSES, BODY_STYLES, DRIVETRAIN_TYPES, ENGINE_LAYOUTS,
  DESIRABILITY_TIERS, VALUE_TRAJECTORIES,
} from './car-schema'

export type EnrichmentFieldKey =
  | 'nickname' | 'overview' | 'why_collectible' | 'engine_signature' | 'variants_to_know'
  | 'known_issues' | 'claim_to_fame' | 'buyers_flag' | 'designer' | 'desirability_tier'
  | 'class' | 'is_icon' | 'body_styles' | 'drivetrain' | 'engine_layout' | 'units_produced'
  | 'wikipedia_url' | 'firsts_and_lasts' | 'driving_character' | 'design_notes'
  | 'cultural_notes' | 'motorsport_pedigree' | 'maintenance' | 'value_trajectory'
  | 'analog_index' | 'homologation_special' | 'poster_car'

export type FieldType = 'text' | 'enum' | 'enum_array' | 'boolean' | 'integer'

export interface FieldSpec {
  key: EnrichmentFieldKey
  header: string
  type: FieldType
  allowedValues?: readonly string[]
}

export const ENRICHMENT_FIELDS: FieldSpec[] = [
  { key: 'nickname', header: 'Nickname', type: 'text' },
  { key: 'desirability_tier', header: 'DesirabilityTier', type: 'enum', allowedValues: DESIRABILITY_TIERS },
  { key: 'overview', header: 'Overview', type: 'text' },
  { key: 'why_collectible', header: 'WhyCollectible', type: 'text' },
  { key: 'engine_signature', header: 'EngineSignature', type: 'text' },
  { key: 'variants_to_know', header: 'VariantsToKnow', type: 'text' },
  { key: 'known_issues', header: 'KnownIssues', type: 'text' },
  { key: 'claim_to_fame', header: 'ClaimToFame', type: 'text' },
  { key: 'buyers_flag', header: 'BuyersFlag', type: 'text' },
  { key: 'designer', header: 'Designer', type: 'text' },
  { key: 'class', header: 'Class', type: 'enum', allowedValues: CAR_CLASSES.map(c => c.value) },
  { key: 'is_icon', header: 'IsIcon', type: 'boolean' },
  { key: 'body_styles', header: 'BodyStyles', type: 'enum_array', allowedValues: BODY_STYLES },
  { key: 'drivetrain', header: 'Drivetrain', type: 'enum_array', allowedValues: DRIVETRAIN_TYPES },
  { key: 'engine_layout', header: 'EngineLayout', type: 'enum', allowedValues: ENGINE_LAYOUTS },
  { key: 'units_produced', header: 'UnitsProduced', type: 'integer' },
  { key: 'wikipedia_url', header: 'WikipediaURL', type: 'text' },
  { key: 'firsts_and_lasts', header: 'FirstsAndLasts', type: 'text' },
  { key: 'driving_character', header: 'DrivingCharacter', type: 'text' },
  { key: 'design_notes', header: 'DesignNotes', type: 'text' },
  { key: 'cultural_notes', header: 'CulturalNotes', type: 'text' },
  { key: 'motorsport_pedigree', header: 'MotorsportPedigree', type: 'text' },
  { key: 'maintenance', header: 'Maintenance', type: 'text' },
  { key: 'value_trajectory', header: 'ValueTrajectory', type: 'enum', allowedValues: VALUE_TRAJECTORIES.map(v => v.value) },
  { key: 'analog_index', header: 'AnalogIndex', type: 'integer' },
  { key: 'homologation_special', header: 'HomologationSpecial', type: 'boolean' },
  { key: 'poster_car', header: 'PosterCar', type: 'boolean' },
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

// A comment line is emitted as a single (properly quoted, if it contains
// commas) CSV cell — csvLine on a one-element array — so it reads as one
// clean line in Excel/Sheets instead of spilling across columns. Recognized
// by parseCsvToRows (lib/csv-parse.ts) via a leading '#' and dropped before
// the importer ever sees it as data.
function commentLine(text: string): string {
  return csvLine([text])
}

function fieldGuideLine(spec: FieldSpec): string | null {
  if (spec.type === 'enum') return `# ${spec.header}: pick exactly one — ${spec.allowedValues!.join(', ')}`
  if (spec.type === 'enum_array') return `# ${spec.header}: pick one or more, separated by semicolons (;) — ${spec.allowedValues!.join(', ')}`
  if (spec.type === 'boolean') return `# ${spec.header}: Yes or No`
  if (spec.type === 'integer') return `# ${spec.header}: a whole number`
  return null // free-text fields need no explanation
}

// Embedded directly in the CSV (as '#' comment rows) rather than a separate
// document, so there's one file to hand off, not two that can drift apart —
// self-contained enough for someone (or another AI) with zero access to
// this codebase to fill the file in correctly.
function enrichmentFieldGuide(): string[] {
  return [
    commentLine('# ── Field guide — lines starting with # are ignored by the importer ──'),
    commentLine('# Make, Model, Generation must exactly match an existing car. Unmatched rows are skipped, never created.'),
    commentLine('# Blank cells mean "leave this field unchanged" — they never erase existing content.'),
    commentLine('# All columns not listed below are free text with no fixed format.'),
    ...ENRICHMENT_FIELDS.map(fieldGuideLine).filter((l): l is string => l !== null),
    commentLine('# ── End of field guide — real rows start below ──'),
  ]
}

function trimsFieldGuide(): string[] {
  return [
    commentLine('# ── Field guide — lines starting with # are ignored by the importer ──'),
    commentLine('# Make, Model, Generation must exactly match an existing car. Unmatched rows are skipped, never created.'),
    commentLine('# Name is required and is part of the match key — one row per trim, e.g. "Hemi R/T" or "Daytona".'),
    commentLine('# Years, Description, ProductionNotes are free text. Blank on an existing trim means "leave unchanged".'),
    commentLine('# ── End of field guide — real rows start below ──'),
  ]
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
  if (spec.type === 'integer') return '1'
  return ''
}

// Generated from the same field list the importer validates against, so
// the template can never drift out of sync with what's actually accepted.
export function buildEnrichmentTemplateCsv(): string {
  const headers = [...KEY_COLUMNS, ...ENRICHMENT_FIELDS.map(f => f.header)]
  const example = ['ExampleMake', 'ExampleModel', '1st Gen', ...ENRICHMENT_FIELDS.map(exampleValueFor)]
  return [csvLine(headers), ...enrichmentFieldGuide(), csvLine(example)].join('\n') + '\n'
}

export function buildTrimsTemplateCsv(): string {
  const headers = [...KEY_COLUMNS, ...TRIM_FIELDS.map(f => f.header)]
  const example = ['ExampleMake', 'ExampleModel', '1st Gen', 'Example Trim Name', '1969', '', '']
  return [csvLine(headers), ...trimsFieldGuide(), csvLine(example)].join('\n') + '\n'
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
  return [csvLine(headers), ...enrichmentFieldGuide(), ...rows].join('\n') + '\n'
}
