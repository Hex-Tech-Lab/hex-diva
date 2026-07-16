'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import themeLightDark from '@iconify-icons/mdi/theme-light-dark';
import magnify from '@iconify-icons/mdi/magnify';
import { MobileTabBar } from './MobileTabBar';

type PanelId = 'panel-new' | 'panel-lashes' | 'panel-nails' | 'panel-rituals';

const NAV: { label: string; panel?: PanelId }[] = [
  { label: 'New & Notable', panel: 'panel-new' },
  { label: 'Lashes', panel: 'panel-lashes' },
  { label: 'Nails', panel: 'panel-nails' },
  { label: 'Rituals', panel: 'panel-rituals' },
  { label: 'Gifts' },
  { label: 'B2B Wholesale' },
  { label: 'Affiliate' },
];

const CLOSE_DELAY_MS = 180;

export function SiteHeader() {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [solid, setSolid] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nav item ref tracking for focus changes
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
  const [cartOpen, setCartOpen] = useState(false);

  // Focus trap / dialog refs
  const navDrawerRef = useRef<HTMLDivElement>(null);
  const cartFlyoutRef = useRef<HTMLDivElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (drawerOpen || cartOpen) {
      document.body.classList.add('scrim-active');
      lastActiveElementRef.current = document.activeElement as HTMLElement;

      // Handle focus management on dialog entry
      setTimeout(() => {
        const dialog = drawerOpen ? navDrawerRef.current : cartFlyoutRef.current;
        if (dialog) {
          const focusable = dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]'
          );
          const first = focusable[0];
          if (first) {
            first.focus();
          }
        }
      }, 50);
    } else {
      document.body.classList.remove('scrim-active');
      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
    }
    return () => {
      document.body.classList.remove('scrim-active');
    };
  }, [drawerOpen, cartOpen]);

  // Dialog Accessibility Keyboard Trap & Escape handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes everything
      if (e.key === 'Escape') {
        if (drawerOpen) setDrawerOpen(false);
        if (cartOpen) setCartOpen(false);
        if (openPanel) setOpenPanel(null);
        return;
      }

      if (e.key === 'Tab') {
        const activeDialog = drawerOpen
          ? navDrawerRef.current
          : cartOpen
          ? cartFlyoutRef.current
          : null;

        if (!activeDialog) return;

        const focusables = activeDialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]'
        );
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
  }, [drawerOpen, cartOpen, openPanel]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('glamd-theme', next);
  };

  const promo = (image: string, position: string, size: string | undefined, caption: string) => (
    <div className="promoBlock">
      <div
        className="promoImg"
        style={{
          backgroundImage: `url('${image}')`,
          backgroundPosition: position,
          ...(size ? { backgroundSize: size } : {}),
        }}
      />
      <span>{caption}</span>
    </div>
  );

  const panelProps = (id: PanelId) => ({
    className: `MegaMenuPanel${openPanel === id ? ' open' : ''}`,
    id,
    role: 'region' as const,
    onMouseEnter: cancelClose,
    onMouseLeave: scheduleClose,
  });

  // Handle keyboard interaction on navigation panel triggers
  const handleNavKeyDown = (e: React.KeyboardEvent, panel: PanelId | undefined) => {
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
        className={`drawer-scrim${drawerOpen || cartOpen ? ' active' : ''}`} 
        onClick={() => { setDrawerOpen(false); setCartOpen(false); }}
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
            {NAV.map(({ label }) => (
              <li className="drawer-nav-item" key={label}>
                <button onClick={() => setDrawerOpen(false)}>
                  {label}
                </button>
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

      {/* Cart Flyout */}
      <div 
        ref={cartFlyoutRef}
        className={`cart-flyout${cartOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
        tabIndex={-1}
      >
        <div className="cart-hdr">
          <h2>My cart</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart">✕</button>
        </div>
        <div className="cart-body">
          <div className="cart-skeleton">
            <div className="cart-skeleton-item">
              <div className="cart-skeleton-img" />
              <div className="cart-skeleton-details">
                <div className="cart-skeleton-line title" />
                <div className="cart-skeleton-line price" />
              </div>
              <div className="cart-skeleton-quantity" />
            </div>
            <div className="cart-skeleton-item">
              <div className="cart-skeleton-img" />
              <div className="cart-skeleton-details">
                <div className="cart-skeleton-line title" />
                <div className="cart-skeleton-line price" />
              </div>
              <div className="cart-skeleton-quantity" />
            </div>
            <div className="cart-skeleton-item">
              <div className="cart-skeleton-img" />
              <div className="cart-skeleton-details">
                <div className="cart-skeleton-line title" />
                <div className="cart-skeleton-line price" />
              </div>
              <div className="cart-skeleton-quantity" />
            </div>
          </div>
          <div className="cart-empty-msg">
            <p>Your cart is empty.</p>
            <span className="cart-submsg">Items you add will appear here</span>
          </div>
        </div>
        <div className="cart-footer">
          <button className="cart-checkout-btn" onClick={() => setCartOpen(false)}>Checkout</button>
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
            <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label="View cart">
              <span className="cart-text">My cart (0)</span>
              <svg className="mobile-cart-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
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
                onKeyDown={(e) => handleNavKeyDown(e, panel)}
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
                <li><a href="#">Luxury Lash Strip</a></li>
                <li><a href="#">Premium Stick-on Nails</a></li>
                <li><a href="#">Precision Applicator</a></li>
                <li><a href="#">Cleansing Ritual Duo</a></li>
              </ul>
            </div>
            {promo('/landing/product-grid-3col.webp', '7% 30%', undefined, 'A GlamD signature — Luxury Lash Strip')}
            {promo('/landing/product-grid-3col.webp', '50% 30%', undefined, 'Premium Stick-on Nail Set')}
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
            {promo('/landing/story-rows.webp', '6% 10%', '215% auto', 'The Science of Curl — engineered for 24-hour hold')}
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
            {promo('/landing/product-grid-3col.webp', '50% 30%', undefined, 'Premium Stick-on Nail Set — symmetrical, high-gloss')}
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
            {promo('/landing/hero-lash-application.webp', '100% 50%', '205% auto', 'The application, perfected')}
            <div />
          </div>
        </div>
      </header>
      <MobileTabBar 
        onMenuClick={() => setDrawerOpen(true)} 
        onCartClick={() => setCartOpen(true)} 
      />
    </>
  );
}
