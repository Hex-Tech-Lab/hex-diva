import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-gold-200 dark:border-gold-900/30 bg-white/95 dark:bg-black/95 backdrop-blur">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-gold-600 dark:text-gold-400">✨</span>
            <span className="text-black dark:text-white"> Hex-Diva</span>
          </div>
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button variant="primary" size="sm">Get Started</Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient with elegance */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gold-50 to-white dark:from-black dark:via-gold-950/20 dark:to-black" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-300/20 dark:bg-gold-600/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-200/10 dark:bg-gold-700/5 rounded-full blur-3xl -ml-48 -mb-48" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-gold-300 dark:border-gold-700 bg-gold-50 dark:bg-gold-950/40">
              <span className="w-2 h-2 rounded-full bg-gold-600 dark:bg-gold-400" />
              <span className="text-sm font-semibold tracking-wide text-gold-900 dark:text-gold-200">
                LUXURY BEAUTY PLATFORM
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter mb-8 text-black dark:text-white">
              Elevate Your
              <br />
              <span className="bg-gradient-to-r from-gold-600 to-gold-500 dark:from-gold-400 dark:to-gold-300 bg-clip-text text-transparent">
                Beauty Ritual
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Curated luxury eyelash extensions, premium stick-on nails, and high-end cosmetic accessories.
              Exceptional quality. Impeccable packaging. Mid-to-upper price positioning.
            </p>

            {/* CTA Buttons - properly constrained */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="primary" className="px-8 py-4 text-lg">
                Shop Now
              </Button>
              <Button variant="outline" className="px-8 py-4 text-lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative bg-black dark:bg-gold-950/20 text-white dark:text-white py-20 border-y border-gold-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-600/5 via-transparent to-gold-600/5" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent mb-3">
                100
              </div>
              <p className="text-gray-300 text-lg font-medium">Curated SKUs (Phase 1)</p>
            </div>
            <div className="text-center border-l border-r border-gold-900/30">
              <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent mb-3">
                3000+
              </div>
              <p className="text-gray-300 text-lg font-medium">Total Catalog</p>
            </div>
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent mb-3">
                Top 5
              </div>
              <p className="text-gray-300 text-lg font-medium">Import Partner (Egypt)</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
