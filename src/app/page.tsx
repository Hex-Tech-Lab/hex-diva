import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { HeroCarousel } from '@/components/landing/HeroCarousel';
import { NewsletterForm } from '@/components/landing/NewsletterForm';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { CommitmentIcons } from '@/components/landing/CommitmentIcons';
import { ShopLink } from '@/components/ShopLink';
import { getStorefrontCatalogPort } from '@/lib/adapters/ShopifyCatalogAdapter';

/**
 * Art-directed fallback tiles — used only when the Shopify Storefront API
 * isn't configured, or a collection has no products yet, so the landing
 * page never renders as blank. Whenever real catalog data is available for
 * a collection, its title/price/image below are replaced with the actual
 * Shopify product (see getFeaturedCategoryProducts()).
 */
const CATEGORY_FALLBACKS = [
  { name: 'Luxury Lash Strip', price: 'Price: $39', src: '/landing/eye_lashes_cat.png', collectionHandle: 'lashes' },
  { name: 'Premium Stick-on Nails', price: 'Price: $20.00', src: '/landing/nails_cat.png', collectionHandle: 'nails' },
  { name: 'Precision Applicator', price: 'Price: $20', src: '/landing/accessories_cat.png', collectionHandle: 'accessories' },
];

function formatPrice(amount: string, currencyCode: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return `Price: ${amount} ${currencyCode}`;
  return `Price: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value)}`;
}

/** Best-effort: one real featured product per storefront collection, falling back per-tile. */
async function getFeaturedCategoryProducts() {
  const catalog = getStorefrontCatalogPort();
  if (!catalog.isConfigured()) return CATEGORY_FALLBACKS;

  const results = await Promise.all(
    CATEGORY_FALLBACKS.map(async (fallback) => {
      try {
        const collection = await catalog.getCollectionByHandle(fallback.collectionHandle, 1);
        const product = collection?.products[0];
        if (!product) return fallback;
        return {
          name: product.title,
          price: formatPrice(product.minPrice.amount, product.minPrice.currencyCode),
          src: product.featuredImage?.url ?? fallback.src,
          collectionHandle: fallback.collectionHandle,
        };
      } catch {
        return fallback;
      }
    })
  );
  return results;
}

const STORIES = [
  { title: 'The Science of Curl', copy: 'Engineered for flexibility and 24-hour hold.', src: '/landing/eye-lashes.png', rev: false },
  { title: 'Our Community', copy: 'Real results from real users. Join the #GlowUp', position: '95% 50%', size: '220% auto', rev: true },
  { title: 'Global Delivery', copy: 'Fast, secure shipping to over 200 countries. Arriving from Cairo.', position: '6% 92%', rev: false },
];

const TESTIMONIAL_LEFT = {
  quote: (
    <>
      These lashes last<br />
      6 weeks and look<br />
      so natural. Worth<br />
      every penny.
    </>
  ),
  who: 'Farida A., Cairo',
  src: '/landing/avatar-farida.jpg',
  rating: '5',
};

const TESTIMONIAL_RIGHT = {
  quote: (
    <>
      The stick-on nails<br />
      are a game-changer!<br />
      Symmetrical and<br />
      high-gloss.
    </>
  ),
  who: 'Sarah J., London',
  src: '/landing/avatar-sarah.jpg',
  rating: '4.9',
};

function Testimonial({ quote, who, src, rating }: { quote: React.ReactNode; who: string; src: string; rating: string }) {
  return (
    <div className="tq">
      <span className="qmark">“</span>
      <blockquote>{quote}</blockquote>
      <div className="who">
        <div className="ava" style={{ backgroundImage: `url(${src})` }} />
        <div>
          {who}
          <small>Verified buyer</small>
          <span className="stars">
            {rating === '5' ? (
              '★★★★★'
            ) : (
              <>
                ★★★★<span className="star-dim">★</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const PRODUCTS = await getFeaturedCategoryProducts();
  return (
    <div className="glamd-page">
      <div className="site-header-wrapper">
        <AnnouncementBar />
        <SiteHeader />
      </div>
      <HeroCarousel />

      <section className="band" id="commit">
        <CommitmentIcons />
      </section>

      <section className="band" id="collections">
        <div className="wrap">
          <h2 className="sec-title">Remarkable, recently added</h2>
          <p className="sec-sub">A curation of proven favourites and new arrivals — each promising to delight.</p>
          <div className="pgrid">
            {PRODUCTS.map(({ name, price, src, collectionHandle }) => (
              <ShopLink className="pcard" key={name} path={`/collections/${collectionHandle}`}>
                <div className="frame">
                  <div className="photo" style={{ backgroundImage: `url(${src})` }} />
                </div>
                <h3>{name}</h3>
                <div className="meta">
                  <span>{price}</span>
                  <span>
                    4.9 <span className="star">★</span>
                  </span>
                </div>
              </ShopLink>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          {STORIES.map(({ title, copy, src, position, size, rev }) => (
            <div className={`story${rev ? ' rev' : ''}`} key={title}>
              <div
                className="img"
                style={{
                  backgroundImage: src ? `url(${src})` : undefined,
                  backgroundPosition: src ? 'center' : position,
                  backgroundSize: src ? 'cover' : size,
                }}
              />
              <div>
                <h3 className="serif">{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="band testi-band">
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
