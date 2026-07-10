'use client';
import Link from 'next/link';
const products = [{id:'1',name:'Eyelashes',price:24.99},{id:'2',name:'Nail Polish',price:12.99}];
export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-off-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Shop</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <div className="border rounded-lg p-4 hover:shadow-lg">
                <div className="bg-gray-100 aspect-square rounded mb-4" />
                <h3 className="font-semibold mb-2">{p.name}</h3>
                <p className="text-brand-600 font-bold">${p.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
