import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['192.168.56.1'],
  experimental: {
    authInterrupts: true,
  },
  env: {
    npm_package_version: process.env.npm_package_version ?? '0.0.0',
  },
};

export default nextConfig;
