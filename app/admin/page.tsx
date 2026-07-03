import { requireAdmin } from '@/lib/admin-auth'
import { createClient as buildClient } from '@supabase/supabase-js'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'

function plain() {
  return buildClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const dot = (filled: boolean) => (
  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${filled ? 'bg-success' : 'bg-border'}`} />
)

export default async function AdminPage() {
  await requireAdmin()

  const { data: models } = await plain()
    .from('models')
    .select('id, slug, make, model, generation, year_start, year_end, class, country, hero_image, overview, specs, market_data')
    .order('make')
    .order('year_start')

  const total      = models?.length ?? 0
  const hasImage   = models?.filter(m => m.hero_image).length ?? 0
  const hasOverview = models?.filter(m => m.overview).length ?? 0
  const hasSpecs   = models?.filter(m => Array.isArray(m.specs) && m.specs.length > 0).length ?? 0

  return (
    <>
      <SiteHeader />
      <div className="max-w-275 mx-auto py-10 px-6 font-[system-ui,sans-serif]">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/" className="text-xs text-text-tertiary no-underline">← Back to site</Link>
            <h1 className="mt-2 mb-1 text-2xl font-bold text-text-primary">Admin · Models</h1>
            <p className="m-0 text-body text-text-tertiary">{total} cars</p>
          </div>
          <div className="flex gap-5 text-xs text-text-secondary">
            <span>🖼 {hasImage}/{total} images</span>
            <span>📝 {hasOverview}/{total} overviews</span>
            <span>⚙️ {hasSpecs}/{total} specs</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-label text-text-tertiary">
          <span className="flex items-center gap-1">{dot(true)} filled</span>
          <span className="flex items-center gap-1">{dot(false)} empty</span>
          <span className="ml-2">Columns: Image · Overview · Specs · Market</span>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="table">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Car</th>
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Years</th>
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Class</th>
                <th className="py-2.5 px-4 text-left font-semibold text-text-secondary">Country</th>
                <th className="py-2.5 px-4 text-center font-semibold text-text-secondary">Status</th>
                <th className="py-2.5 px-4 text-right font-semibold text-text-secondary"></th>
              </tr>
            </thead>
            <tbody>
              {models?.map((m, i) => (
                <tr key={m.id} className={`bg-white ${i < total - 1 ? 'border-b border-border' : ''}`}>
                  <td className="py-2.5 px-4 text-text-primary font-medium">
                    {m.make} {m.model}
                    {m.generation && m.generation.toLowerCase() !== m.model.toLowerCase() && (
                      <span className="text-text-tertiary font-normal"> · {m.generation}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-text-secondary">
                    {m.year_start}{m.year_end ? `–${m.year_end}` : '–'}
                  </td>
                  <td className="py-2.5 px-4 text-text-secondary">{m.class}</td>
                  <td className="py-2.5 px-4 text-text-secondary">{m.country}</td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex gap-2 justify-center">
                      {dot(!!m.hero_image)}
                      {dot(!!m.overview)}
                      {dot(Array.isArray(m.specs) && m.specs.length > 0)}
                      {dot(!!m.market_data)}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Link href={`/admin/models/${m.slug}`} className="text-xs text-text-primary no-underline border border-border-mid rounded-md py-1 px-2.5">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
