'use client'

import { useState } from 'react'
import ShareDialog, { type ShareCarInfo } from '@/components/ShareDialog'

export default function ShareButton({ car }: { car: ShareCarInfo }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="icon-link" onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>
      {open && <ShareDialog car={car} onClose={() => setOpen(false)} />}
    </>
  )
}
