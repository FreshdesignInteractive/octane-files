'use client'

import { useEffect, useRef } from 'react'

// Progressive enhancement, not a hard requirement — the server-rendered
// markup below always starts fully visible (opacity-100, no transform), so
// no-JS/slow-JS clients and crawlers get the complete, readable page with
// nothing to wait on. Once mounted, this drops to a hidden starting state
// via direct DOM manipulation on the ref (not React state — there's no
// component state here at all, just syncing this element with the
// IntersectionObserver, which is exactly what an effect is for), then
// reveals it once it scrolls into view. motion-reduce: variants always stay
// present in the class list and override the animation for users who've
// asked for reduced motion, regardless of the reveal state.
export default function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.classList.remove('opacity-100', 'translate-y-0')
    el.classList.add('opacity-0', 'translate-y-4')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('opacity-0', 'translate-y-4')
          el.classList.add('opacity-100', 'translate-y-0')
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 opacity-100 translate-y-0 ${className}`}
    >
      {children}
    </div>
  )
}
