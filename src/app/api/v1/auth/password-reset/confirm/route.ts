import { passwordResetConfirmBodySchema, passwordResetResponseSchema } from "@/contracts/accounts";
import { completePasswordReset, resetDone } from "@/server/accounts";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const POST = defineRoute({
  access: "public",
  body: passwordResetConfirmBodySchema,
  handle: async ({ body, visitor }) => {
    await completePasswordReset(body, visitor);
    return respond(passwordResetResponseSchema, { message: resetDone });
  },
});
