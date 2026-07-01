'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Profile } from '@/lib/types'

export default function SiteHeader() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(data ?? null)
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: '#ffffff' }}
      className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span style={{
            width: 28, height: 28,
            background: '#111111',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#ffffff',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>O</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111111', letterSpacing: '-0.01em' }}>
            Octane Files
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
            className="hover:text-black transition-colors">
            Browse
          </Link>

          {/* undefined = still loading, show nothing to avoid flash */}
          {profile === undefined ? null : profile === null ? (
            <a href="/login" style={{
              fontSize: 13, fontWeight: 500, color: '#111111',
              border: '1px solid #d0d0d0', borderRadius: 6,
              padding: '5px 14px', textDecoration: 'none',
            }}>
              Sign In
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href={`/garage/${profile.username}`} style={{
                fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
              }} className="hover:text-black transition-colors">
                My Garage
              </a>
              <button onClick={signOut} style={{
                fontSize: 13, color: 'var(--text-tertiary)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }} className="hover:text-black transition-colors">
                Sign Out
              </button>
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
                  width={28} height={28}
                  style={{ borderRadius: '50%', objectFit: 'cover' }} />
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
