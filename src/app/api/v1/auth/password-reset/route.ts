import { passwordResetRequestBodySchema, passwordResetResponseSchema } from "@/contracts/accounts";
import { requestPasswordReset, resetRequested } from "@/server/accounts";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const POST = defineRoute({
  access: "public",
  body: passwordResetRequestBodySchema,
  handle: async ({ body, visitor }) => {
    await requestPasswordReset(body.email, visitor);
    return respond(passwordResetResponseSchema, { message: resetRequested }, { status: 202 });
  },
});
