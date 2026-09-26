/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
