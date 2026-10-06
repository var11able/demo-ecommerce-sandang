import { newsletterResponseSchema, subscribeBodySchema } from "@/contracts/newsletter";
import { subscribe } from "@/server/newsletter";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const POST = defineRoute({
  access: "public",
  body: subscribeBodySchema,
  handle: async ({ body, visitor }) =>
    respond(newsletterResponseSchema, await subscribe(body.email, visitor)),
});
