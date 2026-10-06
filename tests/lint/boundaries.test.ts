import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function ruleIdsFor(code: string, filePath: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.map((message) => message.ruleId) ?? [];
}

describe("comment ban", () => {
  it("fails on a line comment", async () => {
    expect(await ruleIdsFor("export const a = 1;\n// note\n", "src/lib/a.ts")).toContain(
      "sandang/no-comments",
    );
  });

  it("fails on a block comment in a test file", async () => {
    expect(await ruleIdsFor("/* note */\nexport const a = 1;\n", "tests/a.test.ts")).toContain(
      "sandang/no-comments",
    );
  });

  it("allows a tool directive", async () => {
    const code = "// @ts-expect-error\nexport const a: number = 'x';\n";
    expect(await ruleIdsFor(code, "src/lib/a.ts")).not.toContain("sandang/no-comments");
  });
});

describe("src/server boundary", () => {
  it("requires the server-only marker", async () => {
    expect(await ruleIdsFor("export const a = 1;\n", "src/server/a.ts")).toContain(
      "sandang/require-server-only",
    );
  });

  it("accepts a marked file", async () => {
    expect(
      await ruleIdsFor('import "server-only";\nexport const a = 1;\n', "src/server/a.ts"),
    ).toEqual([]);
  });

  it.each([
    ["react", 'import { useState } from "react";\nexport const a = useState;'],
    ["next/server", 'import { NextResponse } from "next/server";\nexport const a = NextResponse;'],
    [
      "@/components",
      'import { HealthStatus } from "@/components/health-status";\nexport const a = HealthStatus;',
    ],
    [
      "a relative path into src/app",
      'import HomePage from "../app/page";\nexport const a = HomePage;',
    ],
  ])("forbids importing %s inside src/server", async (_target, code) => {
    const ruleIds = await ruleIdsFor(`import "server-only";\n${code}\n`, "src/server/a.ts");
    expect(
      ruleIds.some((id) => id === "no-restricted-imports" || id === "import/no-restricted-paths"),
    ).toBe(true);
  });

  it("keeps Prisma out of the storefront", async () => {
    const code =
      'import { PrismaClient } from "@/generated/prisma/client";\nexport const a = PrismaClient;\n';
    expect(await ruleIdsFor(code, "src/app/page.tsx")).toContain("no-restricted-imports");
  });

  it("lets only db.ts create the Prisma client", async () => {
    const code =
      'import "server-only";\nimport { PrismaClient } from "@/generated/prisma/client";\nexport const a = PrismaClient;\n';
    expect(await ruleIdsFor(code, "src/server/catalog/index.ts")).toContain(
      "no-restricted-imports",
    );
    expect(await ruleIdsFor(code, "src/server/db.ts")).toEqual([]);
  });

  it("lets the storefront import a feature through its index only", async () => {
    expect(
      await ruleIdsFor(
        'import { checkHealth } from "@/server/health";\nexport const a = checkHealth;\n',
        "src/app/x.ts",
      ),
    ).toEqual([]);
    expect(
      await ruleIdsFor(
        'import { a } from "@/server/health/internal";\nexport const b = a;\n',
        "src/app/x.ts",
      ),
    ).toContain("no-restricted-imports");
  });
});
