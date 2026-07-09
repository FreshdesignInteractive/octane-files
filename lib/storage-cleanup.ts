'use client'

import { createClient } from './supabase-browser'

const BUCKET = 'car-images'

// Deletes a file from the car-images bucket only if the URL actually points
// into it — never touches a manually-pasted external URL. Best-effort: a
// failure here is swallowed (logged, not thrown) so a stale orphaned file
// never blocks the user's actual replace/remove action from completing.
export async function deleteCarImageIfOwned(url: string | null | undefined) {
  if (!url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return

  const path = decodeURIComponent(url.slice(idx + marker.length))
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('Failed to delete orphaned car image from storage:', path, error.message)
}
