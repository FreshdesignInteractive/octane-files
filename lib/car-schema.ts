// Single source of truth for the generations schema: enum vocabularies, the
// raw record shape, and the small pure helpers shared between the admin form
// and any future CSV import. Drives the form controls, the DB constraints
// (mirrored here, not derived — keep in sync with step1_migration.sql if the
// enums ever change), and field-by-field mapping for later enrichment phases.

export const CAR_CLASSES = [
  { value: 'sports', label: 'Sports' },
  { value: 'muscle', label: 'Muscle' },
  { value: 'grand_tourer', label: 'Grand Tourer' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'exotic', label: 'Exotic' },
  { value: 'off_road', label: 'Off-Road' },
  { value: 'vintage', label: 'Vintage' },
] as const

export type CarClassValue = (typeof CAR_CLASSES)[number]['value']

// makes.country is free TEXT, not a DB enum, but this is the fixed real-world
// set in use today (confirmed against live data) — single source for both
// the public Country filter and the New Car make-creation form.
export const COUNTRIES = ['Australia', 'France', 'Germany', 'Italy', 'Japan', 'Sweden', 'UK', 'USA', 'Other'] as const
export type Country = (typeof COUNTRIES)[number]

export const BODY_STYLES = [
  'Sedan', 'Coupe', 'Convertible', 'Wagon', 'Hatchback', 'Liftback',
  'Roadster', 'Spider', 'Targa', 'Pickup', 'SUV', 'Coupe Utility', 'Fastback',
] as const
export type BodyStyle = (typeof BODY_STYLES)[number]

export const DRIVETRAIN_TYPES = ['RWD', 'FWD', 'AWD', '4WD'] as const
export type DrivetrainType = (typeof DRIVETRAIN_TYPES)[number]

export const RESOURCE_TYPES = ['club', 'registry', 'archive', 'manual', 'forum', 'other'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const ENGINE_LAYOUTS = ['Front-engine', 'Front-mid-engine', 'Mid-engine', 'Rear-engine'] as const
export type EngineLayout = (typeof ENGINE_LAYOUTS)[number]

export const DESIRABILITY_TIERS = ['Blue-chip', 'High', 'Solid', 'Entry'] as const
export type DesirabilityTier = (typeof DESIRABILITY_TIERS)[number]

export const VALUE_TRAJECTORIES = [
  { value: 'appreciating', label: 'Appreciating' },
  { value: 'stable', label: 'Stable' },
  { value: 'cooling', label: 'Cooling' },
] as const
export type ValueTrajectory = (typeof VALUE_TRAJECTORIES)[number]['value']

export const RADAR_AXES = [
  { key: 'desirability', label: 'Desirability' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'driving_thrill', label: 'Driving Thrill' },
  { key: 'investment_trajectory', label: 'Investment Trajectory' },
  { key: 'usability', label: 'Usability' },
  { key: 'restoration_difficulty', label: 'Restoration Difficulty' },
  { key: 'cultural_impact', label: 'Cultural Impact' },
] as const
export type RadarAxisKey = (typeof RADAR_AXES)[number]['key']
export type RadarScores = Partial<Record<RadarAxisKey, number>>

export interface SpecGroup {
  group: string
  specs: { label: string; value: string }[]
}

export interface MarketData {
  low: number | null
  mid: number | null
  high: number | null
  currency: string
  as_of: string | null
  notes: string | null
}

export interface ResourceLink {
  title: string
  url: string
  type: ResourceType
}

// The full generations row shape, as stored.
export interface GenerationRecord {
  id: string
  model_id: string
  code: string
  production_years: string | null
  year_start: number
  year_end: number | null
  class: CarClassValue
  is_icon: boolean
  desirability_tier: DesirabilityTier | null
  // Step 7 migration: the 26 pre-existing compound strings ("Solid, High
  // (ZR-1)") that couldn't safely auto-collapse to a single headline tier.
  // Read-only reference for the manual remap — never form-editable, and not
  // part of GenerationInput.
  desirability_tier_legacy: string | null
  nickname: string | null
  overview: string | null
  why_collectible: string | null
  engine_signature: string | null
  variants_to_know: string | null
  known_issues: string | null
  claim_to_fame: string | null
  buyers_flag: string | null
  rivals_alternatives: string | null
  designer: string | null
  body_styles: BodyStyle[]
  drivetrain: DrivetrainType[]
  engine_layout: EngineLayout | null
  units_produced: number | null
  hero_image: string | null
  gallery_images: string[]
  wikipedia_url: string | null
  specs: SpecGroup[]
  market_data: MarketData | null
  maintenance: string | null
  resources: ResourceLink[]
  radar_scores: RadarScores | null
  analog_index: number | null
  homologation_special: boolean
  poster_car: boolean
  value_trajectory: ValueTrajectory | null
  firsts_and_lasts: string | null
  driving_character: string | null
  design_notes: string | null
  cultural_notes: string | null
  related_cars: string | null
  motorsport_pedigree: string | null
  slug: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

// What the admin form actually edits — everything except system/identity
// fields that aren't directly form-editable (id, model_id, timestamps,
// archived_at is a dedicated action, not a raw field).
export type GenerationInput = Omit<
  GenerationRecord,
  'id' | 'model_id' | 'created_at' | 'updated_at' | 'archived_at' | 'desirability_tier_legacy'
>

export interface MakeRecord {
  id: string
  name: string
  slug: string
  country: string
}

export interface ModelRecord {
  id: string
  make_id: string
  name: string
  slug: string
}

export function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function deriveGenerationSlug(makeName: string, modelName: string, code: string): string {
  return slugify(`${makeName}-${modelName}-${code}`)
}

export function computeProductionYears(yearStart: number, yearEnd: number | null): string {
  return `${yearStart}–${yearEnd ?? 'Present'}`
}

export function emptyGenerationInput(): GenerationInput {
  return {
    code: '',
    production_years: null,
    year_start: new Date().getFullYear(),
    year_end: null,
    class: 'sports',
    is_icon: false,
    desirability_tier: null,
    nickname: null,
    overview: null,
    why_collectible: null,
    engine_signature: null,
    variants_to_know: null,
    known_issues: null,
    claim_to_fame: null,
    buyers_flag: null,
    rivals_alternatives: null,
    designer: null,
    body_styles: [],
    drivetrain: [],
    engine_layout: null,
    units_produced: null,
    hero_image: null,
    gallery_images: [],
    wikipedia_url: null,
    specs: [],
    market_data: null,
    maintenance: null,
    resources: [],
    radar_scores: null,
    analog_index: null,
    homologation_special: false,
    poster_car: false,
    value_trajectory: null,
    firsts_and_lasts: null,
    driving_character: null,
    design_notes: null,
    cultural_notes: null,
    related_cars: null,
    motorsport_pedigree: null,
    slug: '',
  }
}
