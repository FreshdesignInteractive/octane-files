import Link from 'next/link'
import type { CarSummary } from '@/lib/types'
import { PLACEHOLDER_HERO_IMAGE } from '@/lib/placeholder-images'

function formatYears(start: number, end: number | null) {
  return end ? `${start}–${end}` : `${start}–present`
}

// A relation entry (see the Rivals/Where it comes from sections on the car
// detail page) can point at a real catalog car, or just be free text typed
// by an admin with no underlying row — there's no image, country, years, or
// class to show for that case, so the card falls back to a title-only
// variant instead of forcing a real CarSummary shape.
type CarCardEntry = CarSummary | { title: string }

export default function CarCard({ car }: { car: CarCardEntry }) {
  if (!('slug' in car)) {
    // No underlying car row to link to — instead this sends the visitor
    // straight to Request a Car, with the free text an admin already wrote
    // here (title) carried over as the starting point, so they're not
    // retyping what they just read. Signed-out visitors get the sign-in
    // dialog on that page itself (RequestCarForm's own gating), and the
    // OAuth round trip lands them right back on this same pre-filled URL.
    return (
      <Link href={`/request-car?car=${encodeURIComponent(car.title)}`} className="no-underline">
        <article className="card group">
          <div className="aspect-video bg-bg-elevated relative overflow-hidden flex items-center justify-center">
            <img
              src={PLACEHOLDER_HERO_IMAGE}
              alt=""
              className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <h3 className="text-paragraph font-bold text-text-primary leading-tight mb-1.5 truncate">{car.title}</h3>
            <div className="text-body text-text-tertiary">We haven&rsquo;t profiled this car yet</div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={`/cars/${car.slug}`} className="no-underline">
      <article className="card group">
        {/* Thumbnail */}
        <div className="aspect-video bg-bg-elevated relative overflow-hidden flex items-center justify-center">
          <img
            src={car.hero_image || PLACEHOLDER_HERO_IMAGE}
            alt={car.hero_image ? `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}` : `${car.make} ${car.model} — photo coming soon`}
            className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-paragraph font-bold text-text-primary leading-tight mb-1.5 truncate">
            {car.make} {car.model}
            {car.generation && car.generation.toLowerCase() !== car.model.toLowerCase() && (
              <span className="text-text-secondary font-normal text-paragraph"> {car.generation}</span>
            )}
          </h3>
          <div className="text-body text-text-tertiary flex gap-2 flex-wrap">
            <span>{car.country}</span>
            {car.class && (
              <>
                <span>&middot;</span>
                <span>{car.class}</span>
              </>
            )}
            <span>&middot;</span>
            <span>{formatYears(car.year_start, car.year_end)}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
