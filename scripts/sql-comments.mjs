export function stripSqlComments(sql) {
  const kept = sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return kept === "" ? "" : `${kept}\n`;
}

export function stripTomlComments(toml) {
  return toml
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")
    .trim()
    .concat("\n");
}
