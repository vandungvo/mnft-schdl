import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // The scheduling desk and factory data were merged into one scenario page; old links keep working (query is passed through).
  async redirects() {
    return [
      { source: "/decide", destination: "/scenarios", permanent: false },
      { source: "/decide/:id", destination: "/scenarios/:id?tab=options", permanent: false },
      { source: "/master-data", destination: "/scenarios", permanent: false },
      { source: "/master-data/:id", destination: "/scenarios/:id", permanent: false },
    ];
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
