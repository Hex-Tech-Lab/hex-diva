'use client';

import { useState } from 'react';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="annbar">
      Free delivery on orders over EGP 2,000.{' '}
      <a href="#" style={{ fontSize: '0.8em', opacity: 0.85, textDecoration: 'underline', marginLeft: '4px' }}>*Conditions apply</a>
      <button className="ann-close" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        ✕
      </button>
    </div>
  );
}
