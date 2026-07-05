import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase-server'
import { createClient as buildClient } from '@supabase/supabase-js'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import AdminModelsTable, { type AdminRow } from '@/components/AdminModelsTable'

// Saves aggregate is the one place this page still needs the service-role
// client: saved_models RLS scopes reads to "your own rows," so even the
// signed-in admin's own session can't see other users' saves — only the
// service-role bypass can. Car data itself reads through the admin's own
// session (see lib/supabase-server.ts), same as the write path.
function serviceRole() {
  return buildClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function AdminPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: generations } = await supabase
    .from('generations')
    .select('id, slug, code, year_start, year_end, class, archived_at, hero_image, overview, specs, market_data, models(name, makes(name))')
    .is('archived_at', null)

  const { count: archivedCount } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .not('archived_at', 'is', null)

  const { data: saves } = await serviceRole().from('saved_models').select('model_id')
  const savesByModel = new Map<string, number>()
  for (const row of saves ?? []) {
    savesByModel.set(row.model_id, (savesByModel.get(row.model_id) ?? 0) + 1)
  }

  const rows: AdminRow[] = (generations ?? []).map((g) => {
    const models = g.models as unknown as { name: string; makes: { name: string } } | null
    return {
      slug: g.slug,
      code: g.code,
      year_start: g.year_start,
      year_end: g.year_end,
      class: g.class,
      archived_at: g.archived_at,
      hero_image: g.hero_image,
      overview: g.overview,
      specs: (g.specs as unknown[]) ?? [],
      market_data: g.market_data,
      make: models?.makes?.name ?? '—',
      model: models?.name ?? '—',
      saves: savesByModel.get(g.id) ?? 0,
    }
  })

  return (
    <>
      <SiteHeader />
      <div className="max-w-275 mx-auto py-10 px-6 font-[system-ui,sans-serif]">
        <div className="flex justify-between items-center mb-2">
          <div>
            <Link href="/" className="text-xs text-text-tertiary no-underline">← Back to site</Link>
            <h1 className="mt-2 mb-1 text-2xl font-bold text-text-primary">Admin · Models</h1>
          </div>
        </div>
        <AdminModelsTable rows={rows} archivedCount={archivedCount ?? 0} />
      </div>
    </>
  )
}
