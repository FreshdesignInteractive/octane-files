'use client'

import { deleteCarImageIfOwned } from '@/lib/storage-cleanup'

// View/remove/manual-link only — no file upload here. The "Attach images"
// Quick Import flow (AdminModelForm.tsx) is the one true upload path now:
// it runs every image through the 900x506 WebP resize before it ever
// reaches Storage. This component used to have its own separate raw
// upload button that skipped that pipeline entirely (same file, same
// format, no resize) — a silent footgun where two buttons on the same
// page produced different quality output with no visible difference
// until you inspected the stored file. Removed rather than fixed, since
// there's no reason for two upload paths to exist. The URL-paste field
// stays: pointing at an externally-hosted image is a genuinely different
// case (no file to optimize, nothing to upload).
export default function ImageUploadField({
  value, onChange, showRemoveButton = true,
}: {
  value: string | null
  onChange: (url: string | null) => void
  // Hero is a single slot — clearing it is meaningful (the public page
  // falls back to a placeholder) and needs its own button. Gallery items
  // don't need this: the per-row "Remove" button in GenerationFieldsEditor
  // already drops that array entry entirely, and there's no other reason
  // to null out a gallery slot in place (nothing refills it manually
  // anymore — a replacement photo comes from the next Attach images run).
  showRemoveButton?: boolean
}) {
  function handleRemove() {
    deleteCarImageIfOwned(value)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-start">
        {value && (
          <img src={value} alt="preview" className="w-20 h-20 object-cover rounded-md border border-border flex-shrink-0" />
        )}
        <div className="flex-1 flex flex-col gap-2">
          {value && showRemoveButton && (
            <button
              type="button"
              onClick={handleRemove}
              className="btn-secondary h-9 px-4 self-start"
            >
              Remove image
            </button>
          )}
          <input
            className="input text-xs"
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            placeholder="Set via Attach images above, or paste an external image URL"
          />
        </div>
      </div>
    </div>
  )
}
