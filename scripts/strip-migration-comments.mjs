import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripSqlComments, stripTomlComments } from "./sql-comments.mjs";

const migrationsDirectory = "prisma/migrations";

function rewrite(file, clean) {
  const original = readFileSync(file, "utf8");
  const cleaned = clean(original);
  if (cleaned !== original) {
    writeFileSync(file, cleaned);
    console.log(`Removed comments from ${file}`);
  }
}

rewrite(join(migrationsDirectory, "migration_lock.toml"), stripTomlComments);
for (const entry of readdirSync(migrationsDirectory, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    rewrite(join(migrationsDirectory, entry.name, "migration.sql"), stripSqlComments);
  }
}
