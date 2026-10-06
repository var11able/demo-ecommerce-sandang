import { customerResponseSchema, registerBodySchema } from "@/contracts/accounts";
import { register } from "@/server/accounts";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";
import { sessionCookie } from "../../_lib/session-cookie";

export const POST = defineRoute({
  access: "public",
  body: registerBodySchema,
  handle: async ({ body, visitor }) => {
    const { customer, token } = await register(body, visitor);
    return respond(
      customerResponseSchema,
      { customer: { email: customer.email, name: customer.name, role: customer.role } },
      { status: 201, headers: { "Set-Cookie": sessionCookie(token) } },
    );
  },
});
