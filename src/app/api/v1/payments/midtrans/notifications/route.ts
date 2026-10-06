import { receiveNotification } from "@/server/payments";
import { defineRoute } from "../../../_lib/define-route";
import { errorResponse } from "../../../_lib/responses";

const maxBodyLength = 64 * 1024;

export const POST = defineRoute({
  access: "machine",
  bodyType: "raw",
  handle: async ({ body }) => {
    const rawBody = String(body);
    const { accepted } =
      rawBody.length > maxBodyLength ? { accepted: false } : await receiveNotification(rawBody);
    return accepted
      ? Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } })
      : errorResponse(401, { code: "unauthenticated", message: "Not accepted" });
  },
});
