import { NextRequest } from "next/server";

export const testOrigin = "http://localhost:3000";

type Handler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) => Promise<Response>;

export type CallOptions = {
  method?: string;
  path?: string;
  query?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
  form?: FormData;
  headers?: Record<string, string>;
  cookie?: string;
  origin?: string | null;
  ip?: string;
};

export async function callRoute(handler: Handler, options: CallOptions = {}): Promise<Response> {
  const method = options.method ?? "GET";
  const url = new URL(options.path ?? "/api/v1/test", testOrigin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const headers = new Headers(options.headers);
  const sendsBody = options.body !== undefined || options.rawBody !== undefined;
  const formBody = options.form;
  if (sendsBody && !formBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (method !== "GET" && options.origin !== null) {
    headers.set("origin", options.origin ?? testOrigin);
  }
  if (options.cookie) {
    headers.set("cookie", options.cookie);
  }
  headers.set("x-forwarded-for", options.ip ?? "203.0.113.10");
  const request = new NextRequest(url, {
    method,
    headers,
    body:
      formBody ??
      options.rawBody ??
      (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  return handler(request, { params: Promise.resolve(options.params ?? {}) });
}

export async function readJson<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
