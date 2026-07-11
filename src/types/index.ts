/**
 * Core user data from authentication system
 * @property id - Unique user identifier from Supabase auth
 * @property email - User's email address
 * @property displayName - User's public display name
 * @property avatar - Optional profile picture URL
 * @property createdAt - User account creation timestamp
 * @property updatedAt - Last profile modification timestamp
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended user profile with tier and referral information
 * @property tier - User account type (b2c=consumer, b2b=wholesale)
 * @property referralCode - Unique code for affiliate referrals
 * @property phone - Optional phone number
 * @property bio - Optional user biography
 */
export interface UserProfile extends User {
  tier: 'b2c' | 'b2b';
  referralCode: string;
  phone?: string;
  bio?: string;
}

/**
 * Product in catalog synced from Shopify
 * @property id - Hex-Diva database ID
 * @property shopifyId - Shopify product identifier for sync
 * @property name - Product display name
 * @property description - Full product description
 * @property price - Current selling price
 * @property originalPrice - MSRP or original list price
 * @property image - Primary product image URL
 * @property images - Array of additional product images
 * @property category - Product category/collection
 * @property brand - Manufacturer or brand name
 * @property rating - Average customer rating (0-5)
 * @property reviewCount - Number of customer reviews
 * @property sku - Stock keeping unit
 * @property inStock - Whether product is in inventory
 * @property inventory - Current stock count
 * @property tags - Product tags for search/filtering
 * @property createdAt - Product creation timestamp
 * @property updatedAt - Last product sync or edit timestamp
 */
export interface Product {
  id: string;
  shopifyId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  sku: string;
  inStock: boolean;
  inventory: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer order record with full fulfillment details
 * @property id - Unique order identifier
 * @property userId - ID of user who placed order
 * @property items - Array of line items in order
 * @property status - Order fulfillment status
 * @property subtotal - Order subtotal before tax/shipping
 * @property tax - Calculated tax amount
 * @property shipping - Shipping cost
 * @property total - Final order total
 * @property shippingAddress - Delivery address
 * @property billingAddress - Payment address
 * @property paymentMethod - Payment processor used
 * @property notes - Optional customer order notes
 * @property createdAt - Order creation timestamp
 * @property updatedAt - Last order modification timestamp
 */
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Line item in an order
 * @property id - Order item identifier
 * @property productId - Reference to product
 * @property quantity - Number of units
 * @property price - Per-unit price at time of order
 * @property total - Quantity × price
 */
export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

/**
 * Item in user's shopping cart
 * @property productId - Reference to product
 * @property quantity - Number of units in cart
 * @property product - Optional cached product details
 */
export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

/**
 * Shopping cart totals and line items
 * @property items - Array of cart items
 * @property subtotal - Sum of item prices before tax/shipping
 * @property tax - Calculated tax
 * @property shipping - Calculated shipping cost
 * @property total - Final cart total
 */
export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

/**
 * Shipping or billing address
 * @property id - Optional address record ID
 * @property fullName - Recipient name
 * @property email - Contact email
 * @property phone - Contact phone number
 * @property street - Street address
 * @property city - City name
 * @property state - State/province
 * @property postalCode - ZIP/postal code
 * @property country - Country name
 */
export interface Address {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Affiliate referral tracking record
 * @property id - Referral identifier
 * @property referrerId - ID of user who created referral code
 * @property referredUserId - ID of user who used referral code
 * @property status - Referral completion status
 * @property commissionAmount - Calculated commission for successful referral
 * @property createdAt - Referral code usage timestamp
 * @property completedAt - Optional completion timestamp
 */
export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  status: 'pending' | 'completed' | 'expired';
  commissionAmount: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Commission earned by affiliate from order
 * @property id - Commission record ID
 * @property userId - Affiliate user ID
 * @property amount - Commission amount in USD
 * @property status - Payment status (pending approval, paid, or failed)
 * @property paidAt - Timestamp of payment
 * @property orderId - Source order identifier
 */
export interface Commission {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  orderId: string;
}

/**
 * Generic API response wrapper for type safety
 * @property success - Operation success flag
 * @property data - Response payload (type T)
 * @property error - Error message if failed
 * @property message - Additional context message
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response for list endpoints
 * @property data - Array of items for current page
 * @property pagination - Page metadata (current page, limit, total, page count)
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
