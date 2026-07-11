import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ContactForm from '@/components/ContactForm'

export const metadata = { title: 'Contact Us — Octane Files' }

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20">
        <div className="max-w-180">
          <h1 className="text-heading font-bold tracking-[-0.03em] mb-2">Contact Us</h1>
          <p className="text-base text-text-secondary leading-[1.8] mb-8">
            Have a question or want to get in touch? Send us a message below.
          </p>
          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
