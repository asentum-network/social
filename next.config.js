/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow self-hosted indexer + wallet-bot images / API in dev.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
