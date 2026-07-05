// ─── Shared primitives ────────────────────────────────────────────────────────

export type CarClass =
  | 'Exotic'
  | 'Grand Tourer'
  | 'Icons'
  | 'Luxury'
  | 'Muscle'
  | 'Off-Road'
  | 'Sports'

export type Country =
  | 'Germany' | 'UK' | 'Japan' | 'USA' | 'Italy'
  | 'France' | 'Sweden' | 'Australia' | 'Other'

export interface CarSpec {
  label: string
  value: string
}

export interface CarSpecGroup {
  group: string
  specs: CarSpec[]
}

export interface Resource {
  title: string
  url: string
  type: 'club' | 'registry' | 'archive' | 'manual' | 'forum' | 'other'
}

// ─── Models (admin encyclopedia) ─────────────────────────────────────────────

export interface Model {
  id: string
  slug: string
  make: string
  model: string
  generation: string | null
  year_start: number
  year_end: number | null
  class: CarClass
  country: Country
  body_styles: string[]
  drivetrain: string | null
  engine_layout: string | null
  units_produced: number | null
  overview: string | null
  hero_image: string | null
  gallery_images: string[]
  specs: CarSpecGroup[]
  market_data: {
    low: number | null
    mid: number | null
    high: number | null
    currency: string
    as_of: string | null
    notes: string | null
  } | null
  maintenance: string | null
  resources: Resource[]
  created_at: string
  updated_at: string
}

export type ModelSummary = Pick<
  Model,
  'id' | 'slug' | 'make' | 'model' | 'generation' |
  'year_start' | 'year_end' | 'class' | 'country' |
  'hero_image' | 'units_produced'
>

// ─── Cars (public encyclopedia — new makes/models/generations schema) ───────
// Distinct from Model/ModelSummary above, which the not-yet-migrated admin
// form still uses against the frozen models_legacy table. These two type
// families will collapse into one once the admin form is rebuilt onto the
// new schema.

export interface CarSummary {
  id: string
  slug: string
  make: string
  model: string
  generation: string
  year_start: number
  year_end: number | null
  class: string
  country: string
  hero_image: string | null
  units_produced: number | null
}

export interface Car extends CarSummary {
  body_styles: string[]
  drivetrain: string | null
  engine_layout: string | null
  overview: string | null
  gallery_images: string[]
  specs: CarSpecGroup[]
  market_data: {
    low: number | null
    mid: number | null
    high: number | null
    currency: string
    as_of: string | null
    notes: string | null
  } | null
  maintenance: string | null
  resources: Resource[]
  is_icon: boolean
  nickname: string | null
  desirability_tier: string | null
  why_collectible: string | null
  engine_signature: string | null
  variants_to_know: string | null
  known_issues: string | null
  claim_to_fame: string | null
  buyers_flag: string | null
  rivals_alternatives: string | null
  designer: string | null
  wikipedia_url: string | null
  radar_scores: Partial<Record<
    'desirability' | 'rarity' | 'driving_thrill' | 'investment_trajectory' |
    'usability' | 'restoration_difficulty' | 'cultural_impact', number
  >> | null
  analog_index: number | null
  homologation_special: boolean
  poster_car: boolean
  value_trajectory: 'appreciating' | 'stable' | 'cooling' | null
  firsts_and_lasts: string | null
  driving_character: string | null
  design_notes: string | null
  cultural_notes: string | null
  related_cars: string | null
  motorsport_pedigree: string | null
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  created_at: string
  updated_at: string
}

// ─── User Cars ────────────────────────────────────────────────────────────────

export interface UserCar {
  id: string
  slug: string
  owner_id: string
  model_id: string
  year: number
  trim_variant: string | null
  color: string | null
  hero_image: string | null
  gallery_images: string[]
  story: string | null
  modifications: string | null
  mileage: number | null
  owned_since: number | null
  is_published: boolean
  created_at: string
  updated_at: string
  // Joined
  model?: ModelSummary
  owner?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export type UserCarSummary = Pick<
  UserCar,
  'id' | 'slug' | 'owner_id' | 'model_id' | 'year' |
  'trim_variant' | 'color' | 'hero_image' | 'is_published' | 'created_at'
> & {
  model?: ModelSummary
  owner?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export interface Like {
  id: string
  user_id: string
  user_car_id: string
  created_at: string
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  user_car_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}
