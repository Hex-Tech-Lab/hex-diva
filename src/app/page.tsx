import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { HeroCarousel } from '@/components/landing/HeroCarousel';
import { NewsletterForm } from '@/components/landing/NewsletterForm';
import { LandingFooter } from '@/components/landing/LandingFooter';

/* Icons cropped from the GlamD brand sample board (Gemini 60mi1x) — exact graphics per brand direction */
const COMMITMENTS = [
  { src: '/landing/icon-premium-grade.webp', title: ['Premium', 'Grade'] },
  { src: '/landing/icon-authentic-seal.webp', title: ['Authentic', 'Certification'] },
  { src: '/landing/icon-ethical-sparkle.webp', title: ['Ethically', 'Sourced'] },
  { src: '/landing/icon-returns-rings.webp', title: ['14-Day', 'Returns*'] },
];

const PRODUCTS = [
  { name: 'Luxury Lash Strip', price: 'Price: $39', position: '7% 30%' },
  { name: 'Premium Stick-on Nails', price: 'Price: $20.00', position: '50% 30%' },
  { name: 'Precision Applicator', price: 'Price: $20', position: '93% 30%' },
];

const STORIES = [
  { title: 'The Science of Curl', copy: 'Engineered for flexibility and 24-hour hold.', position: '6% 10%', rev: false },
  { title: 'Our Community', copy: 'Real results from real users. Join the #GlowUp', position: '95% 50%', size: '220% auto', rev: true },
  { title: 'Global Delivery', copy: 'Fast, secure shipping to over 200 countries. Arriving from Cairo.', position: '6% 92%', rev: false },
];

const TESTIMONIAL_LEFT = {
  quote: 'These lashes last 6 weeks and look so natural. Worth every penny.',
  who: 'Farida A., Cairo',
  position: '15% 78%',
};

const TESTIMONIAL_RIGHT = {
  quote: 'The stick-on nails are a game-changer! Symmetrical and high-gloss.',
  who: 'Sarah J., London',
  position: '63% 78%',
};

function Testimonial({ quote, who, position }: { quote: string; who: string; position: string }) {
  return (
    <div className="tq">
      <span className="qmark">“</span>
      <blockquote>{quote}</blockquote>
      <div className="who">
        <div className="ava" style={{ backgroundPosition: position }} />
        <div>
          {who}
          <small>Verified buyer</small>
          <span className="stars">★★★★★</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="glamd-page">
      <AnnouncementBar />
      <SiteHeader />
      <HeroCarousel />

      <section className="band" id="commit">
        <div className="wrap commitments">
          {COMMITMENTS.map(({ src, title }) => (
            <div key={title.join(' ')}>
              <span className="cicon">
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative brand line art, unoptimized by design */}
                <img src={src} alt="" loading="lazy" />
              </span>
              <h3 className="serif">
                {title[0]}
                <br />
                {title[1]}
              </h3>
            </div>
          ))}
        </div>
        <p className="commit-note">*14-day returns subject to Terms &amp; Conditions.</p>
      </section>

      <section className="band" id="collections">
        <div className="wrap">
          <h2 className="sec-title">Remarkable, recently added</h2>
          <p className="sec-sub">A curation of proven favourites and new arrivals — each promising to delight.</p>
          <div className="pgrid">
            {PRODUCTS.map(({ name, price, position }) => (
              <div className="pcard" key={name}>
                <div className="frame">
                  <div className="photo" style={{ backgroundPosition: position }} />
                </div>
                <h3>{name}</h3>
                <div className="meta">
                  <span>{price}</span>
                  <span>
                    4.9 <span className="star">★</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          {STORIES.map(({ title, copy, position, size, rev }) => (
            <div className={`story${rev ? ' rev' : ''}`} key={title}>
              <div
                className="img"
                style={{ backgroundPosition: position, ...(size ? { backgroundSize: size } : {}) }}
              />
              <div>
                <h3 className="serif">{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="wrap testis">
          <Testimonial {...TESTIMONIAL_LEFT} />
          <div className="cross-divider" />
          <Testimonial {...TESTIMONIAL_RIGHT} />
        </div>
        <a className="see-more" href="#">
          See more reviews →
        </a>
      </section>

      <section className="band joinband" id="join">
        <h2>Join the Glow</h2>
        <NewsletterForm className="joinform" />
      </section>

      <LandingFooter />
    </div>
  );
}
