interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface ProductCardProps {
  product: Product;
}

export function LandingProductCard({ product }: ProductCardProps) {
  return (
    <div className="group cursor-pointer rounded-lg overflow-hidden border border-gold-200 dark:border-gold-800 bg-white dark:bg-slate-950 hover:shadow-lg dark:hover:shadow-gold-900/30 transition-all duration-300 hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative overflow-hidden h-64 bg-gray-200 dark:bg-gray-800">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Product Info */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {product.description}
        </p>
        <button className="w-full py-2 px-4 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white font-medium transition-colors">
          View Collection
        </button>
      </div>
    </div>
  );
}
