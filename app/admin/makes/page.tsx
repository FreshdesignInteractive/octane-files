import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase-server'
import SiteHeader from '@/components/SiteHeader'
import AdminMakesTable from '@/components/AdminMakesTable'
import type { MakeRecord } from '@/lib/car-schema'

export default async function AdminMakesPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: makes } = await supabase
    .from('makes')
    .select('id, name, slug, country, full_name, intro_text')
    .order('name')

  return (
    <>
      <SiteHeader />
      <div className="max-w-215 mx-auto pt-10 px-6 pb-20 font-[system-ui,sans-serif]">
        <div className="mb-8">
          <a href="/admin" className="text-xs text-text-tertiary no-underline">&larr; All models</a>
          <h1 className="mt-2 text-2xl font-bold text-text-primary">Makes</h1>
          <p className="mt-1 text-xs text-text-tertiary">
            Full Company Name feeds the Manufacturer sidebar row on car pages; the intro feeds each make&apos;s /marques/[slug] page.
          </p>
        </div>
        <AdminMakesTable makes={(makes as MakeRecord[]) ?? []} />
      </div>
    </>
  )
}
