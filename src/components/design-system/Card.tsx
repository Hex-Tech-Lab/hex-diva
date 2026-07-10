/**
 * Card Components
 * Reusable card layouts for various content types
 * Variants: default, product, feature
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  className?: string;
}

export const Card = ({ children, hoverable = true, className = '' }: CardProps) => {
  return (
    <div className={`card ${hoverable ? 'hover:shadow-3' : ''} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Product Card Component
 * Displays product image, name, price, rating, and actions
 */
interface ProductCardProps {
  image: string;
  imageAlt: string;
  name: string;
  category?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  onAddToCart?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export const ProductCard = ({
  image,
  imageAlt,
  name,
  category,
  price,
  originalPrice,
  rating,
  reviewCount,
  onAddToCart,
  onViewDetails,
  className = '',
}: ProductCardProps) => {
  const discountPercent =
    originalPrice && price < originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <div className={`product-card ${className}`}>
      {/* Product Image */}
      <div className="product-card__image-wrapper relative">
        <img src={image} alt={imageAlt} className="product-card__image" />
        {discountPercent && (
          <div className="absolute top-3 right-3 bg-rose-gold text-off-white px-3 py-1 rounded-sm text-sm font-semibold">
            -{discountPercent}%
          </div>
        )}
        {category && (
          <div className="absolute top-3 left-3 bg-charcoal bg-opacity-80 text-off-white px-3 py-1 rounded-sm text-xs font-semibold">
            {category}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-card__body">
        <h3 className="product-card__name">{name}</h3>

        {/* Rating */}
        {rating !== undefined && (
          <div className="product-card__rating">
            <span className="text-rose-gold">★★★★★</span>
            <span>
              {rating} ({reviewCount} reviews)
            </span>
          </div>
        )}

        {/* Price */}
        <div className="product-card__price-group flex items-center gap-md mb-lg">
          <span className="product-card__price">${price.toFixed(2)}</span>
          {originalPrice && price < originalPrice && (
            <span className="text-gray line-through text-sm">${originalPrice.toFixed(2)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="product-card__actions gap-sm">
          <button className="btn-primary flex-1" onClick={onViewDetails}>
            View Details
          </button>
          <button className="btn-accent flex-1" onClick={onAddToCart}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Feature Card Component
 * Highlights a feature with icon, title, and description
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  className?: string;
}

export const FeatureCard = ({
  icon,
  title,
  description,
  href,
  className = '',
}: FeatureCardProps) => {
  const content = (
    <div className={`feature-card card ${className}`}>
      <div className="feature-card__icon">{icon}</div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__description">{description}</p>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
};

/**
 * Stat Card Component
 * Display key metrics/KPIs
 */
interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard = ({ label, value, change, icon, className = '' }: StatCardProps) => {
  return (
    <div className={`card text-center ${className}`}>
      {icon && <div className="flex justify-center mb-lg">{icon}</div>}
      <p className="text-small text-gray mb-sm">{label}</p>
      <p className="text-3xl font-bold text-charcoal mb-md">{value}</p>
      {change && (
        <div
          className={`text-sm font-semibold ${change.direction === 'up' ? 'text-emerald' : 'text-error'}`}
        >
          {change.direction === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
        </div>
      )}
    </div>
  );
};

/**
 * Card Grid Component
 * Responsive grid of cards
 */
interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CardGrid = ({
  children,
  columns = 3,
  gap = 'lg',
  className = '',
}: CardGridProps) => {
  const gridClass = `grid--${columns}`;
  const gapClass = `gap-${gap}`;

  return (
    <div className={`grid ${gridClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};
