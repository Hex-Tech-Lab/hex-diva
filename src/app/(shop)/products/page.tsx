import { getStorefrontCatalogPort, ShopifyNotConfiguredError } from '@/lib/adapters/ShopifyCatalogAdapter';
import { StorefrontNotConfigured } from '@/components/shop/StorefrontNotConfigured';
import { ProductCard } from '@/components/shop/ProductCard';

const PAGE_SIZE = 24;

export const metadata = { title: 'All Products | GlamD' };

export default async function ProductsPage() {
  const catalog = getStorefrontCatalogPort();

  try {
    const { products } = await catalog.listProducts(PAGE_SIZE);

    if (products.length === 0) {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-2xl font-bold text-charcoal-900 mb-3">No products yet</h1>
          <p className="text-gray-600">Check back soon — the catalog is being stocked.</p>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-charcoal-900 mb-8">All Products</h1>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof ShopifyNotConfiguredError) {
      return <StorefrontNotConfigured context="the product catalog" />;
    }
    throw error;
  }
}
