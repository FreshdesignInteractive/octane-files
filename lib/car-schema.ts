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

export const BODY_STYLES = [
  'Sedan', 'Coupe', 'Convertible', 'Wagon', 'Hatchback', 'Liftback',
  'Roadster', 'Spider', 'Targa', 'Pickup', 'SUV', 'Coupe Utility', 'Fastback',
] as const
export type BodyStyle = (typeof BODY_STYLES)[number]

export const DRIVETRAIN_TYPES = ['RWD', 'FWD', 'AWD', '4WD'] as const
export type DrivetrainType = (typeof DRIVETRAIN_TYPES)[number]

export const RESOURCE_TYPES = ['club', 'registry', 'archive', 'manual', 'forum', 'other'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

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
  // Free text by design, not enums — see the desirability_tier/engine_layout
  // decision in the car-schema review. desirability_tier's compound live
  // values ("Solid, High (ZR-1)") are a flagged future cleanup, not a bug.
  desirability_tier: string | null
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
  engine_layout: string | null
  units_produced: number | null
  hero_image: string | null
  gallery_images: string[]
  wikipedia_url: string | null
  specs: SpecGroup[]
  market_data: MarketData | null
  maintenance: string | null
  resources: ResourceLink[]
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
  'id' | 'model_id' | 'created_at' | 'updated_at' | 'archived_at'
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
    slug: '',
  }
}
