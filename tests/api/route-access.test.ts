import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const accessLevels = ["public", "customer", "admin", "machine"];

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return routeFiles(path);
    }
    return entry.name === "route.ts" ? [path] : [];
  });
}

const files = routeFiles(join("src", "app"));

describe("every route declares who may call it", () => {
  it("finds the route files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [relative(".", file)]))("%s", async (file) => {
    const routeModule = (await import(pathToFileURL(join(process.cwd(), file)).href)) as Record<
      string,
      unknown
    >;
    const handlers = methods.filter((method) => method in routeModule);
    expect(handlers.length).toBeGreaterThan(0);
    for (const method of handlers) {
      const handler = routeModule[method] as { access?: string };
      expect(accessLevels, `${method} in ${file}`).toContain(handler.access);
    }
  });
});
