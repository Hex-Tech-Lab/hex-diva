import { Icon } from '@iconify/react';
import truckThin from '@iconify-icons/ph/truck-thin';
import lockSimpleThin from '@iconify-icons/ph/lock-simple-thin';
import sparkleThin from '@iconify-icons/ph/sparkle-thin';
import giftThin from '@iconify-icons/ph/gift-thin';
import instagram from '@iconify-icons/mdi/instagram';
import facebook from '@iconify-icons/mdi/facebook';
import youtube from '@iconify-icons/mdi/youtube';
import baselineTiktok from '@iconify-icons/ic/baseline-tiktok';
import { NewsletterForm } from './NewsletterForm';

const SERVICES = [
  { icon: truckThin, label: 'Complimentary Delivery', sub: 'On orders over EGP 2,000' },
  { icon: lockSimpleThin, label: 'Secure Payment', sub: 'Encrypted at every step' },
  { icon: sparkleThin, label: 'Free Samples', sub: 'With every ritual' },
  { icon: giftThin, label: 'Gift Wrapping', sub: 'Tied with a ribbon' },
];

const SOCIAL = [
  { icon: instagram, label: 'Instagram' },
  { icon: baselineTiktok, label: 'TikTok' },
  { icon: facebook, label: 'Facebook' },
  { icon: youtube, label: 'YouTube' },
];

const LINKS: { title: string; items: string[] }[] = [
  {
    title: 'Orders & Support',
    items: ['Contact us', 'Order tracking', 'Order history', 'Shipping & Delivery', 'Returns & Exchanges', 'FAQ'],
  },
  {
    title: 'About',
    items: ['Our story', 'The ritual', 'B2B Wholesale', 'Affiliate programme', 'Careers'],
  },
  {
    title: 'Legal',
    items: ['Terms & Conditions', 'Privacy Policy', 'Shipping & Delivery Policy', 'Cookie Policy', 'EU Consumer Rights (ODR)', 'Imprint'],
  },
];

export function LandingFooter() {
  return (
    <footer className="glamd-footer">
      <div className="ft-services">
        {SERVICES.map(({ icon, label, sub }) => (
          <div key={label}>
            <Icon icon={icon} className="iconify" />
            <div className="svc-copy">
              <span>{label}</span>
              <small>{sub}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="ft-main">
        <div className="ft-news">
          <h4>Subscribe</h4>
          <p>
            Sign up to receive communications about GlamD collections, rituals and events — quietly,
            and only when it matters.
          </p>
          <NewsletterForm placeholder="Email address" />
          <div className="ft-social">
            {SOCIAL.map(({ icon, label }) => (
              <a href="#" aria-label={label} key={label}>
                <Icon icon={icon} className="iconify" />
              </a>
            ))}
          </div>
        </div>
        {LINKS.map(({ title, items }) => (
          <div key={title}>
            <h4>{title}</h4>
            <ul>
              {items.map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="ft-bottom">
        <div className="row">
          <span>© 2026 GlamD (Hex-Diva). All rights reserved.</span>
          <nav aria-label="Legal">
            <a href="#">General Terms &amp; Conditions</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Contact us</a>
            <a href="#">Sitemap</a>
            <a href="#">Cookie settings</a>
          </nav>
          <select className="ft-lang" aria-label="Language and region" defaultValue="EGP – Egypt (EN)">
            <option>EGP – Egypt (EN)</option>
            <option>EGP – مصر (AR)</option>
          </select>
        </div>
        <p className="ft-disclaimer">*14-day returns subject to Terms &amp; Conditions.</p>
      </div>
    </footer>
  );
}
