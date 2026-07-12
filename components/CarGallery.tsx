'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'

// images[0] is always the hero image; clicking a thumbnail swaps the large
// display, it doesn't reorder the rail. Clicking the large image opens a
// lightbox that reuses the same selection state, so arrow keys / the arrow
// buttons page through the identical image list.
export default function CarGallery({ images, alt }: { images: string[]; alt: string }) {
  const [selected, setSelected] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const close = useCallback(() => setLightboxOpen(false), [])
  const prev = useCallback(() => setSelected(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setSelected(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    if (!lightboxOpen) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, close, prev, next])

  const activeSrc = images[selected]
  const isPlaceholder = activeSrc === '/placeholder.png'

  return (
    <>
      <div className="flex gap-2.5 h-[clamp(280px,40vw,520px)]">
        <div className="relative flex-1 min-w-0 min-h-0 rounded-2xl overflow-hidden bg-bg-elevated">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Open image in lightbox"
            className="absolute inset-0 border-none p-0 cursor-zoom-in"
          >
            <Image
              src={activeSrc}
              alt={alt}
              fill
              className={isPlaceholder ? 'object-contain' : 'object-cover'}
              priority
            />
          </button>

          {/* Thumbnails are hidden below md, so the hero needs its own way
              to cycle through the rest of the photos on mobile. */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-white/30 bg-black/40 backdrop-blur-sm text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-black/60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-white/30 bg-black/40 backdrop-blur-sm text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-black/60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="hidden md:flex flex-col gap-2.5 w-52 shrink-0 min-h-0">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === selected}
                className={`relative flex-1 min-h-0 rounded-2xl overflow-hidden p-0 cursor-pointer transition-colors border-[1.5px] ${
                  i === selected ? 'border-accent' : 'border-transparent'
                }`}
              >
                <Image src={src} alt={`${alt} — photo ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6"
        >
          {images.length > 1 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {selected + 1} / {images.length}
            </div>
          )}

          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-transparent border-none cursor-pointer p-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prev() }}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/30 hover:border-white/60 text-white/70 hover:text-white bg-transparent cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
          )}

          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[1200px] h-[80vh]">
            <Image src={activeSrc} alt={alt} fill className="object-contain" />
          </div>

          {images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); next() }}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/30 hover:border-white/60 text-white/70 hover:text-white bg-transparent cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  )
}
