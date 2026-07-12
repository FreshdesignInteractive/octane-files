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
          <h2 className="text-body font-bold text-text-primary uppercase tracking-widest mb-1 pb-2 border-b border-border">Enrichment Fields</h2>
          <p className="text-label text-text-tertiary mt-2 mb-1">
            Updates a car&apos;s own content — nickname, overview, why it&apos;s collectible, specs-adjacent fields, class, icon status, and the rest of the edit form&apos;s text fields. <strong className="text-text-secondary">One row per car.</strong>
          </p>
          <p className="text-label text-text-tertiary mb-5">
            Matched by Make + Model + Generation code, against cars that already exist — this never creates a new car. Blank cells leave that field unchanged; they never erase existing content.
          </p>
          <BulkImportEnrichment />
        </section>

        <section>
          <h2 className="text-body font-bold text-text-primary uppercase tracking-widest mb-1 pb-2 border-b border-border">Trims</h2>
          <p className="text-label text-text-tertiary mt-2 mb-1">
            Adds or updates named trim variants under a car (Hemi R/T, Daytona, T/A, etc.) — the same records that power the Trim Levels list on the public page and the Trims section of the edit form. <strong className="text-text-secondary">One row per trim</strong>, so a car with 3 trims is 3 rows.
          </p>
          <p className="text-label text-text-tertiary mb-5">
            Matched by (car, trim name) — an existing trim with that exact name gets its Years/Description/Production Notes updated; a new name gets added as a new trim.
          </p>
          <BulkImportTrims />
        </section>
      </div>
    </>
  )
}
