import { execSync } from "node:child_process";
import { Client } from "pg";

async function prepareEndToEndDatabase(): Promise<void> {
  const env = { ...process.env };
  execSync("pnpm exec prisma migrate deploy", { stdio: "pipe", env });

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    if (rows.length > 0) {
      const names = rows.map(({ tablename }) => `"${tablename}"`).join(", ");
      await client.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }

  execSync("pnpm exec prisma db seed", { stdio: "pipe", env });
}

await prepareEndToEndDatabase();
