// Run: npx tsx scripts/seed-db.ts
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { MOCK_CARS } from '../lib/mock-data'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
})

const BATCH = 50

async function seed() {
  console.log(`Seeding ${MOCK_CARS.length} cars into models table...`)

  let inserted = 0
  let skipped  = 0

  for (let i = 0; i < MOCK_CARS.length; i += BATCH) {
    const batch = MOCK_CARS.slice(i, i + BATCH).map(car => ({
      slug:           car.slug,
      make:           car.make,
      model:          car.model,
      generation:     car.generation,
      year_start:     car.year_start,
      year_end:       car.year_end,
      class:          car.class,
      country:        car.country,
      body_styles:    car.body_styles,
      drivetrain:     car.drivetrain,
      engine_layout:  car.engine_layout,
      units_produced: car.units_produced,
      overview:       car.overview,
      hero_image:     car.hero_image,
      gallery_images: car.gallery_images,
      specs:          car.specs,
      market_data:    car.market_data,
      maintenance:    car.maintenance,
      resources:      car.resources,
    }))

    const { error, data } = await supabase
      .from('models')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false })
      .select('slug')

    if (error) {
      console.error(`❌  Batch ${i / BATCH + 1} failed:`, error.message)
    } else {
      inserted += data?.length ?? batch.length
      console.log(`  ✓ Batch ${i / BATCH + 1}: ${data?.length ?? batch.length} rows`)
    }
  }

  console.log(`\nDone. ${inserted} inserted/updated, ${skipped} skipped.`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
