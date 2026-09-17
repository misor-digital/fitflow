import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Auto-detect this machine's LAN IPv4 addresses so dev access over the
// network keeps working when DHCP changes the IP. Falls back to nothing.
function localNetworkOrigins(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && !net.internal && net.family === 'IPv4')
    .map((net) => net!.address);
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: localNetworkOrigins(),
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
