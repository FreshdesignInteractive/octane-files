import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'About Us — Octane Files' }

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20">
        <div className="max-w-180">
          <h1 className="text-heading font-bold mb-2">
            Every Car Has a Story. We&apos;re Just Here to Help You Keep It.
          </h1>

          <div className="prose mt-8">
            <p>
              You know the feeling — spotting a numbers-matching engine bay from across a parking
              lot, or losing a Saturday chasing a date-coded part down a forum thread from 2014.
              Collector cars carry history you can touch: the Charger that sat under a carport for
              twenty years before it came home, the title with a name on it you had to track down
              through three states. Every car has a story. Anyone who&apos;s brought one back wants
              to get that story right.
            </p>
            <p>
              That&apos;s what Octane Files is for — a place to keep your car&apos;s history
              straight. Build details, provenance, parts, photos, the paper trail behind what you
              already know in your gut. Not a spec sheet. A record worth handing down.
            </p>
            <p>
              We use a bit of AI in the background to take the busywork out of putting it
              together. The story&apos;s still yours — we just help you get it down faster.
            </p>
            <p>
              Based in San Jose, California. Building this one car, one owner, at a time.
            </p>
            <p>
              <strong>
                Got a car worth documenting? <Link href="/contact">Get in touch.</Link>
              </strong>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
