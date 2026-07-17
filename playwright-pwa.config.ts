import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3102",
    serviceWorkers: "allow",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm exec next start --port 3102",
    reuseExistingServer: false,
    timeout: 180_000,
    url: "http://localhost:3102/practice",
  },
});
