import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' })

export const metadata: Metadata = {
  title: { default: 'Octane Files', template: '%s | Octane Files' },
  description: 'The definitive reference for collector cars — specs, history, market data, and maintenance for the cars that matter.',
  openGraph: {
    siteName: 'Octane Files',
    type: 'website',
  },
  // X reads its own separate twitter:* meta tags, not just Open Graph's —
  // without this, link previews on X have nothing reliable to render even
  // when a page's own openGraph.images is set correctly.
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen flex flex-col bg-bg-base text-text-primary">{children}</body>
    </html>
  )
}
