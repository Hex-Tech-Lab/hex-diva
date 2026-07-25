import { SHOPIFY_STOREFRONT_URL } from '@/lib/shopify-storefront';

/**
 * Explicit "not wired up yet" state for shop pages when the Shopify
 * Storefront API isn't configured (SHOPIFY_SHOP_NAME /
 * SHOPIFY_STOREFRONT_ACCESS_TOKEN unset or still the .env.example
 * placeholder values). Deliberately visible/labeled rather than silently
 * falling back to fake product data.
 */
export function StorefrontNotConfigured({ context }: { context: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <h1 className="text-2xl font-bold text-charcoal-900 mb-3">Catalog temporarily unavailable</h1>
      <p className="text-gray-600 mb-2">
        We couldn&apos;t load {context} because the Shopify Storefront API isn&apos;t connected yet in this
        environment (missing <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">SHOPIFY_SHOP_NAME</code> /{' '}
        <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">SHOPIFY_STOREFRONT_ACCESS_TOKEN</code>).
      </p>
      <p className="text-gray-600 mb-8">In the meantime, browse the live storefront directly.</p>
      <a
        href={SHOPIFY_STOREFRONT_URL}
        className="inline-block rounded-md bg-charcoal-900 px-6 py-3 text-white hover:opacity-90 transition-opacity"
      >
        Visit the shop
      </a>
    </div>
  );
}
