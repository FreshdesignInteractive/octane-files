import type { MetadataRoute } from 'next'
import { getSitemapCars, getSitemapMakes } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600

// Static, non-parameterized public pages only — never a /browse?class=...
// or ?make=... search URL (those are filter states, not distinct pages),
// never /admin/* (also disallowed in robots.ts). /login has no page.tsx
// (dead route, kept only as an empty dir) and is deliberately excluded.
// '' is the portal homepage; '/browse' is the car listing (moved off '/'
// once the homepage became a placeholder portal page).
const STATIC_PATHS = ['', '/browse', '/about', '/contact', '/garage', '/terms', '/privacy', '/request-car', '/report']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cars, makes] = await Promise.all([getSitemapCars(), getSitemapMakes()])

  return [
    ...STATIC_PATHS.map(path => ({ url: `${SITE_URL}${path}`, lastModified: new Date() })),
    ...cars.map(c => ({ url: `${SITE_URL}/cars/${c.slug}`, lastModified: new Date(c.updated_at) })),
    ...makes.map(m => ({ url: `${SITE_URL}/marques/${m.slug}`, lastModified: new Date(m.updated_at) })),
  ]
}
