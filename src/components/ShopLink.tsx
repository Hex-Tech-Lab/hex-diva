'use client';

import { shopLinkProps } from '@/lib/shopify-storefront';

export function ShopLink({
  path,
  className,
  children,
}: {
  path: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a className={className} {...shopLinkProps(path)}>
      {children}
    </a>
  );
}
