import { withSentryConfig } from "@sentry/nextjs";

/**
 * CSP for FleetSight landing.
 *
 * - script-src allows 'unsafe-inline' + 'unsafe-eval' because Next.js's app
 *   router hydration scripts and framer-motion both rely on them. Stripe and
 *   Sentry need their own hosts for js.stripe.com and *.sentry.io.
 * - style-src allows 'unsafe-inline' because Tailwind emits inline styles at
 *   runtime (hover states, dynamic classes).
 * - img-src allows https: because Leaflet loads OSM / Mapbox-style tiles from
 *   rotating CDN hosts. data: / blob: cover inline SVG badges and uploads.
 * - connect-src lists every service the client actually calls: Sentry ingest,
 *   Stripe, and same-origin API routes. wss: is kept for future use-alert-stream.
 * - frame-src / frame-ancestors lock down embedding: we allow Stripe Checkout
 *   but block everything else from framing us.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://*.ingest.sentry.io https://*.sentry.io wss:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
        ],
      },
      {
        // Static assets: cache aggressively
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|webp|avif)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: true,
  // Disable source map upload unless explicitly configured
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
});
