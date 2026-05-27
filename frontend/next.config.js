/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // On Vercel with experimentalServices, backend is mounted at /_/backend
    const destination = process.env.VERCEL
      ? '/_/backend/api/:path*'
      : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/:path*`;

    return [
      {
        source: '/api/:path*',
        destination,
      },
    ];
  },
};

module.exports = nextConfig;
