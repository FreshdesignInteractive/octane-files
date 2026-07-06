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
