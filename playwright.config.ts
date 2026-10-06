import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const port = 3200;
const baseURL = `http://localhost:${port}`;

function toEndToEndDatabaseUrl(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl) {
    return undefined;
  }
  const url = new URL(databaseUrl);
  url.pathname = `${url.pathname.replace(/_(test|e2e)$/, "")}_e2e`;
  return url.toString();
}

const databaseUrl = toEndToEndDatabaseUrl(process.env.DATABASE_URL);
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}
process.env.APP_ORIGIN = baseURL;

export const endToEndAdmin = {
  email: "admin@e2e.sandang.test",
  password: "end-to-end admin password",
};

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  timeout: 60_000,
  workers: 1,
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec tsx tests/e2e/prepare-database.ts && pnpm build && pnpm exec next start -p ${port}`,
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      APP_ORIGIN: baseURL,
      DEMO_MODE: "true",
      ADMIN_EMAIL: endToEndAdmin.email,
      ADMIN_PASSWORD: endToEndAdmin.password,
      UPLOADS_DIR: ".data/e2e-uploads",
      ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    },
  },
});
