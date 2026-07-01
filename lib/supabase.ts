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
  Profile,
  UserCar, UserCarSummary,
  Like, Comment,
} from './types'

// ─── Models ───────────────────────────────────────────────────────────────────

export async function getModels(params?: {
  class?: string
  country?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ data: ModelSummary[]; total: number }> {
  const db = buildClient()
  const limit  = params?.limit  ?? 24
  const offset = params?.offset ?? 0

  let query = db
    .from('models')
    .select('id, slug, make, model, generation, year_start, year_end, class, country, hero_image, units_produced', { count: 'exact' })
    .order('make', { ascending: true })
    .range(offset, offset + limit - 1)

  if (params?.class)   query = query.eq('class', params.class)
  if (params?.country) query = query.eq('country', params.country)
  if (params?.search)  query = query.or(
    `make.ilike.%${params.search}%,model.ilike.%${params.search}%,generation.ilike.%${params.search}%`
  )

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function getModel(slug: string): Promise<Model | null> {
  const db = await createClient()
  const { data, error } = await db
    .from('models')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
}

export async function getModelSlugs(): Promise<string[]> {
  const db = buildClient()
  const { data } = await db.from('models').select('slug')
  return (data ?? []).map((r) => r.slug)
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
