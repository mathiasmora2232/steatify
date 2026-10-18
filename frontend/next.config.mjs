import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Monorepo (npm workspaces): without this, Next can't tell the hoisted root node_modules
  // (one level up, at the repo root) belong to this build, and ships `standalone` with no
  // node_modules at all — `node server.js` then fails with "Cannot find module 'next'".
  outputFileTracingRoot: path.join(__dirname, '..'),
  // Proxy /api → backend so the app is single-origin. This makes it work from
  // any host (localhost, LAN IP, a tunnel) without CORS or cookie-domain issues:
  // the browser always calls the same origin it loaded from, and Next forwards
  // the request to the backend server-side.
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:4000';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  async redirects() {
    return [{ source: '/que-es-sonora', destination: '/que-es-steatify', permanent: true }];
  },
  images: {
    // Spotify CDN domains for album/artist art.
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'mosaic.scdn.co' },
      { protocol: 'https', hostname: 'image-cdn-ak.spotifycdn.com' },
    ],
  },
};

export default nextConfig;
