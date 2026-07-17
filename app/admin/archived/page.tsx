import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase-server'
import SiteHeader from '@/components/SiteHeader'
import AdminArchivedTable from '@/components/AdminArchivedTable'
import type { AdminRow } from '@/components/AdminModelsTable'

export default async function AdminArchivedPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: generations } = await supabase
    .from('generations')
    .select('slug, code, year_start, year_end, class, archived_at, hero_image, introduction, specs, market_data, models(name, makes(name))')
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

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
      introduction: g.introduction,
      specs: (g.specs as unknown[]) ?? [],
      market_data: g.market_data,
      make: models?.makes?.name ?? '—',
      model: models?.name ?? '—',
      saves: 0,
    }
  })

  return (
    <>
      <SiteHeader />
      <div className="max-w-275 mx-auto py-10 px-6 font-[system-ui,sans-serif]">
        <AdminArchivedTable rows={rows} />
      </div>
    </>
  )
}
