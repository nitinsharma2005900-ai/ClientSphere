/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, output: 'standalone', skipTrailingSlashRedirect: true, experimental: { cpus: 2 }, poweredByHeader: false };
export default nextConfig;
