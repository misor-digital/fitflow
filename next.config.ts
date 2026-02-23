import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.56.1'],
  env: {
    npm_package_version: process.env.npm_package_version ?? '0.0.0',
  },
};

export default nextConfig;
