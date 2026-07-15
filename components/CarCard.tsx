import Link from 'next/link'
import type { CarSummary } from '@/lib/types'

function formatYears(start: number, end: number | null) {
  return end ? `${start}–${end}` : `${start}–present`
}

// A relation entry (see the Rivals/Where it comes from sections on the car
// detail page) can point at a real catalog car, or just be free text typed
// by an admin with no underlying row — there's no image, country, years, or
// class to show for that case, so the card falls back to a title-only,
// "Data unavailable" variant instead of forcing a real CarSummary shape.
type CarCardEntry = CarSummary | { title: string }

export default function CarCard({ car }: { car: CarCardEntry }) {
  if (!('slug' in car)) {
    return (
      <article className="card cursor-default hover:shadow-none hover:translate-y-0">
        <div className="aspect-video bg-bg-elevated relative overflow-hidden flex items-center justify-center">
          <img
            src="/placeholder.png"
            alt="Image unavailable"
            className="w-1/2 h-1/2 object-contain block opacity-40"
          />
        </div>
        <div className="p-4">
          <h3 className="text-base font-bold text-text-primary leading-tight mb-1.5 truncate">{car.title}</h3>
          <div className="text-xs text-text-tertiary">Data unavailable</div>
        </div>
      </article>
    )
  }

  return (
    <Link href={`/cars/${car.slug}`} className="no-underline">
      <article className="card group">
        {/* Thumbnail */}
        <div className="aspect-video bg-bg-elevated relative overflow-hidden flex items-center justify-center">
          {car.hero_image ? (
            <img
              src={car.hero_image}
              alt={`${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`}
              className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <img
              src="/placeholder.png"
              alt="Image unavailable"
              className="w-1/2 h-1/2 object-contain block opacity-40"
            />
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-base font-bold text-text-primary leading-tight mb-1.5 truncate">
            {car.make} {car.model}
            {car.generation && car.generation.toLowerCase() !== car.model.toLowerCase() && (
              <span className="text-text-secondary font-normal text-sm"> {car.generation}</span>
            )}
          </h3>
          <div className="text-xs text-text-tertiary flex gap-2 flex-wrap">
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
