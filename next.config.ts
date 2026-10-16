import type { NextConfig } from "next";

const configuredOrigin = process.env.PRICEWISE_API_URL?.trim();
if (process.env.VERCEL && !configuredOrigin) {
  throw new Error("Set PRICEWISE_API_URL to your actual Render API HTTPS origin in Vercel, then redeploy. See docs/deployment.md.");
}
let apiOrigin = "http://127.0.0.1:8000";
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
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
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
