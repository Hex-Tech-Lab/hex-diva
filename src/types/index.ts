// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  tier: 'b2c' | 'b2b';
  referralCode: string;
  phone?: string;
  bio?: string;
}

// Product types
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

// Order types
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

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

// Cart types
export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// Address types
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

// Referral types
export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  status: 'pending' | 'completed' | 'expired';
  commissionAmount: number;
  createdAt: Date;
  completedAt?: Date;
}

// Commission types
export interface Commission {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  orderId: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
