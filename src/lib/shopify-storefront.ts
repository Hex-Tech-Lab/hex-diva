export const SHOPIFY_STOREFRONT_URL = 'https://shop.diva.getmytestdrive.com';

/**
 * Spread onto an <a> to hand off the landing page's current dark/light choice
 * to Shopify (which can't read this origin's localStorage directly). Shopify's
 * layout/theme.liquid reads the ?theme= param on load, applies it, and strips
 * it from the URL.
 */
export function shopLinkProps(path: string) {
  return {
    href: `${SHOPIFY_STOREFRONT_URL}${path}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme !== 'dark' && theme !== 'light') return;
      e.preventDefault();
      const sep = path.includes('?') ? '&' : '?';
      window.location.href = `${SHOPIFY_STOREFRONT_URL}${path}${sep}theme=${theme}`;
    },
  };
}
