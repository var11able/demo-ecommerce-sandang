import { isScheduledJobAuthorized, runDailyJob } from "@/server/maintenance";
import { defineRoute } from "../../_lib/define-route";
import { errorResponse } from "../../_lib/responses";

export const GET = defineRoute({
  access: "machine",
  handle: async ({ request }) => {
    if (!isScheduledJobAuthorized(request.headers.get("authorization"))) {
      return errorResponse(401, { code: "unauthenticated", message: "Not accepted" });
    }
    await runDailyJob();
    return Response.json({ done: true }, { headers: { "Cache-Control": "no-store" } });
  },
});
