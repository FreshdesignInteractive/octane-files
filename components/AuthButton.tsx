'use client'

import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'

export default function AuthButton({ profile }: { profile: Profile | null }) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!profile) {
    return (
      <a href="/login" style={{
        fontSize: 13, fontWeight: 500,
        color: '#111111',
        border: '1px solid #d0d0d0',
        borderRadius: 6,
        padding: '5px 14px',
        textDecoration: 'none',
        transition: 'border-color 150ms',
        whiteSpace: 'nowrap',
      }}>
        Sign In
      </a>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <a href={`/garage/${profile.username}`} style={{
        fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
      }}
        className="hover:text-black transition-colors"
      >
        My Garage
      </a>
      <button
        onClick={signOut}
        style={{
          fontSize: 13, fontWeight: 400,
          color: 'var(--text-tertiary)',
          background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}
        className="hover:text-black transition-colors"
      >
        Sign Out
      </button>
      {profile.avatar_url && (
        <img
          src={profile.avatar_url}
          alt={profile.display_name ?? profile.username}
          width={28} height={28}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      )}
    </div>
  )
}
