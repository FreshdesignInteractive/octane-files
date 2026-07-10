import { requireAdmin } from '@/lib/admin-auth'
import SiteHeader from '@/components/SiteHeader'
import BulkImageUpload from '@/components/BulkImageUpload'

export default async function BulkImageUploadPage() {
  await requireAdmin()

  return (
    <>
      <SiteHeader />
      <div className="max-w-215 mx-auto pt-10 px-6 pb-20 font-[system-ui,sans-serif]">
        <a href="/admin" className="text-xs text-text-tertiary no-underline">← All models</a>
        <h1 className="mt-2 mb-2 text-2xl font-bold text-text-primary">Bulk Image Upload</h1>
        <p className="text-label text-text-tertiary mb-8">
          Matched by folder name against a car&apos;s slug — this never creates
          a new car. Every image is resized and re-encoded to 900×506 WebP.
          Attaching a car replaces its existing hero image and/or gallery
          (whichever slots are present in that folder) — a folder is treated
          as the car&apos;s complete image set, not a partial patch.
        </p>
        <BulkImageUpload />
      </div>
    </>
  )
}
