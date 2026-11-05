import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" },
  },
  webServer: { command: "npm run build && npx next start -p 3100", port: 3100, reuseExistingServer: true, timeout: 180_000 },
});
