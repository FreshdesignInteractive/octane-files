'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    const supabaseError = params.get('error')
    const supabaseErrorDesc = params.get('error_description')

    if (!code) {
      const msg = supabaseError
        ? `${supabaseError}: ${supabaseErrorDesc ?? ''}`
        : `no_code | url=${window.location.href}`
      router.replace(`/login?error=${encodeURIComponent(msg)}`)
      return
    }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`)
      } else {
        router.replace('/')
      }
    })
  }, [params, router])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      color: 'var(--text-secondary)',
    }}>
      Signing you in…
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
