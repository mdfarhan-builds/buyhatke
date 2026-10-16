import { NextResponse } from "next/server";

// This fallback makes the interface independently deployable. A configured
// beforeFiles rewrite sends API requests to FastAPI instead of this handler.
export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json({
    status: "unavailable",
    data_mode: "unconfigured",
    detail: "The comparison service is not connected yet. You can explore the interface, but product and price verification require a connected backend.",
    message: "Set PRICEWISE_API_URL to the Render API HTTPS origin in Vercel and redeploy to enable comparisons."
  }, {
    status: 503,
    headers: { "Cache-Control": "no-store" }
  });
}

export const GET = unavailable;
export const POST = unavailable;
