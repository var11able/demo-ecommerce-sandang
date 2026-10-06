import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, staticSecurityHeaders } from "@/lib/security-headers";

const snapScriptUrl = "https://app.sandbox.midtrans.com/snap/snap.js";

function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split("; ").map((directive) => {
      const [name = "", ...values] = directive.split(" ");
      return [name, values];
    }),
  );
}

describe("Content-Security-Policy", () => {
  const production = directives(
    buildContentSecurityPolicy({ nonce: "abc123", development: false, snapScriptUrl }),
  );

  it("allows scripts only from the app, the per-request nonce, and Midtrans Snap", () => {
    expect(production["script-src"]).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'strict-dynamic'",
      "https://app.sandbox.midtrans.com",
    ]);
    expect(production["script-src"]).not.toContain("'unsafe-inline'");
    expect(production["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("allows frames only from Midtrans and forbids being framed", () => {
    expect(production["frame-src"]).toEqual(["https://app.sandbox.midtrans.com"]);
    expect(production["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("allows images from the app and the photo store", () => {
    const withStore = directives(
      buildContentSecurityPolicy({
        nonce: "n",
        development: false,
        imageOrigins: ["https://store.example"],
      }),
    );
    expect(withStore["img-src"]).toEqual(["'self'", "data:", "blob:", "https://store.example"]);
  });

  it("allows eval only in development, for React's error overlay", () => {
    const development = directives(
      buildContentSecurityPolicy({ nonce: "n", development: true, snapScriptUrl }),
    );
    expect(development["script-src"]).toContain("'unsafe-eval'");
    expect(development["upgrade-insecure-requests"]).toBeUndefined();
    expect(production["upgrade-insecure-requests"]).toEqual([]);
  });
});

describe("static security headers", () => {
  it("sets nosniff and the referrer policy everywhere, and HSTS in production", () => {
    const names = (production: boolean) =>
      Object.fromEntries(staticSecurityHeaders(production).map(({ key, value }) => [key, value]));
    expect(names(true)).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": expect.stringContaining("max-age="),
    });
    expect(names(false)["Strict-Transport-Security"]).toBeUndefined();
  });
});
