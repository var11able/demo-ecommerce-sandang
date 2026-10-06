import { healthReportSchema } from "@/contracts/health";
import { checkHealth } from "@/server/health";
import { defineRoute } from "../_lib/define-route";
import { respond } from "../_lib/responses";

export const GET = defineRoute({
  access: "public",
  handle: async () => {
    const report = await checkHealth();
    return respond(healthReportSchema, report, { status: report.database === "up" ? 200 : 503 });
  },
});
