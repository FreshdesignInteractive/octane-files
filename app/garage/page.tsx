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

// Client component, same discipline as SiteHeader/SaveButton: never queries
// saved_models until a signed-in user is confirmed via onAuthStateChange.
// NOTE: the query below still targets the old flat models(...) shape via
// saved_models' FK, which per the FK-repoint plan needs to move to
// generations(...). Left untouched here (type-only change to keep this file
// compiling against CarCard's new prop type) — the real fix lands with the
// saved_models/user_cars FK repoint.
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
          .select('models(id, slug, make, model, generation, year_start, year_end, class, country, hero_image, units_produced)')
          .eq('user_id', session.user.id)
          .then(({ data }: { data: { models: CarSummary }[] | null }) => {
            setCars((data ?? []).map(row => row.models).filter(Boolean))
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
        <h1 className="text-heading font-bold tracking-[-0.03em] mb-8">My Garage</h1>

        {userId === undefined ? null : userId === null ? (
          <div className="text-center py-20">
            <p className="text-base text-text-secondary mb-6">Sign in to see the cars you&apos;ve saved.</p>
            <button onClick={() => setShowSignIn(true)} className="btn-primary h-10 px-7">
              Sign In
            </button>
          </div>
        ) : cars === null ? null : cars.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-base text-text-secondary mb-6">You haven&apos;t saved any cars yet.</p>
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
