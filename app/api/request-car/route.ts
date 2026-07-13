import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const TO_EMAIL = 'raj.sidharthan@freshdesign.com'
const FROM_EMAIL = 'Octane Files <noreply@octanefiles.com>'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'You need to be signed in to request a car.' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'You need to be signed in to request a car.' }, { status: 401 })
  }

  const { message } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set')
    return NextResponse.json({ error: 'Requests aren’t configured yet. Please try again later.' }, { status: 500 })
  }

  const requesterName = user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown'
  const requesterEmail = user.email ?? 'unknown'

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    replyTo: requesterEmail,
    subject: 'Octane Files car request',
    text: `Requested by: ${requesterName} <${requesterEmail}>\n\n${message}`,
  })

  if (error) {
    console.error('Resend send failed:', error)
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
