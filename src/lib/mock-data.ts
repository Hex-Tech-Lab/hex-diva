/**
 * Mock data for development and testing
 */

export interface MockProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  rating: number;
}

export const mockProducts: MockProduct[] = [
  {
    id: '1',
    name: 'Luxury Face Serum',
    price: 89.99,
    description: 'Hydrating and rejuvenating serum for radiant skin',
    image: '/products/serum.jpg',
    category: 'Skincare',
    rating: 4.8,
  },
  {
    id: '2',
    name: 'Rose Gold Highlighter',
    price: 45.00,
    description: 'Shimmer and glow with our signature rose gold highlighter',
    image: '/products/highlighter.jpg',
    category: 'Makeup',
    rating: 4.9,
  },
  {
    id: '3',
    name: 'Matte Lipstick Collection',
    price: 32.00,
    description: 'Long-wearing, cruelty-free matte lipstick in 12 shades',
    image: '/products/lipstick.jpg',
    category: 'Makeup',
    rating: 4.7,
  },
  {
    id: '4',
    name: 'Silk Eye Mask',
    price: 28.00,
    description: 'Premium silk sleep mask for smooth skin and restful sleep',
    image: '/products/eye-mask.jpg',
    category: 'Accessories',
    rating: 4.6,
  },
  {
    id: '5',
    name: 'Anti-Aging Eye Cream',
    price: 65.00,
    description: 'Reduces fine lines and dark circles with peptides and retinol',
    image: '/products/eye-cream.jpg',
    category: 'Skincare',
    rating: 4.8,
  },
  {
    id: '6',
    name: 'Makeup Brush Set',
    price: 55.00,
    description: 'Professional 10-piece brush set with luxury handles',
    image: '/products/brushes.jpg',
    category: 'Accessories',
    rating: 4.5,
  },
];
