import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships native (non-JS) bindings and must run via Node's own
  // require(), never bundled. It's on Next's own default auto-external
  // list, but that list is proven-out for webpack — this project runs on
  // Turbopack (including for `next build`, no separate config), whose
  // production bundler is newer and less battle-tested for this exact
  // mechanism. Symptom without this: sharp's resize/webp output silently
  // corrupts in the deployed Vercel build (works fine in local dev, where
  // no production bundling step is involved) — every uploaded car image
  // came out with a valid-looking WebP header but an undecodable body.
  serverExternalPackages: ['sharp'],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'octanefiles.com' }],
        destination: 'https://www.octanefiles.com/:path*',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
