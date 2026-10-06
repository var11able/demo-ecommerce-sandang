import "server-only";
import { hashPassword } from "../accounts";
import { getDb } from "../db";
import { readEnvironment, readSeedAdmin, type SeedAdmin } from "../env";
import { demoLogins } from "./demo-accounts";

export type SeedAccountsResult = { admin: "created" | "updated" | "skipped"; demoAccounts: number };

async function upsertAccount(account: {
  email: string;
  password: string;
  name: string;
  role: "customer" | "admin" | "demo_admin";
}): Promise<"created" | "updated"> {
  const db = getDb();
  const { password, ...profile } = account;
  const passwordHash = await hashPassword(password);
  const existing = await db.customer.findUnique({ where: { email: profile.email } });
  await db.customer.upsert({
    where: { email: profile.email },
    create: { ...profile, passwordHash, isSeeded: true },
    update: { passwordHash, role: profile.role, isSeeded: true },
  });
  return existing ? "updated" : "created";
}

export async function seedAccounts(
  options: { admin?: SeedAdmin | null; demoMode?: boolean } = {},
): Promise<SeedAccountsResult> {
  const admin = options.admin === undefined ? readSeedAdmin() : options.admin;
  const demoMode = options.demoMode ?? readEnvironment().DEMO_MODE;

  const adminResult = admin
    ? await upsertAccount({ ...admin, name: "Admin", role: "admin" })
    : "skipped";

  let demoAccounts = 0;
  if (demoMode) {
    for (const login of demoLogins) {
      await upsertAccount(login);
      demoAccounts += 1;
    }
  }
  return { admin: adminResult, demoAccounts };
}
