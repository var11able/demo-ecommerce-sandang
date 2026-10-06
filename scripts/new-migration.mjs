import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripSqlComments } from "./sql-comments.mjs";

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Usage: pnpm db:migrate <name_in_snake_case>");
  process.exit(1);
}

const sql = execFileSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf8" },
);

const cleaned = stripSqlComments(sql);
if (cleaned.trim() === "") {
  console.log("The schema matches the database. No migration created.");
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const directory = join("prisma", "migrations", `${timestamp}_${name}`);
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "migration.sql"), cleaned);
console.log(`Created ${directory}/migration.sql. Review it, then run pnpm db:apply.`);
