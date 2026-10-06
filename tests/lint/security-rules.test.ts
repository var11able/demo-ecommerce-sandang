import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function ruleIdsFor(code: string, filePath: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.map((message) => message.ruleId) ?? [];
}

describe("security lint rules", () => {
  it("forbids server actions", async () => {
    const code = '"use server";\nexport async function save() {\n  return 1;\n}\n';
    expect(await ruleIdsFor(code, "src/app/actions.ts")).toContain("sandang/no-server-actions");
  });

  it("forbids reading a secret outside src/server", async () => {
    const code = "export const key = process.env.MIDTRANS_SERVER_KEY;\n";
    expect(await ruleIdsFor(code, "src/app/page-helper.ts")).toContain("sandang/no-secret-env");
    expect(
      await ruleIdsFor(`import "server-only";\n${code}`, "src/server/payments/x.ts"),
    ).not.toContain("sandang/no-secret-env");
  });

  it("forbids storing anything in browser storage", async () => {
    const code = 'export function keep(token: string) {\n  localStorage.setItem("t", token);\n}\n';
    expect(await ruleIdsFor(code, "src/components/x.tsx")).toContain("no-restricted-globals");
  });

  it("forbids injecting HTML", async () => {
    const code =
      "export function Danger({ html }: { html: string }) {\n  return <div dangerouslySetInnerHTML={{ __html: html }} />;\n}\n";
    expect(await ruleIdsFor(code, "src/components/x.tsx")).toContain("react/no-danger");
  });

  it("forbids SQL built from strings", async () => {
    const code =
      'import "server-only";\nimport { getDb } from "../db";\nexport function find(name: string) {\n  return getDb().$queryRawUnsafe(`SELECT * FROM x WHERE n = ${name}`);\n}\n';
    expect(await ruleIdsFor(code, "src/server/catalog/x.ts")).toContain("no-restricted-properties");
  });
});
