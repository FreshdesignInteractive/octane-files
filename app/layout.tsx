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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-text-primary">{children}</body>
    </html>
  )
}
