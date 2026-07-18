import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
]

const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/OctaneFiles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com/OctaneFiles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/octanefiles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'Pinterest',
    href: 'https://www.pinterest.com/octanefiles/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/18084498/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-bg-elevated px-6 pt-8 pb-7">
      <div className="site-container flex flex-col items-center gap-5">

        {/* Nav links */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {NAV_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center gap-2">
              <Link href={link.href} className="text-body text-text-secondary no-underline hover:text-text-primary transition-colors">
                {link.label}
              </Link>
              {i < NAV_LINKS.length - 1 && (
                <span className="text-border-mid text-sm">&middot;</span>
              )}
            </span>
          ))}
        </div>

        {/* Social icons */}
        <div className="flex items-center gap-5">
          {SOCIAL_LINKS.map(s => (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
              aria-label={s.label}
              className="text-text-primary flex items-center transition-opacity hover:opacity-50">
              {s.icon}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-label text-text-tertiary m-0">
          &copy; {new Date().getFullYear()} All Rights Reserved, Freshdesign Interactive, Inc.
        </p>
      </div>
    </footer>
  )
}
