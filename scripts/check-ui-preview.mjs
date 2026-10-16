import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

// Run after building with VERCEL=1 and PRICEWISE_API_URL unset. This exercises
// the real production routes; no API response is mocked or fixture feed loaded.
const manifest = JSON.parse(await readFile(".next/routes-manifest.json", "utf8"));
assert.equal(manifest.rewrites.beforeFiles.length, 0, "Build the interface-only Vercel preview first, with PRICEWISE_API_URL unset.");
const port = Number(process.env.PRICEWISE_PREVIEW_TEST_PORT || 3012);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "pipe" });
let output = "";
server.stdout.on("data", data => { output += data; });
server.stderr.on("data", data => { output += data; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview server exited: ${output}`);
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await delay(100);
  }
  assert(ready, `Preview server did not start: ${output}`);
  for (const [path, options] of [
    ["/api/health", {}],
    ["/api/retailers", {}],
    ["/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://www.amazon.in/dp/B0CHX1W1XY" }) }]
  ]) {
    const response = await fetch(`${base}${path}`, options);
    assert.equal(response.status, 503, `${path} must explicitly report an unavailable API`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = await response.json();
    assert.equal(data.status, "unavailable");
    assert.match(data.detail, /comparison service is not connected/i);
    assert(!("offers" in data), "An unconnected API must not invent offers");
  }
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base, { waitUntil: "networkidle" });
  assert.match(await page.locator("h1").innerText(), /Every verified price/);
  await page.getByRole("button", { name: "Supported stores", exact: true }).click();
  assert.equal(await page.locator(".connection-status").filter({ hasText: "Status unavailable" }).count(), 5);
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page.getByRole("textbox").fill("https://www.amazon.in/dp/B0CHX1W1XY");
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await page.locator("main [role=alert]").waitFor();
  assert.match(await page.locator("main [role=alert]").innerText(), /comparison service is not connected/i);
  assert.equal(await page.locator(".offer-summary").count(), 0);
  assert.deepEqual(errors, [], "The preview must not have browser rendering errors");
  console.log("Interface-only production preview passed: homepage, unavailable coverage, honest API 503 responses, form feedback, no invented offers.");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await Promise.race([new Promise(resolve => server.once("exit", resolve)), delay(3000).then(() => server.kill("SIGKILL"))]);
}
