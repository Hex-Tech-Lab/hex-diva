'use client';

import { useState } from 'react';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="annbar">
      Complimentary delivery on orders over EGP 2,000 — luxury packaging included.{' '}
      <a href="#">*Conditions apply</a>
      <button className="ann-close" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        ✕
      </button>
    </div>
  );
}
