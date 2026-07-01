import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col" style={{ background: '#ffffff', color: '#111111' }}>{children}</body>
    </html>
  )
}
