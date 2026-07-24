'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import themeLightDark from '@iconify-icons/mdi/theme-light-dark';
import magnify from '@iconify-icons/mdi/magnify';
import { MobileTabBar } from './MobileTabBar';
import { shopLinkProps } from '@/lib/shopify-storefront';

type PanelId = 'panel-new' | 'panel-lashes' | 'panel-nails' | 'panel-rituals';

const NAV: { label: string; panel?: PanelId; collectionHandle?: string }[] = [
  { label: 'New & Notable', panel: 'panel-new', collectionHandle: 'all' },
  { label: 'Lashes', panel: 'panel-lashes', collectionHandle: 'lashes' },
  { label: 'Nails', panel: 'panel-nails', collectionHandle: 'nails' },
  { label: 'Rituals', panel: 'panel-rituals' },
  { label: 'Gifts' },
  { label: 'B2B Wholesale' },
  { label: 'Affiliate' },
];

const CLOSE_DELAY_MS = 180;

/* Anything keyboard-tabbable inside a dialog. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

/*
 * Deterministic dialog focus lifecycle: on open, move focus to the first
 * tabbable element (or the dialog container itself); on close, restore focus
 * to the element that opened THIS dialog — but only if it is still mounted.
 */
function useDialogFocus(open: boolean, dialogRef: React.RefObject<HTMLDivElement | null>) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const dialog = dialogRef.current;
      if (dialog) {
        const first = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (first ?? dialog).focus();
      }
    } else {
      const opener = openerRef.current;
      openerRef.current = null;
      // Guard against stale/unmounted openers before restoring focus.
      if (opener && document.contains(opener)) {
        opener.focus();
      }
    }
  }, [open, dialogRef]);
}

export function SiteHeader() {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [solid, setSolid] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Megamenu trigger refs — arrow-key roving focus (see handleNavKeyDown)
  const navRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight - 120);
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  const open = (id: PanelId | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenPanel(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenPanel(null), CLOSE_DELAY_MS);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Focus trap / dialog ref
  const navDrawerRef = useRef<HTMLDivElement>(null);

  // Scrim / scroll lock follows the drawer
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add('scrim-active');
    } else {
      document.body.classList.remove('scrim-active');
    }
    return () => {
      document.body.classList.remove('scrim-active');
    };
  }, [drawerOpen]);

  // Dialog focus entry + restore
  useDialogFocus(drawerOpen, navDrawerRef);

  // Dialog Accessibility Keyboard Trap & Escape handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes everything
      if (e.key === 'Escape') {
        if (drawerOpen) setDrawerOpen(false);
        if (openPanel) setOpenPanel(null);
        return;
      }

      if (e.key === 'Tab') {
        const activeDialog = drawerOpen ? navDrawerRef.current : null;

        if (!activeDialog) return;

        const focusables = activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (!first || !last) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, openPanel]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('glamd-theme', next);
  };

  const promo = (image: string, position: string, size: string | undefined, caption: string, shopPath?: string) => {
    const content = (
      <>
        <div
          className="promoImg"
          style={{
            backgroundImage: `url('${image}')`,
            backgroundPosition: position,
            ...(size ? { backgroundSize: size } : {}),
          }}
        />
        <span>{caption}</span>
      </>
    );
    return shopPath ? (
      <a className="promoBlock" {...shopLinkProps(shopPath)}>{content}</a>
    ) : (
      <div className="promoBlock">{content}</div>
    );
  };

  const panelProps = (id: PanelId) => ({
    className: `MegaMenuPanel${openPanel === id ? ' open' : ''}`,
    id,
    role: 'region' as const,
    onMouseEnter: cancelClose,
    onMouseLeave: scheduleClose,
  });

  // Keyboard interaction on nav triggers: Enter/Space toggles the megamenu,
  // ArrowLeft/ArrowRight/Home/End rove focus across the triggers via navRefs.
  const handleNavKeyDown = (e: React.KeyboardEvent, label: string, panel: PanelId | undefined) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const labels = NAV.map((item) => item.label);
      const idx = labels.indexOf(label);
      const nextIdx =
        e.key === 'ArrowRight'
          ? (idx + 1) % labels.length
          : e.key === 'ArrowLeft'
          ? (idx - 1 + labels.length) % labels.length
          : e.key === 'Home'
          ? 0
          : labels.length - 1;
      const nextLabel = labels[nextIdx];
      if (nextLabel) navRefs.current[nextLabel]?.focus();
      return;
    }
    if (!panel) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (openPanel === panel) {
        setOpenPanel(null);
      } else {
        open(panel);
      }
    }
  };

  return (
    <>
      {/* Scrim overlay */}
      <div
        className={`drawer-scrim${drawerOpen ? ' active' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Hamburger top-left → left drawer with full menu */}
      <div 
        ref={navDrawerRef}
        className={`nav-drawer${drawerOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        tabIndex={-1}
      >
        <div className="drawer-hdr">
          <a className="brand" href="#">GlamD</a>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <div className="drawer-body">
          <ul className="drawer-nav-list">
            {NAV.map(({ label, collectionHandle }) => (
              <li className="drawer-nav-item" key={label}>
                {collectionHandle ? (
                  <a
                    {...shopLinkProps(`/collections/${collectionHandle}`)}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {label}
                  </a>
                ) : (
                  <button onClick={() => setDrawerOpen(false)}>
                    {label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="drawer-footer">
          <a href="#" onClick={() => setDrawerOpen(false)}>Track order</a>
          <a href="#" onClick={() => setDrawerOpen(false)}>Support</a>
          <a href="#" onClick={() => setDrawerOpen(false)}>Account</a>
        </div>
      </div>

      <header className={`site-header${solid ? ' solid' : ''}`} onMouseLeave={scheduleClose}>
        <div className="hdr-util">
          <div className="hdr-util-left">
            {/* Hamburger icon for mobile view */}
            <button className="mobile-menu-toggle" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
            <button onClick={toggleTheme} aria-label="Toggle theme" className="theme-toggle-btn">
              <Icon icon={themeLightDark} className="iconify" /> <span>Theme</span>
            </button>
            <a href="#">EGP – EG (EN)</a>
            <a href="#">Points of sale</a>
            <a href="#">Contact us</a>
          </div>
          <a className="brand" href="#">
            GlamD
          </a>
          <div className="hdr-util-right">
            <a href="#join">Sign up by email</a>
            <a href="#">Account</a>
            <a className="cart-btn" {...shopLinkProps('/cart')} aria-label="View cart">
              <span className="cart-text">My cart</span>
              <svg className="mobile-cart-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </a>
          </div>
        </div>
        <nav className="hdr-nav" aria-label="Main Navigation">
          {NAV.map(({ label, panel }) => (
            <div className="nav-item" key={label}>
              <button
                ref={(el) => { navRefs.current[label] = el; }}
                aria-expanded={panel ? openPanel === panel : undefined}
                aria-controls={panel}
                aria-haspopup={panel ? 'true' : undefined}
                onMouseEnter={() => open(panel ?? null)}
                onFocus={() => open(panel ?? null)}
                onKeyDown={(e) => handleNavKeyDown(e, label, panel)}
              >
                {label}
              </button>
            </div>
          ))}
          <div className="nav-item">
            <button onMouseEnter={() => open(null)} onFocus={() => open(null)}>
              <Icon icon={magnify} className="iconify" /> Search
            </button>
          </div>
        </nav>

        <div {...panelProps('panel-new')}>
          <div className="contentGrid">
            <div>
              <h3>Latest additions</h3>
              <ul>
                <li><a href="#">Silk Wispy Lash Collection</a></li>
                <li><a href="#">Almond Pearl Nail Set</a></li>
                <li><a href="#">Lash Nourishing Serum</a></li>
                <li><a href="#">Golden Hour Aftercare Kit</a></li>
              </ul>
            </div>
            <div>
              <h3>The essentials</h3>
              <ul>
                <li><a {...shopLinkProps('/collections/lashes')}>Luxury Lash Strip</a></li>
                <li><a {...shopLinkProps('/collections/nails')}>Premium Stick-on Nails</a></li>
                <li><a {...shopLinkProps('/collections/accessories')}>Precision Applicator</a></li>
                <li><a href="#">Cleansing Ritual Duo</a></li>
              </ul>
            </div>
            {promo('/landing/eye_lashes_cat.png', 'center', 'cover', 'A GlamD signature — Luxury Lash Strip', '/collections/lashes')}
            {promo('/landing/nails_cat.png', 'center', 'cover', 'Premium Stick-on Nail Set', '/collections/nails')}
          </div>
        </div>

        <div {...panelProps('panel-lashes')}>
          <div className="contentGrid">
            <div>
              <h3>Category</h3>
              <ul>
                <li><a href="#">Luxury Lash Strips</a></li>
                <li><a href="#">Wispy Collection</a></li>
                <li><a href="#">Classic HD Lashes</a></li>
                <li><a href="#">Magnetic Lashes</a></li>
              </ul>
            </div>
            <div>
              <h3>Care</h3>
              <ul>
                <li><a href="#">Serums &amp; Oils</a></li>
                <li><a href="#">Cleansers</a></li>
                <li><a href="#">Aftercare Kits</a></li>
              </ul>
            </div>
            {promo('/landing/eye_lashes_cat.png', 'center', 'cover', 'The Science of Curl — engineered for 24-hour hold', '/collections/lashes')}
            <div />
          </div>
        </div>

        <div {...panelProps('panel-nails')}>
          <div className="contentGrid">
            <div>
              <h3>Category</h3>
              <ul>
                <li><a href="#">Premium Nail Sets</a></li>
                <li><a href="#">French Classics</a></li>
                <li><a href="#">Editorial Shapes</a></li>
              </ul>
            </div>
            <div>
              <h3>Care &amp; Tools</h3>
              <ul>
                <li><a href="#">Nail Wellness</a></li>
                <li><a href="#">Aftercare</a></li>
                <li><a href="#">Applicators &amp; Tools</a></li>
              </ul>
            </div>
            {promo('/landing/nails_cat.png', 'center', 'cover', 'Premium Stick-on Nail Set — symmetrical, high-gloss', '/collections/nails')}
            <div />
          </div>
        </div>

        <div {...panelProps('panel-rituals')}>
          <div className="contentGrid">
            <div>
              <h3>Rituals</h3>
              <ul>
                <li><a href="#">The Morning Ritual</a></li>
                <li><a href="#">The Evening Unveiling</a></li>
                <li><a href="#">Application Guides</a></li>
              </ul>
            </div>
            <div>
              <h3>Library</h3>
              <ul>
                <li><a href="#">Journal</a></li>
                <li><a href="#">Ingredient Index</a></li>
              </ul>
            </div>
            {promo('/landing/accessories_cat.png', 'center', 'cover', 'The application, perfected', '/collections/accessories')}
            <div />
          </div>
        </div>
      </header>
      <MobileTabBar onMenuClick={() => setDrawerOpen(true)} />
    </>
  );
}
