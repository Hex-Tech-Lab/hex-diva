import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getStorefrontCatalogPort, ShopifyNotConfiguredError } from '@/lib/adapters/ShopifyCatalogAdapter';
import { StorefrontNotConfigured } from '@/components/shop/StorefrontNotConfigured';
import { BuyOnShopifyLink } from '@/components/shop/BuyOnShopifyLink';

function formatPrice(amount: string, currencyCode: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currencyCode}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value);
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `${handle} | GlamD` };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const catalog = getStorefrontCatalogPort();

  let product;
  try {
    product = await catalog.getProductByHandle(handle);
  } catch (error) {
    if (error instanceof ShopifyNotConfiguredError) {
      return <StorefrontNotConfigured context="this product" />;
    }
    throw error;
  }

  if (!product) notFound();

  const price = formatPrice(product.minPrice.amount, product.minPrice.currencyCode);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        {product.images.length > 0 ? (
          product.images.map((image, i) => (
            <div key={image.url} className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 ${i === 0 ? 'col-span-2' : ''}`}>
              <Image
                src={image.url}
                alt={image.altText ?? product.title}
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ))
        ) : (
          <div className="col-span-2 aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-charcoal-900">{product.title}</h1>
        <p className="mt-2 text-xl text-gray-700">{price}</p>

        {!product.availableForSale && (
          <p className="mt-2 inline-block rounded bg-charcoal-900 px-2 py-1 text-xs text-white">Sold out</p>
        )}

        {product.descriptionHtml && (
          <div
            className="mt-6 prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        )}

        <BuyOnShopifyLink path={`/products/${product.handle}`}>Buy on GlamD Shop</BuyOnShopifyLink>

        {product.variants.length > 0 && (
          <ul className="mt-8 text-sm text-gray-500 space-y-1">
            {product.variants.map((variant) => (
              <li key={variant.id}>
                {variant.title} — {variant.availableForSale ? 'In stock' : 'Sold out'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
