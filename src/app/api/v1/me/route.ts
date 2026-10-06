import { customerResponseSchema } from "@/contracts/accounts";
import { defineRoute } from "../_lib/define-route";
import { respond } from "../_lib/responses";

export const GET = defineRoute({
  access: "customer",
  handle: async ({ viewer }) =>
    respond(customerResponseSchema, {
      customer: { email: viewer.email, name: viewer.name, role: viewer.role },
    }),
});
