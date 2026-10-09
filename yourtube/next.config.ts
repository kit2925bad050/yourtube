import type { NextConfig } from "next";

// Validate environment variables at build time
if (!process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NODE_ENV === "production") {
  console.warn("WARNING: NEXT_PUBLIC_BACKEND_URL is not set in production. API calls may fail.");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Use the configured backend API URL at build time so production doesn't hardcode localhost.
    // Support both NEXT_PUBLIC_BACKEND_URL and NEXT_PUBLIC_API_URL aliases.
    remotePatterns: (() => {
      const patterns = [] as any[];
      const urlStr =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        "http://localhost:5000";
      try {
        const u = new URL(urlStr);
        patterns.push({
          protocol: u.protocol.replace(':', ''),
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? '443' : '80'),
          pathname: '/**',
        });
      } catch (e) {
        // ignore and leave patterns empty
      }
      return patterns;
    })(),
  },
  env: {
    BACKEND_URL:
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:5000/api",
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:5000/api",
  },
  async rewrites() {
    const rawBackendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "/api";
    const backendUrl = rawBackendUrl.replace(/\/+$/, "");
    const normalized = backendUrl.match(/\/api$/i)
      ? backendUrl
      : `${backendUrl}/api`;

    return [
      {
        source: "/api/:path*",
        destination: `${normalized}/:path*`,
      },
    ];
  },
  // Ensure Turbopack uses this folder as the workspace root (avoids root inference warning)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
