'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { checkIsAdmin } from '@/lib/is-admin'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Lets a signed-in admin jump straight into editing this car from the
// public page, skipping the admin list navigation. Same onAuthStateChange
// discipline as SaveButton/SiteHeader — never assumes admin status until a
// signed-in session is actually confirmed; renders nothing until then.
export default function EditButton({ slug }: { slug: string }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) { setIsAdmin(false); return }
        checkIsAdmin(supabase).then(setIsAdmin)
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isAdmin) return null

  return (
    <Link
      href={`/admin/models/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Edit this car (opens in a new tab)"
      title="Edit this car (opens in a new tab)"
      className="btn-secondary w-10 h-10 flex items-center justify-center px-0 flex-shrink-0"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </Link>
  )
}
