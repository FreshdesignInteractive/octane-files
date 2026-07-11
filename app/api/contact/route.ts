import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const TO_EMAIL = 'raj.sidharthan@freshdesign.com'
const FROM_EMAIL = 'Octane Files <noreply@octanefiles.com>'

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name, email, and message are all required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set')
    return NextResponse.json({ error: 'Contact form isn’t configured yet. Please try again later.' }, { status: 500 })
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    replyTo: email,
    subject: `Octane Files contact form: ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  })

  if (error) {
    console.error('Resend send failed:', error)
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
