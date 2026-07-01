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
