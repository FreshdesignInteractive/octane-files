'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function SignInDialog({ onClose }: { onClose: () => void }) {
  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Wherever this is actually running (localhost, a Vercel preview,
        // or eventually the live custom domain) — not hardcoded, since the
        // custom domain isn't live yet and this must work on whatever URL
        // is currently being tested. Supabase validates this against its
        // own Redirect URLs allow-list (Dashboard -> Authentication -> URL
        // Configuration), so any origin used here must be added there too.
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-overlay bg-overlay flex items-center justify-center p-6"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl pt-9 px-8 pb-8 w-full max-w-[400px] relative shadow-modal"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-text-tertiary flex items-center justify-center p-1 rounded-md"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <h2 className="text-xl font-bold text-text-primary mb-2">
          Sign in to Octane Files
        </h2>
        <p className="text-body text-text-secondary leading-relaxed mb-7">
          Sign in to post your cars, like builds, and join the community.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2.5 h-12 bg-white border border-border-mid rounded-full text-sm font-medium text-text-primary cursor-pointer transition-colors hover:bg-bg-elevated"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-label text-text-tertiary mt-5 text-center leading-relaxed">
          By signing in you agree to our{' '}
          <Link href="/terms" onClick={onClose} className="text-text-secondary underline">terms</Link>
          {' '}and{' '}
          <Link href="/privacy" onClick={onClose} className="text-text-secondary underline">privacy policy</Link>.
        </p>
      </div>
    </div>
  )
}
