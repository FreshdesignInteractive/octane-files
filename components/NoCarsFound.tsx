import Link from 'next/link'

// Shared "nothing matched" empty state — the Browse grid (no filter/search
// results) and the header search dialog (no typeahead matches) both need
// the same message and CTA, just at different scales and with different
// framing for that first line: Browse has actual filter dropdowns to
// adjust, the dialog is search-only and has no filters at all. `compact`
// shrinks the icon/heading/spacing for the dialog's much smaller footprint.
// `onLinkClick` lets a modal close itself when "Send a request" is
// clicked, same as every other link inside it.
export default function NoCarsFound({
  compact = false,
  hint = 'Try adjusting your filters or request a car to be added.',
  onLinkClick,
}: {
  compact?: boolean
  hint?: string
  onLinkClick?: () => void
}) {
  return (
    <div className={compact ? 'text-center py-10 px-6' : 'text-center py-20'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static local asset, same as the logo in SiteHeader */}
      <img
        src="/Missing.svg"
        alt=""
        className={compact ? 'w-16 h-16 mx-auto mb-4' : 'w-36 h-36 mx-auto mb-6'}
      />
      <h2 className={compact ? 'text-xl font-bold text-text-primary mb-1.5' : 'text-heading font-bold text-text-primary mb-2'}>
        No cars found
      </h2>
      <p className={compact ? 'text-body text-text-secondary mb-1' : 'text-paragraph text-text-secondary mb-2'}>
        {hint}
      </p>
      <p className={compact ? 'text-body text-text-secondary' : 'text-paragraph text-text-secondary'}>
        We curate every car to meet collector standards. Missing one?{' '}
        <Link href="/request-car" onClick={onLinkClick} className="text-accent underline">Send a request</Link>.
      </p>
    </div>
  )
}
