'use client'

import { useRef } from 'react'

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
//
// The thumbnail/button/input row keeps its exact shape whether a slot is
// filled or empty — an empty slot shows /placeholder.png (same "no image"
// asset the public page's gallery falls back to) instead of the thumbnail
// disappearing, and the button becomes "Add image" (focuses the URL input
// below it) instead of "Remove image". Removing an image never touches
// Supabase directly either way — it's a pure in-memory edit, same as any
// other field on this form. The actual file is only ever deleted after
// Save succeeds, via the session-wide diff in AdminModelForm's save().
export default function ImageUploadField({
  value, onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-start">
        {value ? (
          <img src={value} alt="preview" className="w-20 h-20 object-cover rounded-md border border-border flex-shrink-0" />
        ) : (
          <img src="/placeholder.png" alt="" className="w-20 h-20 object-contain opacity-40 rounded-md border border-border bg-bg-elevated flex-shrink-0" />
        )}
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => value ? onChange(null) : inputRef.current?.focus()}
            className="btn-secondary h-9 px-4 self-start"
          >
            {value ? 'Remove image' : 'Add image'}
          </button>
          <input
            ref={inputRef}
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
