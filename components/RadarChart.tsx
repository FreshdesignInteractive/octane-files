import { RADAR_AXES, type RadarScores } from '@/lib/car-schema'

const SIZE = 280
const CENTER = SIZE / 2
const MAX_RADIUS = SIZE / 2 - 44 // leaves room for axis labels
const RINGS = [0.25, 0.5, 0.75, 1]

function point(index: number, fraction: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / RADAR_AXES.length
  return [
    CENTER + Math.cos(angle) * MAX_RADIUS * fraction,
    CENTER + Math.sin(angle) * MAX_RADIUS * fraction,
  ]
}

function polygonPoints(fraction: number): string {
  return RADAR_AXES.map((_, i) => point(i, fraction).join(',')).join(' ')
}

// Renders nothing at all unless every axis has a value — a partial radar
// would visually read as "scores zero on the missing axes," which is
// misleading rather than merely incomplete. Scoring is a deliberate,
// all-at-once pass per car, not a field that fills in gradually.
export default function RadarChart({ scores }: { scores: RadarScores | null }) {
  if (!scores) return null
  const complete = RADAR_AXES.every(axis => typeof scores[axis.key] === 'number')
  if (!complete) return null

  const dataPoints = RADAR_AXES.map((axis, i) => point(i, (scores[axis.key] as number) / 10))

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
      {/* Grid rings */}
      {RINGS.map(r => (
        <polygon key={r} points={polygonPoints(r)} className="fill-none stroke-border" strokeWidth={1} />
      ))}
      {/* Axis lines */}
      {RADAR_AXES.map((axis, i) => {
        const [x, y] = point(i, 1)
        return <line key={axis.key} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-border" strokeWidth={1} />
      })}
      {/* Data shape */}
      <polygon
        points={dataPoints.map(p => p.join(',')).join(' ')}
        className="fill-accent-secondary/15 stroke-accent-secondary"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} className="fill-accent-secondary" />
      ))}
      {/* Axis labels */}
      {RADAR_AXES.map((axis, i) => {
        const [x, y] = point(i, 1.28)
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-tertiary text-micro font-medium uppercase tracking-wide"
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}
