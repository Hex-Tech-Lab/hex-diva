import { notFound } from 'next/navigation';
import { getStorefrontCatalogPort, ShopifyNotConfiguredError } from '@/lib/adapters/ShopifyCatalogAdapter';
import { StorefrontNotConfigured } from '@/components/shop/StorefrontNotConfigured';
import { ProductCard } from '@/components/shop/ProductCard';

const COLLECTION_PRODUCTS_PAGE_SIZE = 48;

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `${handle} | GlamD` };
}

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const catalog = getStorefrontCatalogPort();

  let collection;
  try {
    collection = await catalog.getCollectionByHandle(handle, COLLECTION_PRODUCTS_PAGE_SIZE);
  } catch (error) {
    if (error instanceof ShopifyNotConfiguredError) {
      return <StorefrontNotConfigured context="this collection" />;
    }
    throw error;
  }

  if (!collection) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-charcoal-900">{collection.title}</h1>
      {collection.description && <p className="mt-2 max-w-2xl text-gray-600">{collection.description}</p>}

      {collection.products.length === 0 ? (
        <p className="mt-12 text-gray-500">No products in this collection yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {collection.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
