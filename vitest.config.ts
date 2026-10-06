import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function toTestDatabaseUrl(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl) {
    return undefined;
  }
  const url = new URL(databaseUrl);
  url.pathname = `${url.pathname.replace(/_test$/, "")}_test`;
  return url.toString();
}

process.env.UPLOADS_DIR = join(tmpdir(), "sandang-test-uploads");

const testDatabaseUrl = toTestDatabaseUrl(process.env.DATABASE_URL);
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: /^server-only$/,
        replacement: fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/support/global-setup.ts"],
    fileParallelism: false,
  },
});
