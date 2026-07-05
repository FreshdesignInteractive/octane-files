import { NextRequest, NextResponse } from 'next/server'
import { getModels } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const result = await getModels({
    class:   p.get('class')   ?? undefined,
    country: p.get('country') ?? undefined,
    make:    p.get('make')    ?? undefined,
    search:  p.get('q')       ?? undefined,
    limit:   Number(p.get('limit')  ?? 12),
    offset:  Number(p.get('offset') ?? 0),
  })
  return NextResponse.json(result)
}
