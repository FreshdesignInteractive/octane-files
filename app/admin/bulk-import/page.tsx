import { requireAdmin } from '@/lib/admin-auth'
import SiteHeader from '@/components/SiteHeader'
import BulkImportEnrichment from '@/components/BulkImportEnrichment'
import BulkImportTrims from '@/components/BulkImportTrims'

export default async function BulkImportPage() {
  await requireAdmin()

  return (
    <>
      <SiteHeader />
      <div className="max-w-215 mx-auto pt-10 px-6 pb-20 font-[system-ui,sans-serif]">
        <a href="/admin" className="text-xs text-text-tertiary no-underline">← All models</a>
        <h1 className="mt-2 mb-8 text-2xl font-bold text-text-primary">Bulk Import</h1>

        <section className="mb-12">
          <h2 className="text-body font-bold text-text-primary uppercase tracking-[0.06em] mb-1 pb-2 border-b border-border">Enrichment Fields</h2>
          <p className="text-label text-text-tertiary mt-2 mb-5">
            Matched by Make + Model + Generation code. Blank cells leave that field unchanged — never erased.
          </p>
          <BulkImportEnrichment />
        </section>

        <section>
          <h2 className="text-body font-bold text-text-primary uppercase tracking-[0.06em] mb-1 pb-2 border-b border-border">Trims</h2>
          <p className="text-label text-text-tertiary mt-2 mb-5">
            One row per trim. Matched by (car, trim name) — existing trims are updated, new ones are added.
          </p>
          <BulkImportTrims />
        </section>
      </div>
    </>
  )
}
