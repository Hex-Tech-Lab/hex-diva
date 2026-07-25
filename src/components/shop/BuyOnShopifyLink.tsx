'use client';

import { shopLinkProps } from '@/lib/shopify-storefront';

/**
 * Client boundary for the theme-handoff onClick in shopLinkProps() — event
 * handlers can't be spread onto a DOM element from a Server Component, so
 * this small client wrapper isolates just the interactive link.
 */
export function BuyOnShopifyLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <a
      {...shopLinkProps(path)}
      className="mt-8 inline-block rounded-md bg-charcoal-900 px-8 py-3 text-white hover:opacity-90 transition-opacity"
    >
      {children}
    </a>
  );
}
