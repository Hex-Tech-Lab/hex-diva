export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Hex-Diva</h1>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome to Hex-Diva</h2>
          <p className="text-xl text-slate-600 mb-8">
            Luxury cosmetics and beauty products for everyone
          </p>
          <div className="flex gap-4 justify-center">
            <button className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
              Shop Now
            </button>
            <button className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
