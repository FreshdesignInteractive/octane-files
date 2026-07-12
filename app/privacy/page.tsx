// Drafted with AI assistance. Have a licensed attorney review before public
// launch, especially the AI-output ownership clause and arbitration clause
// enforceability in your jurisdiction.

import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata = { title: 'Privacy Policy — Octane Files' }

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container pt-15 pb-20">
        <div className="max-w-180">
          <h1 className="text-heading font-bold mb-2">Privacy Policy</h1>
          <p className="text-body text-text-tertiary mb-10">Effective Date: July 10, 2026</p>

          <div className="prose">
            <p>
              This Privacy Policy (&quot;Policy&quot;) describes how Octane Files (&quot;Octane
              Files,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;), a subsidiary of Freshdesign Interactive, Inc., collects, uses,
              discloses, and safeguards information in connection with your access to and use of
              the Octane Files website, application, and related services (collectively, the
              &quot;Service&quot;). This Policy applies to all visitors and users of the Service
              (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;). By accessing or using the
              Service, you acknowledge that you have read and understood this Policy. This Policy
              should be read together with our{' '}
              <a href="/terms">Terms of Use</a>, which govern your use of the Service generally.
            </p>

            <h2>1. Introduction &amp; Scope</h2>
            <p>
              This Policy applies to information we collect through the Service, regardless of
              how you access it, and describes the choices available to you regarding our use of
              that information and how you can access and update it. This Policy does not apply
              to information collected by any third party, including through any application or
              content that may link to or be accessible from the Service.
            </p>

            <h2>2. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <ul>
              <li>
                <strong>Account and Contact Information.</strong> If you create an account or
                otherwise provide information directly to us, we may collect your name, email
                address, and any other information you choose to provide.
              </li>
              <li>
                <strong>Prompts and Inputs.</strong> When you use the Service to generate AI
                content, we collect the prompts, instructions, files, and other inputs you submit
                (&quot;Inputs&quot;), as well as the content generated in response
                (&quot;Output&quot;).
              </li>
              <li>
                <strong>Usage and Log Data.</strong> We automatically collect certain information
                about your interactions with the Service, including access times, pages viewed,
                features used, referring URLs, and similar diagnostic data.
              </li>
              <li>
                <strong>Device Data.</strong> We may collect information about the device and
                browser you use to access the Service, including IP address, browser type and
                version, operating system, and device identifiers.
              </li>
            </ul>
            <p>
              We do not currently use cookies or analytics tools to collect information about
              you. See Section 6 (&quot;Cookies &amp; Tracking Technologies&quot;) below for more
              detail.
            </p>

            <h2>3. How We Use Information</h2>
            <p>We use the information described above to:</p>
            <ul>
              <li>
                Provide, operate, and maintain the Service, including generating AI Output in
                response to your Inputs;
              </li>
              <li>
                Communicate with you about the Service, including responding to inquiries and
                providing support;
              </li>
              <li>
                Monitor, analyze, and improve the performance, security, and functionality of the
                Service;
              </li>
              <li>Detect, investigate, and prevent fraudulent, unauthorized, or illegal activity;</li>
              <li>Comply with applicable law, legal process, and regulatory requirements; and</li>
              <li>Enforce our Terms of Use and other policies.</li>
            </ul>

            <h2>4. AI Processing Disclosure</h2>
            <p>
              The Service generates Output using third-party artificial intelligence providers,
              currently Anthropic, Google Gemini, and Figma (each, an &quot;AI Provider&quot;).
              When you submit Inputs to the Service, those Inputs are transmitted to one or more
              AI Providers for the sole purpose of generating Output on your behalf. Each AI
              Provider acts as a sub-processor with respect to the Inputs it receives and
              processes them in accordance with its own terms of service and privacy policy, in
              addition to any contractual commitments it has made to us. We encourage you to
              review the applicable AI Provider&apos;s policies for more information about how it
              processes data. We do not control, and are not responsible for, the internal data
              handling practices of any AI Provider, except as set out in our agreements with
              them.
            </p>

            <h2>5. How We Share Information</h2>
            <p>We do not sell your personal information. We may share information as follows:</p>
            <ul>
              <li>
                <strong>AI Providers.</strong> As described in Section 4, we share Inputs with
                Anthropic, Google Gemini, and Figma to generate Output.
              </li>
              <li>
                <strong>Payment Processor.</strong> If and when Octane Files offers paid
                subscriptions, billing and payment information will be shared with Stripe, Inc.
                (&quot;Stripe&quot;) to process payments. See Section 8 of our Terms of Use for
                more detail.
              </li>
              <li>
                <strong>Service Providers.</strong> We may share information with vendors and
                service providers who perform services on our behalf, such as hosting,
                infrastructure, and technical support, subject to confidentiality obligations.
              </li>
              <li>
                <strong>Legal Compliance and Protection.</strong> We may disclose information if
                required to do so by law or in the good-faith belief that such action is
                necessary to comply with legal process, protect the rights or safety of Octane
                Files, our users, or the public, or investigate fraud or security issues.
              </li>
              <li>
                <strong>Business Transfers.</strong> We may disclose or transfer information in
                connection with a merger, acquisition, reorganization, financing, or sale of
                assets involving Octane Files or Freshdesign Interactive, Inc.
              </li>
            </ul>

            <h2>6. Cookies &amp; Tracking Technologies</h2>
            <p>
              Octane Files does not currently use cookies, web beacons, pixels, or similar
              tracking or analytics technologies to collect information about your use of the
              Service, other than strictly necessary technical mechanisms (such as session
              identifiers, if applicable) required for the Service to function. We may in the
              future implement analytics tools, such as Google Analytics, to help us understand
              how the Service is used. If we do so, we will update this Policy to describe the
              categories of tracking technologies used and provide any choices available to you,
              as required by applicable law.
            </p>

            <h2>7. Data Retention</h2>
            <p>
              We retain information for as long as necessary to provide the Service, comply with
              our legal obligations, resolve disputes, enforce our agreements, and for other
              legitimate business purposes. When information is no longer needed for these
              purposes, we take reasonable steps to delete or de-identify it.
            </p>

            <h2>8. Data Security</h2>
            <p>
              We implement reasonable administrative, technical, and physical safeguards designed
              to protect information from unauthorized access, use, disclosure, alteration, or
              destruction. However, no method of transmission over the internet or method of
              electronic storage is completely secure, and we cannot guarantee the absolute
              security of your information.
            </p>

            <h2>9. Your California Privacy Rights</h2>
            <p>
              If you are a California resident, the California Consumer Privacy Act, as amended
              by the California Privacy Rights Act (collectively, the &quot;CCPA&quot;), grants
              you certain rights with respect to your personal information, including the right
              to:
            </p>
            <ul>
              <li>
                Know what personal information we have collected about you and how it has been
                used and disclosed;
              </li>
              <li>Delete personal information we have collected from you, subject to certain exceptions;</li>
              <li>Correct inaccurate personal information we maintain about you;</li>
              <li>Opt out of the sale or sharing of your personal information; and</li>
              <li>Not be discriminated against for exercising any of these rights.</li>
            </ul>
            <p>
              We do not sell or share personal information for cross-context behavioral
              advertising, and there is currently no sale or sharing to opt out of. To exercise
              any of the rights described above, please contact us using the information in
              Section 13. We will verify your request in accordance with applicable law before
              taking action.
            </p>

            <h2>10. Children&apos;s Privacy</h2>
            <p>
              The Service is intended solely for users who are 18 years of age or older. The
              Service is not directed to, and we do not knowingly collect personal information
              from, individuals under the age of 18. If we become aware that we have collected
              personal information from a person under 18, we will take steps to delete such
              information.
            </p>

            <h2>11. International Users</h2>
            <p>
              The Service is currently offered only to users located in the United States. If you
              access the Service from outside the United States, you do so at your own risk, and
              you are responsible for compliance with local laws, to the extent applicable.
            </p>

            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Policy from time to time. If we make material changes, we will
              update the &quot;Effective Date&quot; at the top of this Policy and, where required
              by law, provide additional notice. Your continued use of the Service after any
              changes become effective constitutes your acceptance of the revised Policy.
            </p>

            <h2>13. Contact Us</h2>
            <p>
              If you have questions about this Policy or wish to exercise any rights described
              above, please contact us at:
            </p>
            <p>
              Octane Files
              <br />
              c/o Freshdesign Interactive, Inc.
              <br />
              130 Umbarger Road
              <br />
              San Jose, CA 95111
              <br />
              Email: <a href="mailto:info@freshdesign.com">info@freshdesign.com</a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
