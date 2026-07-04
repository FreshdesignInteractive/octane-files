import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkIsAdmin } from '@/lib/is-admin'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // API key check
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Anthropic API key not set. Add ANTHROPIC_API_KEY to .env.local.' },
      { status: 503 }
    )
  }

  const car = await req.json()
  const name = [car.make, car.model, car.generation].filter(Boolean).join(' ')
  const years = car.year_end ? `${car.year_start}–${car.year_end}` : `${car.year_start}–present`

  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are filling in a collector car encyclopedia entry. Return ONLY valid JSON, no markdown, no explanation.

Car: ${name}
Years: ${years}
Class: ${car.class}
Body styles: ${(car.body_styles ?? []).join(', ') || 'unknown'}
Drivetrain: ${(car.drivetrain ?? []).join(', ') || 'unknown'}
Engine layout: ${car.engine_layout ?? 'unknown'}

Return this exact JSON structure:
{
  "overview": "2-3 paragraphs covering history, what made this car significant, key highlights and variants. Be specific and accurate.",
  "specs": [
    {
      "group": "Engine",
      "specs": [{"label": "Configuration", "value": "..."}, {"label": "Displacement", "value": "..."}, {"label": "Output", "value": "..."}]
    },
    {
      "group": "Performance",
      "specs": [{"label": "0–60 mph", "value": "..."}, {"label": "Top speed", "value": "..."}]
    },
    {
      "group": "Dimensions",
      "specs": [{"label": "Wheelbase", "value": "..."}, {"label": "Weight", "value": "..."}]
    }
  ],
  "market_data": {
    "low": 45000,
    "mid": 85000,
    "high": 200000,
    "currency": "USD",
    "as_of": "${new Date().toISOString().slice(0, 7)}",
    "notes": "One sentence on what drives price variation."
  },
  "maintenance": "2-3 paragraphs: common issues, parts availability, owner tips, relevant clubs or registries."
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 })
  }
}
