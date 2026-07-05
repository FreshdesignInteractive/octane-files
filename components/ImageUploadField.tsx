'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_BYTES = 5 * 1024 * 1024

function extensionFor(mimeType: string): string {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[mimeType] ?? 'jpg'
}

// Direct browser -> Supabase Storage upload (car-images bucket), gated by the
// same is_admin() RLS policy as the rest of the schema. Manual-URL entry
// stays available underneath as a fallback for images that are just linked.
export default function ImageUploadField({
  value, onChange, pathPrefix,
}: {
  value: string | null
  onChange: (url: string | null) => void
  pathPrefix: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or AVIF images are allowed.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Max file size is 5MB.')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const path = `${pathPrefix}-${Date.now()}.${extensionFor(file.type)}`
    const { error: uploadError } = await supabase.storage.from('car-images').upload(path, file, { upsert: false })
    setUploading(false)

    if (uploadError) {
      setError(uploadError.message)
      return
    }
    const { data } = supabase.storage.from('car-images').getPublicUrl(path)
    onChange(data.publicUrl)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-start">
        {value && (
          <img src={value} alt="preview" className="w-20 h-20 object-cover rounded-md border border-border flex-shrink-0" />
        )}
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary h-9 px-4 self-start disabled:opacity-60"
          >
            {uploading ? 'Uploading...' : value ? 'Replace image' : 'Upload image'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <input
            className="input text-xs"
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            placeholder="or paste an image URL directly"
          />
          {error && <p className="text-label text-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
