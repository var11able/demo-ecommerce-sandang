export type PolicyOptions = {
  nonce: string;
  development: boolean;
  snapScriptUrl?: string;
  imageOrigins?: string[];
};

function originOf(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(options: PolicyOptions): string {
  const snapOrigin = originOf(options.snapScriptUrl);
  const midtrans = snapOrigin ? [snapOrigin] : [];
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        `'nonce-${options.nonce}'`,
        "'strict-dynamic'",
        ...midtrans,
        ...(options.development ? ["'unsafe-eval'"] : []),
      ],
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...(options.imageOrigins ?? [])]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...midtrans]],
    ["frame-src", midtrans.length > 0 ? midtrans : ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  const policy = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!options.development) {
    policy.push("upgrade-insecure-requests");
  }
  return policy.join("; ");
}

export function staticSecurityHeaders(production: boolean): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ...(production
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
      : []),
  ];
}

export const apiContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
