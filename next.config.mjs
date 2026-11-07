/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: '/data/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] }];
  },
};
export default nextConfig;
