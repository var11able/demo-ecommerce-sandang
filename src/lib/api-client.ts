import type { z } from "zod";
import type { ErrorResponse } from "@/contracts/common";

export type ApiFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
};

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

type Output<S> = S extends z.ZodType ? z.output<S> : null;

const unexpected = { code: "network_error", message: "Something went wrong. Try again." };

function errorFrom(body: unknown): ErrorResponse["error"] | null {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }
  const error = (body as { error: unknown }).error;
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return error as ErrorResponse["error"];
  }
  return null;
}

export async function callApi<S extends z.ZodType | null = null>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiResult<Output<S>>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
      signal: init.signal,
    });
  } catch {
    return { ok: false, status: 0, ...unexpected };
  }

  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) {
    return { ok: true, data: body as Output<S> };
  }
  const error = errorFrom(body);
  return error
    ? { ok: false, status: response.status, ...error }
    : { ok: false, status: response.status, ...unexpected };
}

export async function uploadFile<S extends z.ZodType>(
  path: string,
  form: FormData,
): Promise<ApiResult<z.output<S>>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: "POST",
      body: form,
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, status: 0, ...unexpected };
  }
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return { ok: true, data: body as z.output<S> };
  }
  const error = errorFrom(body);
  return error
    ? { ok: false, status: response.status, ...error }
    : { ok: false, status: response.status, ...unexpected };
}
