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
          <h1 className="text-heading font-bold tracking-[-0.03em] mb-2">
            Every Car Has a Story. We&apos;re Just Here to Help You Keep It.
          </h1>

          <div className="prose mt-8">
            <p>
              There&apos;s a reason you can spot a numbers-matching engine bay from across a
              parking lot, or lose an entire Saturday chasing down a date-coded part on a forum
              thread from ten years ago. Collector cars aren&apos;t just machines — they&apos;re
              history you can touch. The Charger that sat under a carport for two decades before
              it came home. The Barracuda with a name on the title you had to track down through
              three states. Every car carries a story, and anyone who&apos;s ever brought one back
              knows the feeling of wanting to get that story right.
            </p>
            <p>
              That&apos;s what Octane Files is for. We built it as a place to document your
              car&apos;s history properly — the build details, the provenance, the parts, the
              photos, the paper trail that backs up what you already know in your gut. Not a spec
              sheet. A record worth handing down to whoever owns it next.
            </p>
            <p>
              We do lean on a little AI behind the scenes, mostly to take the busywork out of
              putting that record together — nothing more dramatic than that. The story is still
              yours; we just help you get it down faster.
            </p>
            <p>
              We&apos;re based in San Jose, California, building this one car — and one obsessive
              owner — at a time.
            </p>
            <p>
              Got a car worth documenting? <Link href="/contact">Get in touch</Link> — we&apos;d
              love to hear about it.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
