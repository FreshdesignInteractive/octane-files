import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'About Us — Octane Files' }

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20">
        <div className="max-w-180">
          <h1 className="text-heading font-bold tracking-[-0.03em] mb-2">About Us</h1>
          <p className="text-base text-text-secondary leading-[1.8]">
            Octane Files is a curated encyclopedia of classic and collectible automobiles.
            Built for enthusiasts, collectors, and anyone who appreciates automotive history.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
