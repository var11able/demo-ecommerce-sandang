export const noServerActions = {
  meta: {
    type: "problem",
    docs: { description: "Disallow server actions; changes go through /api/v1 routes" },
    schema: [],
    messages: {
      serverAction: "Server actions are not used. Send changes to an /api/v1 route instead.",
    },
  },
  create(context) {
    return {
      ExpressionStatement(node) {
        if (node.directive === "use server") {
          context.report({ node, messageId: "serverAction" });
        }
      },
    };
  },
};
