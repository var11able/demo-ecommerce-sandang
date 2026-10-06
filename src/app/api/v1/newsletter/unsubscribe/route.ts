import { newsletterResponseSchema, unsubscribeBodySchema } from "@/contracts/newsletter";
import { unsubscribe } from "@/server/newsletter";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const POST = defineRoute({
  access: "public",
  body: unsubscribeBodySchema,
  handle: async ({ body }) => respond(newsletterResponseSchema, await unsubscribe(body.token)),
});
