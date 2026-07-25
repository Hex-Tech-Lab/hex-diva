/**
 * Shopify Storefront Catalog Adapter (Wave 2 Shop Pages)
 * Implements IStorefrontCatalogPort against Shopify's Storefront GraphQL API.
 *
 * Query shapes verified against the live Storefront GraphQL schema (API
 * version 2026-04) via the shopify-dev-mcp `validate_graphql_codeblocks`
 * tool on 2026-07-25 — field names are not guessed.
 *
 * Env requirements (see .env.example):
 *   SHOPIFY_SHOP_NAME                 e.g. "glamd-store" (the *.myshopify.com subdomain)
 *   SHOPIFY_STOREFRONT_ACCESS_TOKEN   Storefront API public access token
 *   SHOPIFY_API_VERSION               optional, defaults to STOREFRONT_API_VERSION below
 *
 * These are unset in this environment (Shopify app not fully installed yet —
 * see .env.local placeholders), so every method below fails closed: it
 * throws ShopifyNotConfiguredError rather than silently returning fake data.
 * Callers (the shop pages) catch that and render an explicit
 * "storefront not connected" state instead of fabricated products.
 */

import type {
  IStorefrontCatalogPort,
  StorefrontCollectionDetail,
  StorefrontCollectionSummary,
  StorefrontImage,
  StorefrontProductDetail,
  StorefrontProductPage,
  StorefrontProductSummary,
} from '@/lib/ports'

const STOREFRONT_API_VERSION = '2026-04'
const DEFAULT_PRODUCTS_PAGE_SIZE = 20
const DEFAULT_COLLECTIONS_PAGE_SIZE = 20
const DEFAULT_COLLECTION_PRODUCTS_PAGE_SIZE = 20
const DEFAULT_PRODUCT_IMAGES = 10
const DEFAULT_PRODUCT_VARIANTS = 20

/** Raised when required Shopify Storefront credentials are missing/unset placeholders. */
export class ShopifyNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Shopify Storefront API is not configured — missing/placeholder env: ${missing.join(', ')}`)
    this.name = 'ShopifyNotConfiguredError'
  }
}

/** Raised when the Storefront API responds with GraphQL errors. */
export class ShopifyGraphQLError extends Error {
  constructor(errors: unknown) {
    super(`Shopify Storefront GraphQL error: ${JSON.stringify(errors)}`)
    this.name = 'ShopifyGraphQLError'
  }
}

// ---------------------------------------------------------------------------
// GraphQL documents (validated against live schema — see header note)
// ---------------------------------------------------------------------------

const PRODUCT_SUMMARY_FRAGMENT = /* GraphQL */ `
  fragment ProductSummaryFields on Product {
    id
    title
    handle
    description
    availableForSale
    featuredImage { url altText }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
  }
`

const PRODUCTS_LIST_QUERY = /* GraphQL */ `
  ${PRODUCT_SUMMARY_FRAGMENT}
  query ProductsList($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node { ...ProductSummaryFields }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${PRODUCT_SUMMARY_FRAGMENT}
  query ProductByHandle($handle: String!, $imagesFirst: Int!, $variantsFirst: Int!) {
    product(handle: $handle) {
      ...ProductSummaryFields
      descriptionHtml
      images(first: $imagesFirst) {
        edges { node { url altText } }
      }
      variants(first: $variantsFirst) {
        edges {
          node {
            id
            title
            availableForSale
            quantityAvailable
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`

const COLLECTIONS_LIST_QUERY = /* GraphQL */ `
  query CollectionsList($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          image { url altText }
        }
      }
    }
  }
`

const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  ${PRODUCT_SUMMARY_FRAGMENT}
  query CollectionByHandle($handle: String!, $productsFirst: Int!) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      image { url altText }
      products(first: $productsFirst) {
        edges { node { ...ProductSummaryFields } }
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Wire shapes (subset of Storefront API response actually consumed)
// ---------------------------------------------------------------------------

interface WireImage {
  url: string
  altText: string | null
}

interface WireMoney {
  amount: string
  currencyCode: string
}

interface WireProductSummary {
  id: string
  title: string
  handle: string
  description: string
  availableForSale: boolean
  featuredImage: WireImage | null
  priceRange: {
    minVariantPrice: WireMoney
    maxVariantPrice: WireMoney
  }
}

interface WireProductDetail extends WireProductSummary {
  descriptionHtml: string
  images: { edges: Array<{ node: WireImage }> }
  variants: {
    edges: Array<{
      node: {
        id: string
        title: string
        availableForSale: boolean
        quantityAvailable: number | null
        price: WireMoney
        selectedOptions: Array<{ name: string; value: string }>
      }
    }>
  }
}

interface WireCollectionSummary {
  id: string
  title: string
  handle: string
  description: string
  image: WireImage | null
}

interface WireCollectionDetail extends WireCollectionSummary {
  products: { edges: Array<{ node: WireProductSummary }> }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapImage(image: WireImage | null): StorefrontImage | null {
  return image ? { url: image.url, altText: image.altText } : null
}

function mapProductSummary(node: WireProductSummary): StorefrontProductSummary {
  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    featuredImage: mapImage(node.featuredImage),
    minPrice: node.priceRange.minVariantPrice,
    maxPrice: node.priceRange.maxVariantPrice,
    availableForSale: node.availableForSale,
  }
}

function mapProductDetail(node: WireProductDetail): StorefrontProductDetail {
  return {
    ...mapProductSummary(node),
    descriptionHtml: node.descriptionHtml,
    images: node.images.edges.map((edge) => mapImage(edge.node)).filter((img): img is StorefrontImage => img !== null),
    variants: node.variants.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      availableForSale: edge.node.availableForSale,
      quantityAvailable: edge.node.quantityAvailable,
      price: edge.node.price,
      selectedOptions: edge.node.selectedOptions,
    })),
  }
}

function mapCollectionSummary(node: WireCollectionSummary): StorefrontCollectionSummary {
  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    image: mapImage(node.image),
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class ShopifyCatalogAdapter implements IStorefrontCatalogPort {
  private readonly shopName: string | undefined
  private readonly accessToken: string | undefined
  private readonly apiVersion: string

  constructor() {
    this.shopName = ShopifyCatalogAdapter.readEnv('SHOPIFY_SHOP_NAME')
    this.accessToken = ShopifyCatalogAdapter.readEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN')
    this.apiVersion = ShopifyCatalogAdapter.readEnv('SHOPIFY_API_VERSION') ?? STOREFRONT_API_VERSION
  }

  /** Treats unset AND unfilled `.env.example` placeholder values as absent. */
  private static readEnv(key: string): string | undefined {
    const value = process.env[key]
    if (!value) return undefined
    if (value.startsWith('your_') && value.endsWith('_here')) return undefined
    return value
  }

  /** True when both required credentials are present and real (not placeholders). */
  isConfigured(): boolean {
    return Boolean(this.shopName && this.accessToken)
  }

  /** Returns validated, non-optional credentials or throws ShopifyNotConfiguredError. */
  private requireCredentials(): { shopName: string; accessToken: string } {
    const { shopName, accessToken } = this
    if (shopName && accessToken) return { shopName, accessToken }

    const missing: string[] = []
    if (!shopName) missing.push('SHOPIFY_SHOP_NAME')
    if (!accessToken) missing.push('SHOPIFY_STOREFRONT_ACCESS_TOKEN')
    throw new ShopifyNotConfiguredError(missing)
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const { shopName, accessToken } = this.requireCredentials()

    const endpoint = `https://${shopName}.myshopify.com/api/${this.apiVersion}/graphql.json`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
      // Product/collection data changes infrequently; revalidate every 5 min.
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new ShopifyGraphQLError(`HTTP ${response.status} ${response.statusText}`)
    }

    const json = (await response.json()) as { data?: T; errors?: unknown }
    if (json.errors) throw new ShopifyGraphQLError(json.errors)
    if (!json.data) throw new ShopifyGraphQLError('empty data payload')
    return json.data
  }

  async listProducts(
    first: number = DEFAULT_PRODUCTS_PAGE_SIZE,
    after: string | null = null
  ): Promise<StorefrontProductPage> {
    const data = await this.request<{
      products: {
        edges: Array<{ node: WireProductSummary }>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }
    }>(PRODUCTS_LIST_QUERY, { first, after })

    return {
      products: data.products.edges.map((edge) => mapProductSummary(edge.node)),
      hasNextPage: data.products.pageInfo.hasNextPage,
      endCursor: data.products.pageInfo.endCursor,
    }
  }

  async getProductByHandle(handle: string): Promise<StorefrontProductDetail | null> {
    const data = await this.request<{ product: WireProductDetail | null }>(PRODUCT_BY_HANDLE_QUERY, {
      handle,
      imagesFirst: DEFAULT_PRODUCT_IMAGES,
      variantsFirst: DEFAULT_PRODUCT_VARIANTS,
    })

    return data.product ? mapProductDetail(data.product) : null
  }

  async listCollections(first: number = DEFAULT_COLLECTIONS_PAGE_SIZE): Promise<StorefrontCollectionSummary[]> {
    const data = await this.request<{ collections: { edges: Array<{ node: WireCollectionSummary }> } }>(
      COLLECTIONS_LIST_QUERY,
      { first }
    )

    return data.collections.edges.map((edge) => mapCollectionSummary(edge.node))
  }

  async getCollectionByHandle(
    handle: string,
    productsFirst: number = DEFAULT_COLLECTION_PRODUCTS_PAGE_SIZE
  ): Promise<StorefrontCollectionDetail | null> {
    const data = await this.request<{ collection: WireCollectionDetail | null }>(COLLECTION_BY_HANDLE_QUERY, {
      handle,
      productsFirst,
    })

    if (!data.collection) return null

    return {
      ...mapCollectionSummary(data.collection),
      products: data.collection.products.edges.map((edge) => mapProductSummary(edge.node)),
    }
  }
}

let singleton: ShopifyCatalogAdapter | null = null

/** Process-wide singleton accessor (stateless client, safe to share — no per-request auth context). */
export function getStorefrontCatalogPort(): ShopifyCatalogAdapter {
  if (!singleton) singleton = new ShopifyCatalogAdapter()
  return singleton
}
