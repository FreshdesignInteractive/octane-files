import { requireAdmin } from '@/lib/admin-auth'
import { createClient as buildClient } from '@supabase/supabase-js'
import Link from 'next/link'

function plain() {
  return buildClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const dot = (filled: boolean) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8,
    borderRadius: '50%',
    background: filled ? '#22c55e' : '#e5e5e5',
    flexShrink: 0,
  }} />
)

export default async function AdminPage() {
  await requireAdmin()

  const { data: models } = await plain()
    .from('models')
    .select('id, slug, make, model, generation, year_start, year_end, class, country, hero_image, overview, specs, market_data')
    .order('make')
    .order('year_start')

  const total      = models?.length ?? 0
  const hasImage   = models?.filter(m => m.hero_image).length ?? 0
  const hasOverview = models?.filter(m => m.overview).length ?? 0
  const hasSpecs   = models?.filter(m => Array.isArray(m.specs) && m.specs.length > 0).length ?? 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <Link href="/" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Back to site</Link>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 700, color: '#111' }}>Admin · Models</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{total} cars</p>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#555' }}>
          <span>🖼 {hasImage}/{total} images</span>
          <span>📝 {hasOverview}/{total} overviews</span>
          <span>⚙️ {hasSpecs}/{total} specs</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 11, color: '#888' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{dot(true)} filled</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{dot(false)} empty</span>
        <span style={{ marginLeft: 8 }}>Columns: Image · Overview · Specs · Market</span>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #e8e8e8' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Car</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Years</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Class</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Country</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#555' }}>Status</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#555' }}></th>
            </tr>
          </thead>
          <tbody>
            {models?.map((m, i) => (
              <tr key={m.id} style={{
                borderBottom: i < total - 1 ? '1px solid #f0f0f0' : 'none',
                background: '#ffffff',
              }}>
                <td style={{ padding: '10px 16px', color: '#111', fontWeight: 500 }}>
                  {m.make} {m.model}
                  {m.generation && m.generation.toLowerCase() !== m.model.toLowerCase() && (
                    <span style={{ color: '#888', fontWeight: 400 }}> · {m.generation}</span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', color: '#555' }}>
                  {m.year_start}{m.year_end ? `–${m.year_end}` : '–'}
                </td>
                <td style={{ padding: '10px 16px', color: '#555' }}>{m.class}</td>
                <td style={{ padding: '10px 16px', color: '#555' }}>{m.country}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {dot(!!m.hero_image)}
                    {dot(!!m.overview)}
                    {dot(Array.isArray(m.specs) && m.specs.length > 0)}
                    {dot(!!m.market_data)}
                  </div>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <Link href={`/admin/models/${m.slug}`} style={{
                    fontSize: 12, color: '#111', textDecoration: 'none',
                    border: '1px solid #e0e0e0', borderRadius: 5,
                    padding: '4px 10px',
                  }}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
