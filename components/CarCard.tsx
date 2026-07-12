import Link from 'next/link'
import type { CarSummary } from '@/lib/types'

function formatYears(start: number, end: number | null) {
  return end ? `${start}–${end}` : `${start}–present`
}

export default function CarCard({ car }: { car: CarSummary }) {
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
          <h3 className="text-base font-bold text-text-primary leading-tight mb-1.5">
            {car.make} {car.model}
            {car.generation && car.generation.toLowerCase() !== car.model.toLowerCase() && (
              <span className="text-text-secondary font-normal text-sm"> {car.generation}</span>
            )}
          </h3>
          <div className="text-xs text-text-tertiary flex gap-2 flex-wrap">
            <span>{car.country}</span>
            <span>&middot;</span>
            <span>{formatYears(car.year_start, car.year_end)}</span>
            {car.class && (
              <>
                <span>&middot;</span>
                <span>{car.class}</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
