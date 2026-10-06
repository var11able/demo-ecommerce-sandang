export const requireServerOnly = {
  meta: {
    type: "problem",
    docs: { description: 'Require `import "server-only"` as the first statement' },
    schema: [],
    messages: {
      missing: 'Every file in src/server must start with `import "server-only";`.',
    },
  },
  create(context) {
    return {
      Program(program) {
        const first = program.body[0];
        const marked =
          first?.type === "ImportDeclaration" &&
          first.source.value === "server-only" &&
          first.specifiers.length === 0;
        if (!marked) {
          context.report({ node: program, messageId: "missing" });
        }
      },
    };
  },
};
