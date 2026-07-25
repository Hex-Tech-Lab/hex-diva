/**
 * Storefront Catalog Port (Hexagonal Architecture — Wave 2 Shop Pages)
 *
 * Domain-facing contract for READ access to the live Shopify storefront
 * catalog (products/collections as sold, priced, and stocked in Shopify).
 *
 * This is intentionally separate from `ICatalogRepository` /
 * `SupabaseCatalogAdapter`, which model the internal B2B roster (GLMD-*
 * SKUs, EGP + tiered b2b_bronze/silver/gold pricing) persisted in
 * `public.products`. Shopify's Storefront API has no concept of those
 * B2B tiers, so forcing its response shape through that stricter contract
 * would be lossy and incorrect. Concrete implementation lives in
 * src/lib/adapters/ShopifyCatalogAdapter.ts.
 */

export interface StorefrontMoney {
  amount: string
  currencyCode: string
}

export interface StorefrontImage {
  url: string
  altText: string | null
}

export interface StorefrontVariant {
  id: string
  title: string
  availableForSale: boolean
  quantityAvailable: number | null
  price: StorefrontMoney
  selectedOptions: Array<{ name: string; value: string }>
}

export interface StorefrontProductSummary {
  id: string
  title: string
  handle: string
  description: string
  featuredImage: StorefrontImage | null
  minPrice: StorefrontMoney
  maxPrice: StorefrontMoney
  availableForSale: boolean
}

export interface StorefrontProductDetail extends StorefrontProductSummary {
  descriptionHtml: string
  images: StorefrontImage[]
  variants: StorefrontVariant[]
}

export interface StorefrontCollectionSummary {
  id: string
  title: string
  handle: string
  description: string
  image: StorefrontImage | null
}

export interface StorefrontCollectionDetail extends StorefrontCollectionSummary {
  products: StorefrontProductSummary[]
}

export interface StorefrontProductPage {
  products: StorefrontProductSummary[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface IStorefrontCatalogPort {
  /** List products, paginated by cursor. */
  listProducts(first: number, after?: string | null): Promise<StorefrontProductPage>

  /** Fetch a single product by its URL handle; null when not found. */
  getProductByHandle(handle: string): Promise<StorefrontProductDetail | null>

  /** List all storefront collections. */
  listCollections(first?: number): Promise<StorefrontCollectionSummary[]>

  /** Fetch a single collection (with its products) by URL handle; null when not found. */
  getCollectionByHandle(handle: string, productsFirst?: number): Promise<StorefrontCollectionDetail | null>
}
