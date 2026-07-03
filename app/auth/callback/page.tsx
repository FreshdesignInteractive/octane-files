'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      router.replace('/')
      return
    }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(() => {
      router.replace('/')
    })
  }, [params, router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center text-body text-text-secondary">
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
