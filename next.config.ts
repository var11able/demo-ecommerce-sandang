import type { NextConfig } from "next";
import { apiContentSecurityPolicy, staticSecurityHeaders } from "./src/lib/security-headers";

const production = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/uploads/**",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: staticSecurityHeaders(production) },
      {
        source: "/api/:path*",
        headers: [{ key: "Content-Security-Policy", value: apiContentSecurityPolicy }],
      },
    ];
  },
};

export default nextConfig;
