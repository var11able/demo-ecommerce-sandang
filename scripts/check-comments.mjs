import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const roots = ["src", "tests", "prisma"];
const skippedDirectories = new Set(["node_modules", "generated"]);
const commentPatterns = {
  ".css": /\/\*/,
  ".scss": /\/\*|\/\//,
  ".prisma": /\/\//,
  ".sql": /--|\/\*/,
  ".toml": /#/,
};
const quotedText = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

function* filesUnder(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        yield* filesUnder(path);
      }
    } else {
      yield path;
    }
  }
}

const findings = [];
for (const root of roots) {
  for (const file of filesUnder(root)) {
    const pattern = commentPatterns[extname(file)];
    if (!pattern) {
      continue;
    }
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line.replace(quotedText, ""))) {
        findings.push(`${relative(".", file)}:${index + 1}  ${line.trim()}`);
      }
    });
  }
}

if (findings.length > 0) {
  console.error("Comments are not allowed in source code:");
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}
