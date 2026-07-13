import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LandingHeroSection } from '@/components/LandingHeroSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <ThemeToggle />

      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-gold-200 dark:border-gold-900/30 bg-white/95 dark:bg-black/95 backdrop-blur">
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

      {/* Hero and Products */}
      <LandingHeroSection />
    </main>
  );
}
