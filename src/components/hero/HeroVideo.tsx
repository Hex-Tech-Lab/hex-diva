import { cn } from '@/lib/utils';

interface HeroVideoProps {
  videoSrc: string;
  headline: string;
  subheadline?: string;
  ctaText?: string;
  ctaHref?: string;
  overlayOpacity?: number;
  textAlign?: 'center' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function HeroVideo({
  videoSrc,
  headline,
  subheadline,
  ctaText = 'Discover',
  ctaHref = '#',
  overlayOpacity = 0.3,
  textAlign = 'center',
  className,
}: HeroVideoProps) {
  const textPositionClasses = {
    center: 'flex items-center justify-center',
    'bottom-left': 'flex items-end justify-start p-8 md:p-16',
    'bottom-right': 'flex items-end justify-end p-8 md:p-16',
  };

  return (
    <section
      className={cn(
        'relative w-full h-screen overflow-hidden bg-black',
        className
      )}
    >
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: overlayOpacity }}
        aria-hidden="true"
      />

      {/* Content Overlay */}
      <div className={cn('absolute inset-0', textPositionClasses[textAlign])}>
        <div
          className={cn(
            'text-white max-w-2xl',
            textAlign === 'center' && 'text-center'
          )}
        >
          {/* Headline */}
          <h1 className="font-serif text-5xl md:text-7xl font-light tracking-tight mb-4">
            {headline}
          </h1>

          {/* Subheadline */}
          {subheadline && (
            <p className="font-sans text-lg md:text-xl font-light text-gray-100 mb-8">
              {subheadline}
            </p>
          )}

          {/* CTA Button */}
          <a
            href={ctaHref}
            className={cn(
              'inline-block px-8 py-3 rounded-none',
              'bg-amber-600 hover:bg-amber-700 text-white font-sans text-sm',
              'transition-colors duration-200',
              'uppercase tracking-widest font-light'
            )}
          >
            {ctaText}
          </a>

          {/* Trust Marker */}
          <p className="mt-8 text-xs text-gray-300 font-light tracking-wide">
            Ships worldwide • Luxury packaging • 30-Day guarantee
          </p>
        </div>
      </div>
    </section>
  );
}
