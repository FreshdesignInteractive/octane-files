import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-6 text-center bg-bg-elevated">
        <h1 className="text-display font-extrabold text-text-primary leading-none mb-6">
          404
        </h1>
        <h2 className="text-heading font-bold text-text-primary mb-4">
          Page not found
        </h2>
        <p className="text-base text-text-secondary mb-10 max-w-120 leading-[1.6]">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Head back home and find what you need.
        </p>
        <Link href="/" className="btn-primary h-14 px-9 gap-2 rounded-full text-base font-semibold no-underline">
          ‹ Back to home
        </Link>
      </main>
    </>
  )
}
