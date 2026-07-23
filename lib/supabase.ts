// Server-side query functions — import in Server Components and Route Handlers
// For client-side auth actions, use supabase-browser.ts directly

import { createClient } from './supabase-server'
import { createClient as createPlainClient } from '@supabase/supabase-js'

function buildClient() {
  return createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
import type {
  Model, ModelSummary,
  Car, CarSummary, CarRelation, CarTrim,
  Profile,
  UserCar, UserCarSummary,
  Like, Comment,
} from './types'
import { CAR_CLASSES, DEFAULT_SORT } from './car-schema'

// ─── Cars (public encyclopedia — makes/models/generations) ──────────────────
// "Car" here means a generations row. Archived rows (the 130-car delta
// dropped in bluechip curation) are always excluded — archived_at IS NULL
// is non-negotiable on every public query below.

const CLASS_ENUM_TO_LABEL: Record<string, string> = Object.fromEntries(
  CAR_CLASSES.map(c => [c.value, c.label])
)

// analog_index remains removed on purpose — it's being renamed to
// analog_index_legacy in imports/step23_analog_index_rename.sql, and that
// rename isn't safe to run until this file (with analog_index already
// gone from here) is confirmed live. See step23's own header comment.
const CAR_SELECT = `
  id, slug, code, year_start, year_end, class, hero_image, units_produced,
  units_produced_estimated,
  body_styles, drivetrain, engine_layout, introduction, gallery_images, specs,
  market_data, maintenance, resources, is_icon, nickname, desirability_tier,
  why_collectible, engine_signature, transmission, variants_to_know, known_issues,
  claim_to_fame, buyers_flag, designer, wikipedia_url,
  radar_scores, electronic_dependence, electronic_dependence_notes,
  homologation_special, poster_car, value_trajectory,
  callout, driving_character, design_notes, cultural_notes,
  motorsport_pedigree,
  models!inner(name, makes!inner(name, country, full_name, slug))
`

type GenerationJoinRow = {
  id: string
  slug: string
  code: string
  year_start: number
  year_end: number | null
  class: string
  hero_image: string | null
  units_produced: number | null
  // full_name/slug are only requested by CAR_SELECT (the single-car detail
  // page's Marque row) — optional here since this same type is reused
  // for the relations sub-query in getModel(), whose own select string
  // doesn't ask for them.
  models: { name: string; makes: { name: string; country: string; full_name?: string | null; slug?: string } }
}

function mapCarSummary(row: GenerationJoinRow): CarSummary {
  return {
    id: row.id,
    slug: row.slug,
    make: row.models.makes.name,
    model: row.models.name,
    generation: row.code,
    year_start: row.year_start,
    year_end: row.year_end,
    class: CLASS_ENUM_TO_LABEL[row.class] ?? row.class,
    country: row.models.makes.country,
    hero_image: row.hero_image,
    units_produced: row.units_produced,
  }
}

// trims/relations aren't part of CAR_SELECT (separate child-table queries in
// getModel), so this maps everything else and getModel attaches those two.
function mapCar(row: GenerationJoinRow & Record<string, unknown>): Omit<Car, 'trims' | 'relations'> {
  return {
    ...mapCarSummary(row),
    make_full_name: row.models.makes.full_name ?? null,
    make_slug: row.models.makes.slug ?? '',
    units_produced_estimated: (row.units_produced_estimated as boolean) ?? false,
    transmission: (row.transmission as string | null) ?? null,
    body_styles: (row.body_styles as string[]) ?? [],
    drivetrain: Array.isArray(row.drivetrain) && row.drivetrain.length > 0
      ? (row.drivetrain as string[]).join(' / ')
      : null,
    engine_layout: (row.engine_layout as string | null) ?? null,
    introduction: (row.introduction as string | null) ?? null,
    gallery_images: (row.gallery_images as string[]) ?? [],
    specs: (row.specs as Car['specs']) ?? [],
    market_data: (row.market_data as Car['market_data']) ?? null,
    maintenance: (row.maintenance as string | null) ?? null,
    resources: (row.resources as Car['resources']) ?? [],
    is_icon: (row.is_icon as boolean) ?? false,
    nickname: (row.nickname as string | null) ?? null,
    desirability_tier: (row.desirability_tier as string | null) ?? null,
    why_collectible: (row.why_collectible as string | null) ?? null,
    engine_signature: (row.engine_signature as string | null) ?? null,
    variants_to_know: (row.variants_to_know as string | null) ?? null,
    known_issues: (row.known_issues as string | null) ?? null,
    claim_to_fame: (row.claim_to_fame as string | null) ?? null,
    buyers_flag: (row.buyers_flag as string | null) ?? null,
    designer: (row.designer as string | null) ?? null,
    wikipedia_url: (row.wikipedia_url as string | null) ?? null,
    radar_scores: (row.radar_scores as Car['radar_scores']) ?? null,
    electronic_dependence: (row.electronic_dependence as number | null) ?? null,
    electronic_dependence_notes: (row.electronic_dependence_notes as string | null) ?? null,
    homologation_special: (row.homologation_special as boolean) ?? false,
    poster_car: (row.poster_car as boolean) ?? false,
    value_trajectory: (row.value_trajectory as Car['value_trajectory']) ?? null,
    callout: (row.callout as string | null) ?? null,
    driving_character: (row.driving_character as string | null) ?? null,
    design_notes: (row.design_notes as string | null) ?? null,
    cultural_notes: (row.cultural_notes as string | null) ?? null,
    motorsport_pedigree: (row.motorsport_pedigree as string | null) ?? null,
  }
}

type SearchRow = {
  id: string
  slug: string
  code: string
  year_start: number
  year_end: number | null
  class: string
  hero_image: string | null
  units_produced: number | null
  make_name: string
  model_name: string
  country: string
  total_count: number
}

function mapSearchRow(row: SearchRow): CarSummary {
  return {
    id: row.id,
    slug: row.slug,
    make: row.make_name,
    model: row.model_name,
    generation: row.code,
    year_start: row.year_start,
    year_end: row.year_end,
    class: CLASS_ENUM_TO_LABEL[row.class] ?? row.class,
    country: row.country,
    hero_image: row.hero_image,
    units_produced: row.units_produced,
  }
}

// class is the raw enum value (e.g. "grand_tourer"), not the display label —
// FilterBar sources its options directly from car-schema.ts's CAR_CLASSES.
export async function getModels(params?: {
  class?: string
  country?: string
  make?: string
  era?: string
  sort?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ data: CarSummary[]; total: number }> {
  const db = buildClient()
  const limit  = params?.limit  ?? 24
  const offset = params?.offset ?? 0

  const { data, error } = await db.rpc('search_generations', {
    search_query: params?.search || null,
    filter_class: params?.class || null,
    filter_country: params?.country || null,
    filter_make: params?.make || null,
    filter_era: params?.era || null,
    sort_by: params?.sort || DEFAULT_SORT,
    result_limit: limit,
    result_offset: offset,
  })
  if (error) throw error

  const rows = (data ?? []) as SearchRow[]
  return { data: rows.map(mapSearchRow), total: rows[0]?.total_count ?? 0 }
}

type TrimRow = { name: string; years: string | null; description: string | null }

type RelationRow = {
  id: string
  relation_type: 'related' | 'rival'
  label_text: string | null
  linked: GenerationJoinRow | null
}

export async function getModel(slug: string): Promise<Car | null> {
  const db = await createClient()
  const { data, error } = await db
    .from('generations')
    .select(CAR_SELECT)
    .eq('slug', slug)
    .is('archived_at', null)
    .single()
  if (error) return null

  const car = data as unknown as GenerationJoinRow & Record<string, unknown>

  const [{ data: trimRows }, { data: relationRows }] = await Promise.all([
    db.from('trims').select('name, years, description').eq('generation_id', car.id).order('name'),
    db
      .from('car_relations')
      .select(`
        id, relation_type, label_text,
        linked:generations!car_relations_linked_generation_id_fkey(
          id, slug, code, year_start, year_end, class, hero_image, units_produced,
          models(name, makes(name, country))
        )
      `)
      .eq('generation_id', car.id)
      .order('relation_type')
      .order('sort_order'),
  ])

  const trims: CarTrim[] = (trimRows as TrimRow[] | null ?? []).map(t => ({
    name: t.name, years: t.years, description: t.description,
  }))

  const relations: CarRelation[] = (relationRows as unknown as RelationRow[] | null ?? []).map(r => ({
    id: r.id,
    relation_type: r.relation_type,
    label_text: r.label_text,
    linked: r.linked ? mapCarSummary(r.linked) : null,
  }))

  return { ...mapCar(car), trims, relations }
}

export async function getModelSlugs(): Promise<string[]> {
  const db = buildClient()
  const { data } = await db.from('generations').select('slug').is('archived_at', null)
  return (data ?? []).map((r) => r.slug)
}

// For sitemap.ts — richer than getModelSlugs (which only ever needed the
// slug for generateStaticParams), since a sitemap wants a real lastmod per
// entry. archived_at IS NULL, same live-only filter as everywhere else.
export async function getSitemapCars(): Promise<{ slug: string; updated_at: string }[]> {
  const db = buildClient()
  const { data } = await db.from('generations').select('slug, updated_at').is('archived_at', null)
  return (data as { slug: string; updated_at: string }[] | null) ?? []
}

// Every make gets a page — no live/archived distinction on makes.
export async function getSitemapMakes(): Promise<{ slug: string; updated_at: string }[]> {
  const db = buildClient()
  const { data } = await db.from('makes').select('slug, updated_at')
  return (data as { slug: string; updated_at: string }[] | null) ?? []
}

// Marques with at least one live car — backs the /marques hub grid.
// get_filterable_makes() is the same RPC FilterBar.tsx's Make dropdown
// uses (see imports/step47_filterable_makes_detailed.sql for why this is
// an RPC rather than a nested embed query); FilterBar only reads `.name`
// off each row, this reads the rest.
export async function getFilterableMakes(): Promise<
  { name: string; full_name: string | null; slug: string; country: string }[]
> {
  const db = buildClient()
  const { data, error } = await db.rpc('get_filterable_makes')
  if (error) throw error
  return data ?? []
}

// Live catalog count for the About page's stats band — never hardcode that
// figure, it drifts every time a car is added or archived.
export async function getLiveCarCount(): Promise<number> {
  const db = buildClient()
  const { count } = await db
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null)
  return count ?? 0
}

export async function createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Promise<Model> {
  const db = await createClient()
  const { data, error } = await db
    .from('models')
    .insert(model)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateModel(id: string, updates: Partial<Omit<Model, 'id' | 'created_at'>>): Promise<Model> {
  const db = await createClient()
  const { data, error } = await db
    .from('models')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(username: string): Promise<Profile | null> {
  const db = await createClient()
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  if (error) return null
  return data
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const db = await createClient()
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'username' | 'display_name' | 'avatar_url' | 'bio' | 'location' | 'website'>>
): Promise<Profile> {
  const db = await createClient()
  const { data, error } = await db
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── User Cars ────────────────────────────────────────────────────────────────

const USER_CAR_SELECT = `
  id, slug, owner_id, model_id, year, trim_variant, color,
  hero_image, gallery_images, story, modifications,
  mileage, owned_since, is_published, created_at, updated_at,
  model:models(id, slug, make, model, generation, year_start, year_end, class, country, hero_image, units_produced),
  owner:profiles(id, username, display_name, avatar_url)
`

export async function getUserCar(slug: string): Promise<UserCar | null> {
  const db = await createClient()
  const { data, error } = await db
    .from('user_cars')
    .select(USER_CAR_SELECT)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error) return null
  return data as unknown as UserCar
}

// All published cars for a given model (shown on the model page)
export async function getUserCarsForModel(modelId: string): Promise<UserCarSummary[]> {
  const db = await createClient()
  const { data, error } = await db
    .from('user_cars')
    .select(`
      id, slug, owner_id, model_id, year, trim_variant, color,
      hero_image, is_published, created_at,
      owner:profiles(id, username, display_name, avatar_url)
    `)
    .eq('model_id', modelId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as UserCarSummary[]
}

// All cars for a user's garage
export async function getGarage(username: string): Promise<UserCarSummary[]> {
  const db = await createClient()
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()
  if (!profile) return []

  const { data, error } = await db
    .from('user_cars')
    .select(`
      id, slug, owner_id, model_id, year, trim_variant, color,
      hero_image, is_published, created_at,
      model:models(id, slug, make, model, generation, year_start, year_end, class, country, hero_image, units_produced)
    `)
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as UserCarSummary[]
}

export async function createUserCar(
  car: Omit<UserCar, 'id' | 'created_at' | 'updated_at' | 'model' | 'owner'>
): Promise<UserCar> {
  const db = await createClient()
  const { data, error } = await db
    .from('user_cars')
    .insert(car)
    .select(USER_CAR_SELECT)
    .single()
  if (error) throw error
  return data as unknown as UserCar
}

export async function updateUserCar(
  id: string,
  updates: Partial<Omit<UserCar, 'id' | 'owner_id' | 'created_at' | 'model' | 'owner'>>
): Promise<UserCar> {
  const db = await createClient()
  const { data, error } = await db
    .from('user_cars')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(USER_CAR_SELECT)
    .single()
  if (error) throw error
  return data as unknown as UserCar
}

export async function deleteUserCar(id: string): Promise<void> {
  const db = await createClient()
  const { error } = await db.from('user_cars').delete().eq('id', id)
  if (error) throw error
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function getLikeCount(userCarId: string): Promise<number> {
  const db = await createClient()
  const { count, error } = await db
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_car_id', userCarId)
  if (error) throw error
  return count ?? 0
}

export async function hasLiked(userCarId: string, userId: string): Promise<boolean> {
  const db = await createClient()
  const { data } = await db
    .from('likes')
    .select('id')
    .eq('user_car_id', userCarId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(userCarId: string): Promise<Comment[]> {
  const db = await createClient()
  const { data, error } = await db
    .from('comments')
    .select(`
      id, user_car_id, author_id, body, created_at, updated_at,
      author:profiles(id, username, display_name, avatar_url)
    `)
    .eq('user_car_id', userCarId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as unknown as Comment[]
}
