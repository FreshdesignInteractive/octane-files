'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export type ShareCarInfo = {
  name: string
  infoLine: string
  image: string
}

function CopyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function PinterestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 20 C10 15 10.5 11.5 10.5 10.5 a2.5 2.5 0 1 1 3 2.4 c-.3 1.2-.7 2.7 1 3.4 2 .8 4.5-1 4.5-4.3 0-3-2.5-5.3-5.8-5.3 -4 0-6.2 2.8-6.2 5.7 0 1.1.4 2.3 1.3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function ShareOption({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-4 h-14 border border-border rounded-lg bg-white text-body font-medium text-text-primary cursor-pointer transition-colors hover:bg-bg-elevated text-left"
    >
      {icon}
      {label}
    </button>
  )
}

export default function ShareDialog({ car, onClose }: { car: ShareCarInfo; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function openShareWindow(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function shareFacebook() {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)
  }

  function shareTwitter() {
    openShareWindow(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(car.name)}`)
  }

  function shareLinkedIn() {
    openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`)
  }

  function sharePinterest() {
    openShareWindow(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(car.image)}&description=${encodeURIComponent(car.name)}`)
  }

  // Instagram has no web share-intent URL — unlike Facebook/Twitter/LinkedIn/
  // Pinterest, there's no way to hand it a link directly. Copying the link
  // is the standard fallback (paste into a bio/DM/story).
  function shareInstagram() {
    copyLink()
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[200] bg-overlay flex items-center justify-center p-6">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl pt-8 px-8 pb-8 w-full max-w-[560px] relative shadow-modal">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary tracking-[-0.02em] m-0">Share this car</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-none cursor-pointer text-text-tertiary flex items-center justify-center p-1 rounded-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-7">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-bg-elevated flex-shrink-0">
            <Image src={car.image} alt="" fill className="object-cover" />
          </div>
          <div>
            <div className="text-body font-semibold text-text-primary">{car.name}</div>
            <div className="text-label text-text-secondary mt-1">{car.infoLine}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ShareOption label={copied ? 'Copied!' : 'Copy Link'} onClick={copyLink} icon={<CopyIcon />} />
          <ShareOption label="Facebook" onClick={shareFacebook} icon={<FacebookIcon />} />
          <ShareOption label="Twitter / X" onClick={shareTwitter} icon={<TwitterIcon />} />
          <ShareOption label="LinkedIn" onClick={shareLinkedIn} icon={<LinkedInIcon />} />
          <ShareOption label="Pinterest" onClick={sharePinterest} icon={<PinterestIcon />} />
          <ShareOption label={copied ? 'Copied!' : 'Instagram'} onClick={shareInstagram} icon={<InstagramIcon />} />
        </div>
      </div>
    </div>
  )
}
