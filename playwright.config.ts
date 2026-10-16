import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: ".artifacts/playwright-results",
  reporter: [["list"], ["html", { outputFolder: ".artifacts/playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 1000 },
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
