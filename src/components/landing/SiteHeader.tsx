'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import themeLightDark from '@iconify-icons/mdi/theme-light-dark';
import magnify from '@iconify-icons/mdi/magnify';

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

  return (
    <header className={`site-header${solid ? ' solid' : ''}`} onMouseLeave={scheduleClose}>
      <div className="hdr-util">
        <div className="hdr-util-left">
          <button onClick={toggleTheme} aria-label="Toggle theme">
            <Icon icon={themeLightDark} className="iconify" /> Theme
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
          <a href="#">My cart (0)</a>
        </div>
      </div>
      <nav className="hdr-nav" aria-label="Main Navigation">
        {NAV.map(({ label, panel }) => (
          <div className="nav-item" key={label}>
            <button
              aria-expanded={panel ? openPanel === panel : undefined}
              onMouseEnter={() => open(panel ?? null)}
              onFocus={() => open(panel ?? null)}
            >
              {label}
            </button>
          </div>
        ))}
        <div className="nav-item">
          <button onMouseEnter={() => open(null)}>
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
  );
}
