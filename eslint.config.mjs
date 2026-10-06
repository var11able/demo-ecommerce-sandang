import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { sandangPlugin } from "./tools/eslint/plugin.mjs";

const storefrontImports = {
  paths: [
    { name: "react", message: "src/server must not depend on React." },
    { name: "react-dom", message: "src/server must not depend on React." },
    { name: "next", message: "src/server must not depend on Next.js." },
  ],
  patterns: [
    { group: ["react/*", "react-dom/*"], message: "src/server must not depend on React." },
    { group: ["next/*", "@next/*"], message: "src/server must not depend on Next.js." },
    {
      group: [
        "@/app",
        "@/app/*",
        "@/components",
        "@/components/*",
        "@/lib",
        "@/lib/*",
        "**/app/**",
        "**/components/**",
        "**/lib/**",
      ],
      message: "src/server must not import from the storefront.",
    },
  ],
};

const serverOnlyImports = {
  paths: [
    { name: "@prisma/client", message: "Only src/server talks to the database." },
    { name: "@prisma/adapter-pg", message: "Only src/server talks to the database." },
    { name: "pg", message: "Only src/server talks to the database." },
  ],
  patterns: [
    { group: ["@/generated", "@/generated/*"], message: "Only src/server talks to the database." },
    {
      group: ["@/server/*/*"],
      message: "Import a src/server feature through its index.ts only.",
    },
  ],
};

const prismaClientImports = {
  paths: [
    { name: "@prisma/adapter-pg", message: "Only src/server/db.ts creates the Prisma client." },
    { name: "pg", message: "Only src/server/db.ts creates the Prisma client." },
  ],
  patterns: [
    {
      group: ["@/generated", "@/generated/*", "**/generated/prisma/*"],
      message: "Only src/server/db.ts creates the Prisma client.",
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "docs/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    plugins: { sandang: sandangPlugin },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "sandang/no-comments": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: ["src/server/**"],
    rules: {
      "no-restricted-imports": ["error", serverOnlyImports],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**"],
    rules: {
      "sandang/no-arbitrary-style-values": "error",
    },
  },
  {
    files: ["src/server/**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "sandang/require-server-only": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [...storefrontImports.paths, ...prismaClientImports.paths],
          patterns: [...storefrontImports.patterns, ...prismaClientImports.patterns],
        },
      ],
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/server",
              from: ["./src/app", "./src/components", "./src/lib"],
              message: "src/server must not import from the storefront.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/db.ts"],
    rules: {
      "no-restricted-imports": ["error", storefrontImports],
    },
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: [
      "src/components/home-sequences.tsx",
      "src/server/payments/midtrans/**",
      "src/server/payments/registry.ts",
      "src/app/api/v1/payments/midtrans/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value=/^gsap/]",
          message: "GSAP runs only on Home. Import it in src/components/home-sequences.tsx.",
        },
        {
          selector: "ImportDeclaration[source.value=/midtrans/]",
          message:
            "Only src/server/payments/midtrans knows about Midtrans. Use the PaymentGateway interface.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "react/no-danger": "error",
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: "Session tokens live only in the httpOnly cookie." },
        { name: "sessionStorage", message: "Session tokens live only in the httpOnly cookie." },
      ],
      "no-restricted-properties": [
        "error",
        { property: "$queryRawUnsafe", message: "Use $queryRaw with template parameters." },
        { property: "$executeRawUnsafe", message: "Use $executeRaw with template parameters." },
        {
          object: "window",
          property: "localStorage",
          message: "Session tokens live only in the httpOnly cookie.",
        },
        {
          object: "window",
          property: "sessionStorage",
          message: "Session tokens live only in the httpOnly cookie.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: ["src/server/**"],
    rules: {
      "sandang/no-secret-env": "error",
      "sandang/no-server-actions": "error",
    },
  },
  {
    files: ["src/components/json-ld.tsx"],
    rules: {
      "react/no-danger": "off",
    },
  },
]);
