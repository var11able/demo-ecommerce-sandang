import { z } from "zod";
import type { ErrorResponse } from "@/contracts/common";
import { StoreError, type StoreErrorCode } from "@/server/errors";

const statusByCode: Record<StoreErrorCode, number> = {
  invalid_request: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  insufficient_stock: 409,
  rate_limited: 429,
  gateway_error: 502,
};

const noStore = { "Cache-Control": "no-store" };

export function respond<S extends z.ZodType>(
  schema: S,
  data: z.input<S>,
  init: { status?: number; headers?: HeadersInit } = {},
): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", noStore["Cache-Control"]);
  }
  return Response.json(schema.parse(data), { status: init.status ?? 200, headers });
}

export function noContent(headers?: HeadersInit): Response {
  const merged = new Headers(headers);
  merged.set("Cache-Control", noStore["Cache-Control"]);
  return new Response(null, { status: 204, headers: merged });
}

export function errorResponse(
  status: number,
  error: ErrorResponse["error"],
  headers?: HeadersInit,
): Response {
  const merged = new Headers(headers);
  merged.set("Cache-Control", noStore["Cache-Control"]);
  if (error.retryAfterSeconds !== undefined) {
    merged.set("Retry-After", String(error.retryAfterSeconds));
  }
  return Response.json({ error }, { status, headers: merged });
}

export function validationErrorResponse(error: z.ZodError): Response {
  const fields = Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]),
  );
  return errorResponse(400, {
    code: "invalid_request",
    message: "Check your details and try again",
    fields,
  });
}

export function storeErrorResponse(error: unknown): Response {
  if (error instanceof StoreError) {
    return errorResponse(statusByCode[error.code], {
      code: error.code,
      message: error.message,
      ...(error.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
    });
  }
  console.error("Unhandled error in an API route", error instanceof Error ? error.name : "unknown");
  return errorResponse(500, { code: "internal_error", message: "Something went wrong" });
}
