/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
