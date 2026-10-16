import { expect, test, type Page } from "@playwright/test";
import type { Comparison, Offer } from "../lib/types";

const amazonUrl = "https://www.amazon.in/dp/B0CHX1W1XY";
const input = (page: Page) => page.getByRole("textbox", { name: "YOUR NEXT SMARTER PURCHASE STARTS HERE" });
const compareButton = (page: Page) => page.getByRole("button", { name: "Compare prices", exact: true });

async function compareWithRealApi(page: Page, url = amazonUrl) {
  await input(page).fill(url);
  const response = page.waitForResponse(response => response.url().endsWith("/api/compare") && response.request().method() === "POST");
  await compareButton(page).click();
  return response;
}

test.beforeEach(async ({ page }) => {
  // The mount-time coverage request establishes that React hydration completed,
  // including the keyboard handlers exercised below.
  const coverage = page.waitForResponse(response => response.url().endsWith("/api/retailers"));
  await page.goto("/");
  await coverage;
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every verified price.");
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`fresh ${reducedMotion} render has no hydration mismatch or initial browser errors`, async ({ browser }) => {
    // Listen before this page's first navigation so React recovery messages are
    // captured even when hydration finishes before an interactive assertion.
    // This isolated context never runs the deliberate 503-response test below.
    const context = await browser.newContext({ reducedMotion, viewport: { width: 1440, height: 1000 } });
    const fresh = await context.newPage();
    const browserErrors: string[] = [];
    const hydrationWarnings: string[] = [];
    fresh.on("pageerror", error => browserErrors.push(error.message));
    fresh.on("console", message => {
      if (message.type() === "error") browserErrors.push(message.text());
      if (["warning", "error"].includes(message.type()) && /hydrat|server.rendered|did(?: not|n’t|n't) match|text content does not match/i.test(message.text())) hydrationWarnings.push(message.text());
    });
    try {
      const coverage = fresh.waitForResponse(response => response.url().endsWith("/api/retailers"));
      await fresh.goto("http://127.0.0.1:3000/");
      await coverage;
      await expect(fresh.getByRole("heading", { level: 1 })).toContainText("Every verified price.");
      await expect(fresh.locator(".hero-copy > div").first()).toHaveCSS("opacity", "1");
      await input(fresh).fill("hydration interaction check");
      await compareButton(fresh).click();
      await expect(fresh.getByRole("main").getByRole("alert")).toContainText("Paste a complete product link");
      expect(hydrationWarnings, `Hydration diagnostics with reducedMotion=${reducedMotion}`).toEqual([]);
      expect(browserErrors, `Initial browser errors with reducedMotion=${reducedMotion}`).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("empty and malformed links receive accessible validation without a comparison request", async ({ page }) => {
  const comparisonRequests: string[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/compare")) comparisonRequests.push(request.url()); });

  await compareButton(page).click();
  await expect(input(page)).toBeFocused();
  expect(await input(page).evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true);

  await input(page).fill("this is not a product link");
  await compareButton(page).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Paste a complete product link, starting with https://.");
  await expect(input(page)).toHaveAttribute("aria-invalid", "true");
  await expect(input(page)).toHaveAttribute("aria-describedby", "url-error");
  await expect(input(page)).toBeFocused();
  expect(comparisonRequests).toEqual([]);
});

test("unsupported hosts, unsafe protocols, credentials, and ports cannot start a lookup", async ({ page }) => {
  let comparisonRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/compare")) comparisonRequests += 1; });

  for (const url of [
    "https://example.com/product/123",
    "https://www.amazon.in.evil.example/dp/B0CHX1W1XY",
    "http://www.amazon.in/dp/B0CHX1W1XY",
    "https://user:password@www.amazon.in/dp/B0CHX1W1XY",
    "https://www.amazon.in:8000/dp/B0CHX1W1XY",
  ]) {
    await input(page).fill(url);
    await compareButton(page).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Use an HTTPS product link from Amazon India");
  }
  expect(comparisonRequests).toBe(0);
  await expect(page.locator("#comparison")).toHaveCount(0);
});

test("a retailer homepage is rejected by the real API with useful error feedback", async ({ page }) => {
  const response = await compareWithRealApi(page, "https://www.amazon.in/");
  expect(response.status()).toBe(422);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Use a direct product page link");
  await expect(input(page)).toHaveAttribute("aria-invalid", "true");
  await expect(compareButton(page)).toBeEnabled();
  await expect(page.locator(".offer-summary")).toHaveCount(0);
});

test("a real supported link shows five honest unavailable rows, filter reset, and retailer sorting", async ({ page }) => {
  const response = await compareWithRealApi(page);
  expect(response.ok()).toBe(true);
  const result = page.locator("#comparison");
  await expect(result.getByText("No verified offers available yet", { exact: true })).toBeVisible();
  await expect(result.getByText("Source connection needed", { exact: true })).toBeVisible();
  await expect(result.locator(".offer-summary")).toHaveCount(5);
  await expect(result.locator(".offer-price > strong")).toHaveText(["—", "—", "—", "—", "—"]);
  await expect(result).not.toContainText("₹");
  await expect(result.locator(".offer-best")).toHaveCount(0);

  const amazon = result.getByRole("button", { name: /^a Amazon Price verification required/ });
  await amazon.click();
  await expect(amazon).toHaveAttribute("aria-expanded", "true");
  const details = page.locator("#offer-amazon-unavailable");
  await expect(details).toContainText("Price currently unavailable — verification required.");
  await expect(details).toContainText("No authorized data source is connected.");
  await expect(details).toContainText("Last checked: Not verified");
  await expect(details).toContainText("Identity confidence: Not established");

  await result.getByRole("button", { name: /^Verified only/ }).click();
  await expect(result.getByText("No verified matches to show", { exact: true })).toBeVisible();
  await expect(result.locator(".offer-summary")).toHaveCount(0);
  await result.getByRole("button", { name: "Show all retailers" }).click();
  await expect(result.getByRole("button", { name: /^All retailers/ })).toHaveAttribute("aria-pressed", "true");
  await result.getByRole("combobox", { name: "Sort offers" }).selectOption("name");
  await expect(result.locator(".offer-retailer > strong")).toHaveText(["Amazon", "Croma", "Flipkart", "Reliance Digital", "Vijay Sales"]);

  await result.getByRole("button", { name: "Compare another product" }).click();
  await expect(input(page)).toBeFocused();
});

test("coverage dialog supports keyboard navigation and returns focus on Escape", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Supported stores", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".connection-status")).toHaveText(Array(5).fill("Source not connected"));
  const close = dialog.getByRole("button", { name: "Close retailer coverage" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Got it" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("comparison standards tabs support arrow navigation, wrapping, Home, and End", async ({ page }) => {
  const tabs = page.getByRole("tablist", { name: "Comparison standards" });
  const identity = tabs.getByRole("tab", { name: /A match means an exact match/ });
  const cost = tabs.getByRole("tab", { name: /The total. Not the teaser/ });
  const proof = tabs.getByRole("tab", { name: /Proof behind every price/ });
  await identity.scrollIntoViewIfNeeded();
  await identity.focus();
  await page.keyboard.press("ArrowRight");
  await expect(cost).toBeFocused();
  await expect(cost).toHaveAttribute("aria-selected", "true");
  await expect(identity).toHaveAttribute("tabindex", "-1");
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "feature-tab-1");
  await expect(page.getByRole("tabpanel")).toContainText("Nothing hidden in the total.");

  await page.keyboard.press("End");
  await expect(proof).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Transparency comes standard.");
  await page.keyboard.press("ArrowRight");
  await expect(identity).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(proof).toBeFocused();
  await page.keyboard.press("Home");
  await expect(identity).toBeFocused();
  await expect(identity).toHaveAttribute("aria-selected", "true");
});

test("FAQ answers toggle with mouse and keyboard and retain honest coverage details", async ({ page }) => {
  const identity = page.getByRole("button", { name: /^How do you know it’s the exact same product\?/ });
  const prices = page.getByRole("button", { name: /^Are the prices live\?/ });
  await expect(identity).toHaveAttribute("aria-expanded", "true");
  await prices.click();
  await expect(identity).toHaveAttribute("aria-expanded", "false");
  await expect(prices).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Are the prices live?" })).toContainText("currently has no retailer price feeds connected");
  await prices.press("Enter");
  await expect(prices).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("region", { name: "Are the prices live?" })).not.toBeVisible();

  const delivery = page.getByRole("button", { name: /^Are bank offers and delivery included\?/ });
  await delivery.focus();
  await delivery.press("Space");
  await expect(delivery).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Are bank offers and delivery included?" })).toContainText("Conditional bank offers, coupons, and membership discounts are shown separately.");
});

test("mobile navigation works at narrow widths without horizontal page overflow", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const coverage = page.waitForResponse(response => response.url().endsWith("/api/retailers"));
    await page.goto("/");
    await coverage;
    const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close navigation", exact: true })).toHaveAttribute("aria-expanded", "true");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "How it works", exact: true }).click();
    await expect(nav).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  }
});

test("responsive layout stays within the viewport across phone, tablet, and desktop widths", async ({ page }) => {
  for (const width of [320, 390, 650, 768, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), { message: `Horizontal overflow at ${width}px` }).toBeLessThanOrEqual(0);
  }
});

test("desktop scrolling advances the standards story while the panel sticks and progress updates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const coverage = page.waitForResponse(response => response.url().endsWith("/api/retailers"));
  await page.reload();
  await coverage;
  const story = await page.locator("#the-difference").evaluate(element => ({ top: element.getBoundingClientRect().top + scrollY, height: element.getBoundingClientRect().height, viewport: innerHeight }));
  const scrollToProgress = async (progress: number) => {
    const position = story.top - story.viewport / 2 + (story.height - story.viewport / 2) * progress;
    await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), position);
  };
  const cost = page.getByRole("tab", { name: /The total. Not the teaser/ });
  const proof = page.getByRole("tab", { name: /Proof behind every price/ });
  await scrollToProgress(0.45);
  await expect(cost).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Nothing hidden in the total.");
  await scrollToProgress(0.76);
  await expect(proof).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Transparency comes standard.");
  await expect(page.locator(".difference-grid")).toHaveCSS("position", "sticky");
  await expect(page.locator(".detail-panel-wrap")).toHaveCSS("transform", "none");
  const firstPanel = await page.getByRole("tabpanel").boundingBox();
  expect(firstPanel).not.toBeNull();
  await scrollToProgress(0.9);
  await expect(proof).toHaveAttribute("aria-selected", "true");
  await expect.poll(async () => {
    const current = await page.getByRole("tabpanel").boundingBox();
    return Math.abs((current?.y ?? -1000) - firstPanel!.y);
  }).toBeLessThan(2);
  await expect.poll(() => page.locator(".scroll-progress").evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeGreaterThan(0.1);
});

// Synthetic browser-only fixture. It is intercepted in this test and is never
// written to the application feed, returned by the real API, or shown in production.
function browserOnlyComparison(): Comparison {
  const base: Offer = {
    id: "test-amazon", retailer: "Amazon", url: amazonUrl,
    price: "50000.00", shipping: "100.00", mandatory_fees: "20.00", total: "50120.00",
    currency: "INR", status: "verified", reason: "Synthetic browser test: exact identity and complete total.",
    last_checked: "2026-10-16T01:00:00Z", match_confidence: 98,
    availability: "in_stock", conditional_discounts: [], source_kind: "authorized_feed", cached: true,
  };
  return {
    status: "complete", source_retailer: "Amazon",
    product: { name: "Synthetic UI test phone", brand: "Test manufacturer", model: "TEST-128-BLK", variant: { storage: "128 GB", color: "Black" }, specifications: { Storage: "128 GB", Color: "Black" }, identifiers: {} },
    offers: [
      { ...base, conditional_discounts: [{ label: "Test bank offer", amount: "3000.00", conditions: "Eligible test bank card required" }] },
      { ...base, id: "test-flipkart", retailer: "Flipkart", url: "https://www.flipkart.com/test/p/itmtest", price: "49000.00", shipping: "1200.00", mandatory_fees: "0.00", total: "50200.00", cached: false },
      { ...base, id: "test-croma", retailer: "Croma", url: "https://www.croma.com/test/p/123456", price: "47000.00", shipping: "0.00", mandatory_fees: "0.00", total: "47000.00", cached: false },
      { ...base, id: "test-reliance", retailer: "Reliance Digital", url: null, price: "46000.00", total: "46120.00", availability: "out_of_stock", status: "out_of_stock", reason: "Synthetic test product is out of stock.", cached: false },
      { ...base, id: "test-vijay", retailer: "Vijay Sales", url: null, shipping: null, total: null, status: "incomplete", reason: "Synthetic test delivery cost is unknown.", cached: false },
    ],
    best_offer_id: "test-croma", coverage: { supported: 5, checked: 5, configured: 5, verified: 3, retailers: ["Amazon", "Flipkart", "Croma", "Reliance Digital", "Vijay Sales"] },
    steps: [], message: "Synthetic browser test response only.", data_mode: "authorized_feed", generated_at: "2026-10-16T01:00:00Z",
  };
}

test("loading follows a pending request and browser-only verified offers preserve totals and provenance", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/compare", async route => {
    await gate;
    await route.fulfill({ json: browserOnlyComparison() });
  });
  await input(page).fill(amazonUrl);
  await compareButton(page).click();
  try {
    await expect(page.getByRole("status")).toContainText("Checking your product link");
    await expect(page.getByRole("button", { name: "Checking", exact: true })).toBeDisabled();
    await expect(page.locator("#comparison")).toHaveAttribute("aria-busy", "true");
  } finally {
    release();
  }

  const result = page.locator("#comparison");
  await expect(result).toHaveAttribute("aria-busy", "false");
  await expect(result.getByText("3 verified offers found", { exact: true })).toBeVisible();
  await expect(result.locator(".offer-retailer > strong")).toHaveText(["Croma", "Amazon", "Flipkart", "Reliance Digital", "Vijay Sales"]);
  await expect(result.locator(".offer-best .offer-retailer > strong")).toHaveText("Croma");
  await expect(result.locator(".offer-best .offer-price > strong")).toHaveText("₹47,000.00");
  await expect(result.locator(".product-summary")).toContainText("TEST-128-BLK");
  await expect(result.locator(".product-summary")).toContainText("Storage: 128 GB");

  const amazon = result.getByRole("button", { name: /^a Amazon Cached source/ });
  await amazon.click();
  const details = page.locator("#offer-test-amazon");
  await expect(amazon).toContainText("₹50,120.00");
  await expect(details.locator("dd")).toHaveText(["₹50,000.00", "₹100.00", "₹20.00", "in stock"]);
  await expect(details).toContainText("Identity confidence: 98%");
  await expect(details).toContainText("Last checked:");
  await expect(details).not.toContainText("Last checked: Not verified");
  await expect(details).toContainText("Conditional offers · excluded from ranking");
  await expect(details).toContainText("Test bank offer · ₹3,000.00 — Eligible test bank card required");
  await expect(details.getByRole("link", { name: "Visit store" })).toHaveAttribute("href", amazonUrl);
  await expect(details.getByRole("link", { name: "Visit store" })).toHaveAttribute("rel", "noopener noreferrer");

  const outOfStock = result.getByRole("button", { name: /^R Reliance Digital Price verification required/ });
  await expect(outOfStock.locator(".offer-price > strong")).toHaveText("—");
  await expect(outOfStock).toContainText("Out of stock");
  await outOfStock.click();
  await expect(page.locator("#offer-test-reliance dd").last()).toHaveText("out of stock");
  const incomplete = result.getByRole("button", { name: /^V Vijay Sales Price verification required/ });
  await expect(incomplete.locator(".offer-price > strong")).toHaveText("—");
  await expect(incomplete).toContainText("Verification incomplete");
  await incomplete.click();
  await expect(page.locator("#offer-test-vijay dd").nth(1)).toHaveText("—");

  await result.getByRole("button", { name: /^Verified only/ }).click();
  await expect(result.locator(".offer-summary")).toHaveCount(3);
  await result.getByRole("combobox", { name: "Sort offers" }).selectOption("name");
  await expect(result.locator(".offer-retailer > strong")).toHaveText(["Amazon", "Croma", "Flipkart"]);
});

test("API failure leaves a useful retry state instead of fabricating offers", async ({ page }) => {
  await page.route("**/api/compare", route => route.fulfill({ status: 503, json: { detail: "Authorized source temporarily unavailable. Try again later." } }));
  await input(page).fill(amazonUrl);
  await compareButton(page).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Authorized source temporarily unavailable. Try again later.");
  await expect(compareButton(page)).toBeEnabled();
  await expect(page.locator(".offer-summary")).toHaveCount(0);
  await expect(input(page)).toHaveValue(amazonUrl);
});
