'use client';

import { Icon } from '@iconify/react';
import homeOutline from '@iconify-icons/mdi/home-outline';
import magnify from '@iconify-icons/mdi/magnify';
import storeOutline from '@iconify-icons/mdi/store-outline';
import heartOutline from '@iconify-icons/mdi/heart-outline';
import accountOutline from '@iconify-icons/mdi/account-outline';

export function MobileTabBar({
  onMenuClick,
  onCartClick,
}: {
  onMenuClick?: () => void;
  onCartClick?: () => void;
}) {
  return (
    <div className="mobile-tab-bar">
      <a href="#" className="tab-btn active">
        <Icon icon={homeOutline} className="iconify" />
        <span>Home</span>
      </a>
      <button className="tab-btn" onClick={onMenuClick}>
        <Icon icon={magnify} className="iconify" />
        <span>Search</span>
      </button>
      <button className="tab-btn" onClick={onMenuClick}>
        <Icon icon={storeOutline} className="iconify" />
        <span>Shop</span>
      </button>
      <button className="tab-btn" onClick={onCartClick}>
        <Icon icon={heartOutline} className="iconify" />
        <span>Wishlist</span>
      </button>
      <button className="tab-btn" onClick={onMenuClick}>
        <Icon icon={accountOutline} className="iconify" />
        <span>Account</span>
      </button>
    </div>
  );
}
