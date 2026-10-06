const secretNames = new Set([
  "DATABASE_URL",
  "CRON_SECRET",
  "MIDTRANS_SERVER_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
]);

export const noSecretEnv = {
  meta: {
    type: "problem",
    docs: { description: "Read secrets only inside src/server" },
    schema: [],
    messages: { secret: "{{name}} is a secret. Read it only inside src/server." },
  },
  create(context) {
    return {
      MemberExpression(node) {
        const isProcessEnv =
          node.object.type === "MemberExpression" &&
          node.object.object.type === "Identifier" &&
          node.object.object.name === "process" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "env";
        if (!isProcessEnv) {
          return;
        }
        const name =
          node.property.type === "Identifier"
            ? node.property.name
            : node.property.type === "Literal"
              ? String(node.property.value)
              : null;
        if (name && secretNames.has(name)) {
          context.report({ node, messageId: "secret", data: { name } });
        }
      },
    };
  },
};
