import { z } from "zod";

export const healthReportSchema = z.strictObject({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["up", "down"]),
});

export type HealthReport = z.infer<typeof healthReportSchema>;
