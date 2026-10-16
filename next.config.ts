import type { NextConfig } from "next";

const configuredOrigin = process.env.PRICEWISE_API_URL?.trim();
let apiOrigin: string | null = process.env.VERCEL ? null : "http://127.0.0.1:8000";
if (configuredOrigin) {
  const parsed = new URL(configuredOrigin);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash || (process.env.VERCEL && parsed.protocol !== "https:")) {
    throw new Error("PRICEWISE_API_URL must be an API origin with no path, credentials, query, or fragment; Vercel requires HTTPS.");
  }
  apiOrigin = parsed.origin;
}

const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: apiOrigin ? [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }] : [],
      afterFiles: [],
      fallback: []
    };
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ] }];
  }
};
export default config;
