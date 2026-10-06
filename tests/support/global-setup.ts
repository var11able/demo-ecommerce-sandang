import { execSync } from "node:child_process";

export default function applyMigrationsToTestDatabase(): void {
  execSync("pnpm exec prisma migrate deploy", { stdio: "pipe", env: process.env });
}
