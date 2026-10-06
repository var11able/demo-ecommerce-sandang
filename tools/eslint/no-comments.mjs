const toolDirective =
  /^\s*(eslint-disable|eslint-enable|eslint-disable-line|eslint-disable-next-line|@ts-expect-error)\b/;

export const noComments = {
  meta: {
    type: "problem",
    docs: { description: "Disallow comments in source code, except tool directives" },
    schema: [],
    messages: {
      comment:
        "Comments are not allowed in source code. Rename, extract, or add a type instead; record decisions in docs/adr/.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === "Shebang" || toolDirective.test(comment.value)) {
            continue;
          }
          context.report({ loc: comment.loc, messageId: "comment" });
        }
      },
    };
  },
};
