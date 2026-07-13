'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import SignInDialog from '@/components/SignInDialog'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Deliberately never queries saved_models until a signed-in user is
// confirmed via onAuthStateChange — same discipline as SiteHeader's avatar
// state. No signed-out code path ever touches this table (see the
// authenticated-only GRANT on saved_models in supabase-schema.sql).
export default function SaveButton({ modelId }: { modelId: string }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) { setUserId(null); setSaved(false); return }
        const uid = session.user.id
        setUserId(uid)
        supabase.from('saved_models').select('id').eq('user_id', uid).eq('model_id', modelId).maybeSingle()
          .then(({ data }: { data: { id: string } | null }) => {
            if (data) { setSaved(true); return }

            // Resuming a save that got interrupted by the sign-in redirect —
            // toggle() stamped ?save=<modelId> on the URL before opening
            // SignInDialog; same ?param-then-cleanup pattern SiteHeader
            // already uses for ?signin=1.
            if (new URLSearchParams(window.location.search).get('save') === modelId) {
              window.history.replaceState({}, '', window.location.pathname)
              supabase.from('saved_models').insert({ user_id: uid, model_id: modelId })
                .then(({ error }: { error: { message: string } | null }) => { if (!error) setSaved(true) })
            }
          })
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        setSaved(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [modelId])

  async function toggle() {
    if (!userId) {
      // No reload — SignInDialog reads this off window.location when it
      // builds the OAuth redirect, so it rides along through the sign-in
      // round trip without any storage involved.
      const url = new URL(window.location.href)
      url.searchParams.set('save', modelId)
      window.history.replaceState({}, '', url)
      setShowSignIn(true)
      return
    }
    if (pending) return
    setPending(true)

    const supabase = createClient()
    if (saved) {
      const { error } = await supabase.from('saved_models').delete().eq('user_id', userId).eq('model_id', modelId)
      if (!error) setSaved(false)
    } else {
      const { error } = await supabase.from('saved_models').insert({ user_id: userId, model_id: modelId })
      if (!error) setSaved(true)
    }

    setPending(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={saved ? 'icon-link text-accent' : 'icon-link'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {saved ? 'Saved to Garage' : 'Save to Garage'}
      </button>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
    </>
  )
}
