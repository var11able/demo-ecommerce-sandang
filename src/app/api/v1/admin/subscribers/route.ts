import { subscriberListQuerySchema, subscriberListResponseSchema } from "@/contracts/newsletter";
import { listSubscribers, subscribersToCsv } from "@/server/newsletter";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const GET = defineRoute({
  access: "admin",
  query: subscriberListQuerySchema,
  handle: async ({ query }) => {
    const subscribers = await listSubscribers();
    if (query.format === "csv") {
      const date = new Date().toISOString().slice(0, 10);
      return new Response(subscribersToCsv(subscribers), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="subscribers-${date}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return respond(subscriberListResponseSchema, { subscribers });
  },
});
