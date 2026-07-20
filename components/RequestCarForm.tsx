'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase-browser'
import SignInDialog from '@/components/SignInDialog'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

type Status = 'idle' | 'sending' | 'sent' | 'error'

// initialMessage pre-fills the field — e.g. a "We haven't profiled this car
// yet" card links here with the car's own free-text title already in hand,
// so the visitor isn't retyping what they just read. Carried through the
// sign-in round trip for free, since SignInDialog already preserves the
// full pathname+search as its OAuth `next` param.
export default function RequestCarForm({ initialMessage }: { initialMessage?: string }) {
  // undefined = auth state not yet resolved — avoids a signed-out flash on load
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [signInDismissed, setSignInDismissed] = useState(false)
  const [message, setMessage] = useState(initialMessage ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, s: Session | null) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(s)
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setStatus('sending')
    setError(null)

    try {
      const res = await fetch('/api/request-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-body text-text-secondary leading-relaxed">
        Thanks — we’ll take a look.
      </p>
    )
  }

  if (session === undefined) return null

  if (!session) {
    // Signed-out visitors see the sign-in dialog immediately, not a button
    // they have to click first — showSignIn is derived from state, not
    // synced via an effect. If they close it without signing in, this
    // fallback prompt still has a button to reopen it.
    const showSignIn = !signInDismissed
    return (
      <div>
        <p className="text-body text-text-secondary leading-relaxed mb-5">
          Sign in to request a car.
        </p>
        <button type="button" onClick={() => setSignInDismissed(false)} className="btn-primary h-10 px-5">
          Sign in to continue
        </button>
        {showSignIn && <SignInDialog onClose={() => setSignInDismissed(true)} />}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-125">
      <div className="field">
        <label htmlFor="request-message" className="field-label">Which car?</label>
        <textarea
          id="request-message"
          className="textarea"
          rows={6}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. make, model, generation, and why it belongs here"
          required
        />
      </div>

      {status === 'error' && <p className="text-body text-error">{error}</p>}

      <button type="submit" disabled={status === 'sending'} className="btn-primary h-10 px-5 self-start">
        {status === 'sending' ? 'Sending…' : 'Send request'}
      </button>
    </form>
  )
}
