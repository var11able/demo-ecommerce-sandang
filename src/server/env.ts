import "server-only";
import { z } from "zod";

const booleanFlag = z.enum(["true", "false"]).transform((value) => value === "true");

const environmentSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    APP_ORIGIN: z.url({ protocol: /^https?$/ }),
    CRON_SECRET: z.string().min(16),
    DEMO_MODE: booleanFlag,
    MIDTRANS_IS_PRODUCTION: booleanFlag,
    MIDTRANS_SERVER_KEY: z.string().min(10),
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(10),
    NEXT_PUBLIC_MIDTRANS_SNAP_URL: z.url({ protocol: /^https$/ }),
  })
  .refine((environment) => !(environment.DEMO_MODE && environment.MIDTRANS_IS_PRODUCTION), {
    path: ["MIDTRANS_IS_PRODUCTION"],
    message: "must be false while DEMO_MODE is true",
  });

export type Environment = z.infer<typeof environmentSchema>;

export const requiredEnvironmentVariables = Object.keys(environmentSchema.shape);

export class EnvironmentError extends Error {
  constructor(readonly problems: string[]) {
    super(`Environment is not configured: ${problems.join("; ")}`);
    this.name = "EnvironmentError";
  }
}

type EnvironmentSource = Record<string, string | undefined>;

function withoutEmptyValues(source: EnvironmentSource): EnvironmentSource {
  return Object.fromEntries(
    requiredEnvironmentVariables.map((name) => [
      name,
      source[name] === "" ? undefined : source[name],
    ]),
  );
}

function describeProblem(issue: z.core.$ZodIssue, source: EnvironmentSource): string {
  const name = String(issue.path[0] ?? "environment");
  if (source[name] === undefined) {
    return `${name} is missing`;
  }
  if (issue.code === "custom") {
    return `${name} ${issue.message}`;
  }
  return `${name} is invalid`;
}

export function parseEnvironment(source: EnvironmentSource): Environment {
  const present = withoutEmptyValues(source);
  const result = environmentSchema.safeParse(present);
  if (!result.success) {
    throw new EnvironmentError(result.error.issues.map((issue) => describeProblem(issue, present)));
  }
  return result.data;
}

let cachedEnvironment: Environment | undefined;

export function readEnvironment(): Environment {
  cachedEnvironment ??= parseEnvironment(process.env);
  return cachedEnvironment;
}

const seedAdminSchema = z.object({
  ADMIN_EMAIL: z
    .string({ message: "ADMIN_EMAIL is missing" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "ADMIN_EMAIL must be an email address" })),
  ADMIN_PASSWORD: z
    .string({ message: "ADMIN_PASSWORD is missing" })
    .min(10, { message: "ADMIN_PASSWORD must be at least 10 characters" })
    .max(128, { message: "ADMIN_PASSWORD must be at most 128 characters" }),
});

export type SeedAdmin = { email: string; password: string };

export function readSeedAdmin(source: EnvironmentSource = process.env): SeedAdmin | null {
  if (!source.ADMIN_EMAIL && !source.ADMIN_PASSWORD) {
    return null;
  }
  const result = seedAdminSchema.safeParse(source);
  if (!result.success) {
    throw new EnvironmentError(result.error.issues.map((issue) => issue.message));
  }
  return { email: result.data.ADMIN_EMAIL, password: result.data.ADMIN_PASSWORD };
}
