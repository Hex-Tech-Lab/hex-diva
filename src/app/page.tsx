import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">✨ Hex-Diva</h1>
          <div className="flex gap-4">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button variant="primary" size="sm">Get Started</Button>
          </div>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block mb-6 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
            Luxury Beauty Platform
          </div>
          <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Elevate Your Beauty Ritual
          </h2>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed">
            Discover premium cosmetics and skincare products curated for every skin type.
            Experience personalized beauty recommendations powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary">Shop Now</Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">500K+</div>
              <p className="text-slate-300">Happy Customers</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">1000+</div>
              <p className="text-slate-300">Premium Products</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">20%</div>
              <p className="text-slate-300">Average Savings</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
