/**
 * Hex-Diva Next.js 16 + Turbopack Configuration
 *
 * Key decisions:
 * - Turbopack enabled (default in Next.js 16); no custom webpack config
 * - No swcMinify (deprecated); Turbopack handles minification
 * - Sentry integrated for production error tracking
 * - Image optimization for Shopify CDN + Supabase Storage
 * - Optimized package imports for bundle size
 */

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: ".next",
  output: "standalone",

  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    root: path.resolve(__dirname),
  },

  // TypeScript configuration
  typescript: {
    tsconfigPath: "./tsconfig.json",
    ignoreBuildErrors: !!process.env.CI,
  },

  // Image optimization for e-commerce
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      "@supabase/supabase-js",
      "@supabase/auth-helpers-nextjs",
      "@sentry/nextjs",
      "@radix-ui/react-dropdown-menu",
    ],
  },

  // Performance budgets
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 50,
  },

  // Caching strategy
  headers: async () => {
    return [
      {
        source: "/public/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path((?!_next|public).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },

  // Redirects and rewrites
  redirects() {
    return [];
  },

  rewrites() {
    return [];
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

// Export with Sentry integration
export default withSentryConfig(nextConfig, {
  org: "hex-tech-lab",
  project: "hex-diva",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  debug: process.env.NODE_ENV === "development",
});
