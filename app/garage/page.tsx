'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import SignInDialog from '@/components/SignInDialog'
import CarCard from '@/components/CarCard'
import { createClient } from '@/lib/supabase-browser'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { CarSummary } from '@/lib/types'

// Mirrors the class enum->label map in lib/supabase.ts. Duplicated rather than
// imported because lib/supabase.ts is server-only (pulls in next/headers via
// supabase-server.ts) and this is a client component.
const CLASS_ENUM_TO_LABEL: Record<string, string> = {
  sports: 'Sports', muscle: 'Muscle', grand_tourer: 'Grand Tourer',
  luxury: 'Luxury', exotic: 'Exotic', off_road: 'Off-Road', vintage: 'Vintage',
}

type SavedRow = {
  generations: {
    id: string; slug: string; code: string; year_start: number; year_end: number | null
    class: string; hero_image: string | null; units_produced: number | null
    models: { name: string; makes: { name: string; country: string } }
  } | null
}

function mapCarSummary(g: NonNullable<SavedRow['generations']>): CarSummary {
  return {
    id: g.id, slug: g.slug, make: g.models.makes.name, model: g.models.name,
    generation: g.code, year_start: g.year_start, year_end: g.year_end,
    class: CLASS_ENUM_TO_LABEL[g.class] ?? g.class, country: g.models.makes.country,
    hero_image: g.hero_image, units_produced: g.units_produced,
  }
}

// Client component, same discipline as SiteHeader/SaveButton: never queries
// saved_models until a signed-in user is confirmed via onAuthStateChange.
export default function GaragePage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [cars, setCars] = useState<CarSummary[] | null>(null)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) { setUserId(null); setCars(null); return }
        setUserId(session.user.id)
        supabase
          .from('saved_models')
          .select('generations(id, slug, code, year_start, year_end, class, hero_image, units_produced, models(name, makes(name, country)))')
          .eq('user_id', session.user.id)
          .then(({ data }: { data: SavedRow[] | null }) => {
            setCars((data ?? []).map(row => row.generations).filter((g): g is NonNullable<SavedRow['generations']> => !!g).map(mapCarSummary))
          })
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        setCars(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20 flex-1">
        <h1 className="text-heading font-bold mb-8">My Garage</h1>

        {userId === undefined ? null : userId === null ? (
          <div className="text-center py-20">
            <p className="text-paragraph text-text-secondary mb-6">Sign in to see the cars you&apos;ve saved.</p>
            <button onClick={() => setShowSignIn(true)} className="btn-primary h-10 px-7">
              Sign In
            </button>
          </div>
        ) : cars === null ? null : cars.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-paragraph text-text-secondary mb-6">You haven&apos;t saved any cars yet.</p>
            <Link href="/" className="btn-primary h-10 px-7 no-underline">
              Browse cars
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {cars.map(car => <CarCard key={car.id} car={car} />)}
          </div>
        )}
      </main>
      <SiteFooter />

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
    </>
  )
}
