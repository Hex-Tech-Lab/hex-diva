# Hex-Diva Design System Integration Guide

**For Track E Frontend Development**

Complete guide to integrating Hex-Diva design system components and tokens into your Next.js application.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Design Tokens](#design-tokens)
3. [Component Library](#component-library)
4. [Styling Approach](#styling-approach)
5. [Responsive Design](#responsive-design)
6. [Accessibility](#accessibility)
7. [Theming & Customization](#theming--customization)
8. [Common Patterns](#common-patterns)
9. [Performance Tips](#performance-tips)
10. [Troubleshooting](#troubleshooting)

---

## Installation & Setup

### 1. Import Design System CSS

The main CSS file contains all design tokens and base component styles:

```typescript
// src/app/layout.tsx
import '@/styles/design-system.css';
```

### 2. Import Components

Use the design system component library:

```typescript
// src/components/pages/ProductDetail.tsx
import {
  Button,
  Card,
  ProductCard,
  Input,
  Modal,
  Header,
  NavLinks,
} from '@/components/design-system';
```

### 3. Tailwind Integration (Optional)

If using Tailwind CSS alongside, extend your `tailwind.config.ts`:

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    colors: {
      charcoal: {
        900: '#1a1a1a',
        800: '#2d2d2d',
        700: '#404040',
      },
      'rose-gold': '#B76E79',
      'rose-gold-light': '#d4a5ac',
      'emerald': '#50A895',
      'sapphire': '#1E3A8A',
      'off-white': '#F5F3F0',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '48px',
      '4xl': '64px',
      '5xl': '96px',
    },
  },
  // ...
};
```

---

## Design Tokens

### Color Tokens

All colors are CSS variables accessible in your styles:

```css
/* In your CSS/SCSS files */
.my-component {
  color: var(--color-charcoal-900);
  background-color: var(--color-off-white);
  border: 1px solid var(--color-gray-300);
}
```

**Available Color Groups**:
- Primary: `--color-charcoal-900`, `--color-charcoal-800`, `--color-charcoal-700`
- Accents: `--color-rose-gold`, `--color-rose-gold-light`, `--color-rose-gold-dark`
- Jewel Tones: `--color-emerald-500`, `--color-emerald-light`, `--color-emerald-dark`
- Deep Blues: `--color-sapphire-500`, `--color-sapphire-light`, `--color-sapphire-dark`
- Neutrals: `--color-off-white`, `--color-off-white-dark`, `--color-off-white-darker`
- Functional: `--color-success`, `--color-warning`, `--color-error`, `--color-info`
- Grays: `--color-gray-500`, `--color-gray-400`, `--color-gray-300`, `--color-gray-200`

### Spacing Tokens

Use for consistent margins and padding:

```css
.component {
  padding: var(--spacing-xl); /* 24px */
  margin-bottom: var(--spacing-lg); /* 16px */
  gap: var(--spacing-md); /* 12px */
}
```

### Shadow Tokens

Five elevation levels for depth:

```css
.card {
  box-shadow: var(--shadow-2); /* Subtle shadow */
}

.modal {
  box-shadow: var(--shadow-5); /* Maximum elevation */
}

.hover-accent {
  box-shadow: var(--shadow-rose-glow); /* Accent color glow */
}
```

### Typography Tokens

Font families and presets:

```typescript
// In your React components
const titleStyle = {
  fontFamily: 'var(--font-serif-display)', // Playfair Display
  fontSize: '56px',
  fontWeight: 700,
  lineHeight: '1.2',
};

const bodyStyle = {
  fontFamily: 'var(--font-sans-serif)', // Inter/Poppins
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: '1.6',
};
```

### Motion Tokens

For consistent animations:

```css
.interactive-element {
  transition: all var(--duration-base) var(--ease-in-out);
  /* 200ms ease-in-out */
}

.button:hover {
  animation: fadeIn var(--duration-slow); /* 300ms */
}
```

---

## Component Library

### Button Component

```typescript
import { Button, ButtonGroup } from '@/components/design-system';

// Basic usage
<Button variant="primary" size="medium">
  Shop Now
</Button>

// With icon
<Button variant="accent" icon={<ShoppingIcon />}>
  Add to Cart
</Button>

// Loading state
<Button loading>Processing...</Button>

// Full width
<Button fullWidth>Complete Purchase</Button>

// Button group
<ButtonGroup vertical>
  <Button variant="primary">Option 1</Button>
  <Button variant="secondary">Option 2</Button>
</ButtonGroup>
```

**Available Variants**: `primary`, `secondary`, `accent`, `ghost`  
**Available Sizes**: `small`, `medium`, `large`

### Card Components

```typescript
import {
  Card,
  ProductCard,
  FeatureCard,
  StatCard,
  CardGrid,
} from '@/components/design-system';

// Basic card
<Card>
  <h3>Card Title</h3>
  <p>Card content here</p>
</Card>

// Product card
<ProductCard
  image="/products/lash-serum.jpg"
  imageAlt="Luxury Lash Serum"
  name="Luxury Lash Serum"
  price={45}
  originalPrice={60}
  rating={4.8}
  reviewCount={124}
  onAddToCart={() => addToCart()}
  onViewDetails={() => viewDetails()}
/>

// Feature card
<FeatureCard
  icon={<PremiumIcon />}
  title="Premium Quality"
  description="Imported luxury products"
/>

// Stat card
<StatCard
  label="Total Revenue"
  value="$12,450"
  change={{ value: 15, direction: 'up' }}
/>

// Card grid (responsive)
<CardGrid columns={3} gap="lg">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</CardGrid>
```

### Form Components

```typescript
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Form,
  FormRow,
  PriceInput,
  RangeInput,
} from '@/components/design-system';

// Text input with error
<Input
  label="Email Address"
  type="email"
  placeholder="your@email.com"
  error={emailError}
  helperText="We'll never share your email"
/>

// Textarea with character count
<Textarea
  label="Message"
  charCount
  maxLength={500}
/>

// Select dropdown
<Select
  label="Collection"
  options={[
    { value: 'lashes', label: 'Sculpted Lashes' },
    { value: 'nails', label: 'Artisan Nails' },
  ]}
/>

// Form with multiple fields
<Form onSubmit={handleSubmit}>
  <FormRow columns={2}>
    <Input label="First Name" />
    <Input label="Last Name" />
  </FormRow>
  <Input label="Email" type="email" />
  <Checkbox label="Subscribe to our newsletter" />
  <Button type="submit">Submit</Button>
</Form>

// Price input
<PriceInput label="Price" />

// Range slider
<RangeInput
  min={0}
  max={500}
  value={priceRange}
  onChange={setPriceRange}
/>
```

### Modal & Overlay Components

```typescript
import {
  Modal,
  AlertDialog,
  ConfirmDialog,
  Drawer,
  Toast,
} from '@/components/design-system';

// Modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Add to Cart"
  actions={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleAdd}>
        Add
      </Button>
    </>
  }
>
  <p>Product added to your cart successfully!</p>
</Modal>

// Alert dialog
<AlertDialog
  isOpen={showAlert}
  title="Success"
  message="Order placed successfully"
  onConfirm={() => closeAlert()}
  type="success"
/>

// Confirmation dialog
<ConfirmDialog
  isOpen={showConfirm}
  title="Delete Item"
  message="Are you sure? This action cannot be undone."
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  destructive
/>

// Drawer (side panel)
<Drawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  title="Shopping Cart"
  position="right"
>
  <CartItems />
</Drawer>

// Toast notification
<Toast
  message="Product added to cart"
  type="success"
  duration={3000}
/>
```

### Navigation Components

```typescript
import {
  Header,
  NavLinks,
  Breadcrumb,
  Pagination,
  Tabs,
} from '@/components/design-system';

// Header with navigation
<Header
  logo={<span>HEX-DIVA</span>}
  nav={
    <NavLinks
      links={[
        { label: 'Shop', href: '/shop' },
        { label: 'Collections', href: '/collections' },
      ]}
    />
  }
  actions={<CartIcon />}
/>

// Breadcrumb
<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Product Detail' },
  ]}
/>

// Pagination
<Pagination
  currentPage={currentPage}
  totalPages={10}
  onPageChange={setCurrentPage}
/>

// Tabs
<Tabs
  tabs={[
    { id: 'details', label: 'Details', content: <ProductDetails /> },
    { id: 'reviews', label: 'Reviews', content: <ReviewList /> },
  ]}
/>
```

---

## Styling Approach

### CSS Custom Properties

All design tokens are CSS variables. Override globally or per-component:

```css
/* Global override */
:root {
  --color-rose-gold: #c97e8a; /* Custom color */
}

/* Component-specific override */
.my-card {
  --shadow-2: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Utility Classes

Use pre-built utility classes for quick styling:

```html
<!-- Spacing -->
<div class="mb-lg">Margin bottom large</div>
<div class="p-xl">Padding large</div>
<div class="gap-md">Gap medium</div>

<!-- Text -->
<span class="text-rose-gold">Accent text</span>
<span class="text-small">Small text</span>
<span class="text-center">Centered text</span>

<!-- Display -->
<div class="flex gap-lg">Flex container</div>
<div class="flex-center">Centered flex</div>
<div class="flex-between">Space-between flex</div>

<!-- Background & Border -->
<div class="bg-charcoal">Dark background</div>
<div class="border-bottom">Bottom border</div>
<div class="rounded-md">Rounded corners</div>

<!-- Shadows -->
<div class="shadow-1">Subtle shadow</div>
<div class="shadow-3">Medium shadow</div>
```

### Responsive Classes

Design system uses mobile-first approach:

```css
/* Mobile styles (default) */
.element {
  font-size: 14px;
  padding: 16px;
}

/* Tablet (641px+) */
@media (min-width: 641px) {
  .element {
    font-size: 16px;
    padding: 24px;
  }
}

/* Desktop (1025px+) */
@media (min-width: 1025px) {
  .element {
    font-size: 18px;
    padding: 32px;
  }
}
```

---

## Responsive Design

### Breakpoints

- **Mobile**: 320px–640px (1 column)
- **Tablet**: 641px–1024px (2 columns)
- **Desktop**: 1025px+ (3–4 columns)

### Responsive Grid

```typescript
<CardGrid columns={4} gap="lg">
  {/* Automatically adjusts: 4 cols (desktop), 2 (tablet), 1 (mobile) */}
</CardGrid>
```

### Responsive Images

```html
<img
  src="/product-mobile.jpg"
  srcset="
    /product-mobile.jpg 640w,
    /product-tablet.jpg 1024w,
    /product-desktop.jpg 1440w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Product"
/>
```

---

## Accessibility

### WCAG AAA Compliance

All components follow accessibility best practices:

```typescript
// Screen reader labels
<button aria-label="Close modal">✕</button>

// Form labels
<Input
  id="email"
  label="Email Address"
  required
  aria-required="true"
/>

// Live regions
<div role="status" aria-live="polite">
  Product added to cart
</div>

// Focus management
<Modal isOpen={isOpen} onClose={handleClose}>
  {/* Focus is managed automatically */}
</Modal>
```

### Color Contrast

All text meets WCAG AAA 7:1+ contrast ratio:

```css
/* charcoal on off-white: 16.4:1 ✓ */
color: var(--color-charcoal-900);
background-color: var(--color-off-white);
```

### Keyboard Navigation

All interactive elements support keyboard access:

```typescript
<Button onClick={handleClick}>
  {/* Automatically has Tab focus, Enter/Space activation */}
  Click Me
</Button>

<Input aria-describedby="error-message" />
<span id="error-message">Error message</span>
```

### Motion & Animation

Respects user motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

---

## Theming & Customization

### Dark Mode Support

The design system includes automatic dark mode support:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-off-white: #1a1a1a;
    --color-charcoal-900: #f5f3f0;
  }
}
```

### Custom Color Palette

Override colors for different brands/regions:

```css
:root {
  /* New color scheme */
  --color-rose-gold: #d4a96a;
  --color-emerald-500: #2d7a6b;
  --color-sapphire-500: #1a4d8f;
}
```

### Custom Fonts

Replace default fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant:wght@600;700&display=swap');

:root {
  --font-serif-display: 'Cormorant', serif;
}
```

---

## Common Patterns

### Product Listing with Filters

```typescript
import { Input, Select, Button, CardGrid, ProductCard } from '@/components/design-system';

export function ProductListing() {
  const [filters, setFilters] = useState({});
  const [products, setProducts] = useState([]);

  return (
    <div className="flex gap-2xl">
      {/* Filters */}
      <aside className="w-64">
        <Select
          label="Collection"
          options={collections}
          onChange={(val) => setFilters({ ...filters, collection: val })}
        />
        <Input
          label="Min Price"
          type="number"
          onChange={(val) => setFilters({ ...filters, minPrice: val })}
        />
        <Input
          label="Max Price"
          type="number"
          onChange={(val) => setFilters({ ...filters, maxPrice: val })}
        />
        <Button onClick={applyFilters}>Apply Filters</Button>
      </aside>

      {/* Products Grid */}
      <main className="flex-1">
        <CardGrid columns={3}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onAddToCart={() => addToCart(product)}
            />
          ))}
        </CardGrid>
      </main>
    </div>
  );
}
```

### Checkout Form

```typescript
import { Form, FormRow, Input, Select, Button } from '@/components/design-system';

export function CheckoutForm() {
  const [formData, setFormData] = useState({});

  return (
    <Form onSubmit={handleCheckout}>
      <h2>Shipping Information</h2>
      <FormRow columns={2}>
        <Input
          label="First Name"
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
        <Input
          label="Last Name"
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        />
      </FormRow>

      <Input
        label="Email"
        type="email"
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <FormRow columns={2}>
        <Input label="City" />
        <Select
          label="State"
          options={states}
        />
      </FormRow>

      <Button type="submit" fullWidth>
        Continue to Payment
      </Button>
    </Form>
  );
}
```

### Product Detail with Modal

```typescript
import { Modal, Button, StatCard, Tabs } from '@/components/design-system';

export function ProductDetail({ productId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const product = useProduct(productId);

  return (
    <div>
      <h1>{product.name}</h1>
      <div className="grid--2">
        <img src={product.image} alt={product.name} />
        <div>
          <p className="text-lg">${product.price}</p>
          <Button onClick={() => setIsModalOpen(true)}>
            Add to Cart
          </Button>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Added to Cart"
          >
            <p>Product successfully added!</p>
          </Modal>

          <Tabs
            tabs={[
              { id: 'details', label: 'Details', content: <ProductDetails /> },
              { id: 'reviews', label: 'Reviews', content: <ReviewList /> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Performance Tips

### 1. Lazy Load Components

```typescript
import dynamic from 'next/dynamic';

const ProductCard = dynamic(() =>
  import('@/components/design-system').then(mod => mod.ProductCard),
  { loading: () => <div>Loading...</div> }
);
```

### 2. Optimize Images

```typescript
import Image from 'next/image';

<Image
  src="/product.jpg"
  alt="Product"
  width={400}
  height={500}
  priority // Only for above-the-fold images
/>
```

### 3. Use CSS Variables Efficiently

CSS variables are lightweight and don't require re-renders:

```css
/* Good - single CSS update */
:root {
  --color-rose-gold: #B76E79;
}

/* Avoid - multiple element updates */
.element-1 { color: #B76E79; }
.element-2 { color: #B76E79; }
```

### 4. Memoize Components

```typescript
const ProductCard = memo(function ProductCard({ product }) {
  return <Card>{product.name}</Card>;
});
```

---

## Troubleshooting

### Component Styles Not Applying

**Problem**: Component looks unstyled  
**Solution**: Ensure design-system.css is imported at the top of your layout

```typescript
// src/app/layout.tsx
import '@/styles/design-system.css'; // Add this
```

### Colors Looking Different

**Problem**: Colors don't match design spec  
**Solution**: Check CSS variable override in your CSS

```css
/* Remove any conflicting color definitions */
/* Ensure --color-* variables aren't overridden elsewhere */
```

### Focus Indicators Not Showing

**Problem**: No visible focus ring on keyboard navigation  
**Solution**: Check for conflicting CSS

```css
/* Ensure this isn't being overridden */
:focus-visible {
  outline: 2px solid var(--color-rose-gold);
  outline-offset: 2px;
}
```

### Responsive Grid Not Working

**Problem**: Grid columns not adjusting on mobile  
**Solution**: Use CardGrid component or media queries

```typescript
// Good
<CardGrid columns={4} gap="lg">
  {/* Automatically responsive */}
</CardGrid>

// Or use media queries in CSS
@media (max-width: 1024px) {
  .grid { grid-template-columns: 1fr 1fr; }
}
```

### Modal Focus Trap Not Working

**Problem**: Can Tab outside modal  
**Solution**: Modal component handles focus automatically, just pass isOpen prop

```typescript
<Modal isOpen={isOpen} onClose={handleClose}>
  {/* Focus automatically managed */}
</Modal>
```

---

## Additional Resources

- **Design Tokens**: See `docs/DESIGN_TOKENS.md` for complete token reference
- **Component Props**: Check TypeScript definitions in `src/components/design-system/`
- **Sample Pages**: View HTML samples in `docs/design-system/`
- **Accessibility**: Review WCAG guidelines at https://www.w3.org/WAI/WCAG21/quickref/

---

**Version**: 1.0  
**Last Updated**: 2026-07-10  
**Status**: Ready for Track E Integration
