import { Button } from '@astryxdesign/core/Button';
import { SHOPIFY_STOREFRONT_URL } from '@/lib/shopify-storefront';

/**
 * Placeholder only -- fixes a real broken link (login page references
 * /terms), not a substitute for actual Terms of Service content. Return
 * policy, data handling, liability, and dispute terms need to be
 * authored deliberately, not fabricated here.
 */
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-3xl font-bold text-charcoal-900 mb-4">Terms of Service</h1>
      <p className="text-gray-600 mb-8">
        Our full Terms of Service are being finalized and will be published here.
        In the meantime, if you have questions about your order, account, or our
        policies, please contact us directly.
      </p>
      <a href={`${SHOPIFY_STOREFRONT_URL}/collections/all`}>
        <Button variant="secondary" label="Back to Shop" />
      </a>
    </div>
  );
}
