import type { NextConfig } from "next";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET || "http://127.0.0.1:7771"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "quickfoodies.com",
      },
      {
        protocol: "http",
        hostname: "quickfoodies.com",
      },
      {
        protocol: "https",
        hostname: "*.quickfoodies.com",
      },
      {
        protocol: "http",
        hostname: "*.quickfoodies.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
