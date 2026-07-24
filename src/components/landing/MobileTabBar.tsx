'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import homeOutline from '@iconify-icons/mdi/home-outline';
import magnify from '@iconify-icons/mdi/magnify';
import storeOutline from '@iconify-icons/mdi/store-outline';
import cartOutline from '@iconify-icons/mdi/cart-outline';
import accountOutline from '@iconify-icons/mdi/account-outline';
import { shopLinkProps } from '@/lib/shopify-storefront';

export function MobileTabBar({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const [scrollState, setScrollState] = useState<'hidden' | 'icons-only' | 'full'>('hidden');

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y < 50) {
        setScrollState('hidden');
      } else if (y >= 50 && y < 300) {
        setScrollState('icons-only');
      } else {
        setScrollState('full');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check immediately on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`mobile-tab-bar tab-bar-${scrollState}`} aria-label="Mobile Navigation">
      <a href="/" className="tab-btn active">
        <Icon icon={homeOutline} className="iconify" />
        <span>Home</span>
      </a>
      <button className="tab-btn" onClick={onMenuClick}>
        <Icon icon={magnify} className="iconify" />
        <span>Search</span>
      </button>
      <a {...shopLinkProps('/collections/all')} className="tab-btn">
        <Icon icon={storeOutline} className="iconify" />
        <span>Shop</span>
      </a>
      <a {...shopLinkProps('/cart')} className="tab-btn">
        <Icon icon={cartOutline} className="iconify" />
        <span>Cart</span>
      </a>
      <button className="tab-btn" onClick={onMenuClick}>
        <Icon icon={accountOutline} className="iconify" />
        <span>Account</span>
      </button>
    </nav>
  );
}
