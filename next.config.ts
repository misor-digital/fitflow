import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['192.168.56.1'],
  experimental: {
    authInterrupts: true,
  },
  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  env: {
    npm_package_version: process.env.npm_package_version ?? '0.0.0',
  },
};

export default nextConfig;
