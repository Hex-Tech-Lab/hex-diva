import Link from 'next/link';
import Image from 'next/image';
import type { StorefrontProductSummary } from '@/lib/ports';

function formatPrice(amount: string, currencyCode: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currencyCode}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value);
}

export function ProductCard({ product }: { product: StorefrontProductSummary }) {
  const price = formatPrice(product.minPrice.amount, product.minPrice.currencyCode);
  const priceRangeLabel =
    product.minPrice.amount !== product.maxPrice.amount
      ? `${price} – ${formatPrice(product.maxPrice.amount, product.maxPrice.currencyCode)}`
      : price;

  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {product.featuredImage ? (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
        )}
        {!product.availableForSale && (
          <span className="absolute top-2 left-2 rounded bg-charcoal-900 px-2 py-1 text-xs text-white">
            Sold out
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-medium text-charcoal-900">{product.title}</h3>
      <p className="text-sm text-gray-600">{priceRangeLabel}</p>
    </Link>
  );
}
