'use client'

import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-body text-text-secondary leading-[1.8]">
        Thanks — your message is on its way. We’ll get back to you soon.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-125">
      <div className="field">
        <label htmlFor="name" className="field-label">Name</label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="email" className="field-label">Email</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="message" className="field-label">Message</label>
        <textarea
          id="message"
          className="textarea"
          rows={6}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
      </div>

      {status === 'error' && (
        <p className="text-body text-error">{error}</p>
      )}

      <button type="submit" disabled={status === 'sending'} className="btn-primary h-10 px-5 self-start">
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
