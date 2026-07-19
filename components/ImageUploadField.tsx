'use client'

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
  // Hero and Gallery both use this same button now — clearing a slot is
  // purely an in-memory edit, same as any other field on this form. It
  // never touches Supabase storage directly: the actual file is only ever
  // deleted after Save succeeds, via the session-wide diff in
  // AdminModelForm's save(). That's what makes Remove safe to click and
  // reconsider — nothing is destroyed until the DB write it's cleaning up
  // after is confirmed.
  showRemoveButton?: boolean
}) {
  function handleRemove() {
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
