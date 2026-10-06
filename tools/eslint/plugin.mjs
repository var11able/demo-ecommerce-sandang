import { noArbitraryStyleValues } from "./no-arbitrary-style-values.mjs";
import { noComments } from "./no-comments.mjs";
import { noSecretEnv } from "./no-secret-env.mjs";
import { noServerActions } from "./no-server-actions.mjs";
import { requireServerOnly } from "./require-server-only.mjs";

export const sandangPlugin = {
  meta: { name: "sandang" },
  rules: {
    "no-arbitrary-style-values": noArbitraryStyleValues,
    "no-comments": noComments,
    "no-secret-env": noSecretEnv,
    "no-server-actions": noServerActions,
    "require-server-only": requireServerOnly,
  },
};
