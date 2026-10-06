import { customerResponseSchema, loginBodySchema } from "@/contracts/accounts";
import { logIn } from "@/server/accounts";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";
import { sessionCookie } from "../../_lib/session-cookie";

export const POST = defineRoute({
  access: "public",
  body: loginBodySchema,
  handle: async ({ body, visitor, sessionToken }) => {
    const { customer, token } = await logIn(body, visitor, sessionToken);
    return respond(
      customerResponseSchema,
      { customer: { email: customer.email, name: customer.name, role: customer.role } },
      { headers: { "Set-Cookie": sessionCookie(token) } },
    );
  },
});
