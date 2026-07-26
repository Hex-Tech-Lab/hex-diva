'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export function Providers({ children }: { children: React.ReactNode }) {
  // Astryx's <Theme> also owns document.documentElement's data-theme
  // attribute for its own light/dark system (see
  // @astryxdesign/core/dist/theme/Theme.js): with no `mode` prop it
  // defaults to 'system', and its root-sync effect actively REMOVES
  // data-theme on mount -- wiping out the value GlamD's own pre-paint
  // script and SiteHeader's toggle already set (this was the real cause
  // of the theme reverting after a Shopify->landing handoff; the attribute
  // was correctly set, then erased milliseconds later by this collision).
  // Feeding Astryx the current value as `mode` makes its sync effect
  // write the same value back instead of erasing it. The lazy initializer
  // reads the DOM (already resolved by the beforeInteractive script before
  // this client component mounts) so the very first render already has the
  // right value -- no flash. The MutationObserver keeps this in sync with
  // any later external change (SiteHeader's toggle button) without needing
  // every toggle call site to also update React state.
  const [mode, setMode] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light'
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setMode(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Theme theme={neutralTheme} mode={mode}>
      <LinkProvider component={Link}>
        <div className="glamd-page">{children}</div>
      </LinkProvider>
    </Theme>
  );
}
