const arbitraryValue = /(?:^|[\s:])-?[a-z][\w-]*-\[(?:#|rgb|hsl|oklch|\d)/i;
const hexColour = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function checkClassText(context, node, text) {
  if (arbitraryValue.test(text)) {
    context.report({ node, messageId: "arbitrary" });
  }
}

export const noArbitraryStyleValues = {
  meta: {
    type: "problem",
    docs: { description: "Disallow hard-coded colours and sizes in storefront code" },
    schema: [],
    messages: {
      arbitrary:
        "Use a design token instead of an arbitrary value. Add the token to src/styles/tokens.css if it is missing.",
      hex: "Use a colour token instead of a hex value.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== "string") {
          return;
        }
        if (hexColour.test(node.value)) {
          context.report({ node, messageId: "hex" });
          return;
        }
        checkClassText(context, node, node.value);
      },
      TemplateElement(node) {
        checkClassText(context, node, node.value.raw);
      },
    };
  },
};
