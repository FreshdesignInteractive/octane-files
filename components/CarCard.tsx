import Link from 'next/link'
import type { ModelSummary } from '@/lib/types'

function formatYears(start: number, end: number | null) {
  return end ? `${start}–${end}` : `${start}–present`
}

export default function CarCard({ car }: { car: ModelSummary }) {
  return (
    <Link href={`/cars/${car.slug}`} style={{ textDecoration: 'none' }}>
      <article style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'box-shadow 200ms, transform 200ms',
        cursor: 'pointer',
      }}
        className="group hover:shadow-md hover:-translate-y-0.5"
      >
        {/* Thumbnail */}
        <div style={{ aspectRatio: '16/9', background: '#f0f0f0', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={car.hero_image || '/placeholder.png'}
            alt={`${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 500ms' }}
            className={car.hero_image ? 'group-hover:scale-105' : ''}
            loading="lazy"
            onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.endsWith('/placeholder.png')) t.src = '/placeholder.png'; }}
          />
        </div>

        {/* Info */}
        <div style={{ padding: '14px 16px 16px' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
            {car.make} {car.model}
            {car.generation && car.generation.toLowerCase() !== car.model.toLowerCase() && (
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 15 }}> {car.generation}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span>{car.country}</span>
            <span>&middot;</span>
            <span>{formatYears(car.year_start, car.year_end)}</span>
            {car.class && (
              <>
                <span>&middot;</span>
                <span>{car.class}</span>
              </>
            )}
            {car.units_produced && (
              <>
                <span>&middot;</span>
                <span>{car.units_produced.toLocaleString()} produced</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
