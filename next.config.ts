import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fly.io / Docker: kichik standalone image (server.js + minimal node_modules).
  // Lokal dev'ga ta'sir qilmaydi.
  output: "standalone",
  // Allow phones/tablets on the LAN to use the dev server (HMR, devtools).
  // ALLOWED_DEV_ORIGINS env orqali: "192.168.1.5,192.168.1.6"
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],

  // Production hardening: baseline security headers for all routes.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
