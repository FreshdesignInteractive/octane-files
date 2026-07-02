'use client'

import { createClient } from '@/lib/supabase-browser'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const params = useSearchParams()
  const error = params.get('error')

  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://www.octanefiles.com/auth/callback',
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#0a0a0a',
          }}>O</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Octane Files
          </span>
        </div>
      </Link>

      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '36px 32px',
      }}>
        <h1 style={{
          fontSize: 20, fontWeight: 600, color: 'var(--text-primary)',
          letterSpacing: '-0.02em', marginBottom: 8,
        }}>
          Sign in
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Sign in to post your cars, like builds, and join the community.
        </p>

        {error && (
          <div style={{
            fontSize: 12, color: '#e85d5d',
            background: 'rgba(232,93,93,0.08)',
            border: '1px solid rgba(232,93,93,0.2)',
            borderRadius: 6, padding: '10px 14px', marginBottom: 20,
          }}>
            Something went wrong. Please try again.
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            height: 44,
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            fontSize: 14, fontWeight: 500, color: '#1a1a1a',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 24, textAlign: 'center', lineHeight: 1.6 }}>
          By signing in you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  )
}

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
