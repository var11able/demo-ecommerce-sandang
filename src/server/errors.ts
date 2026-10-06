import "server-only";

export type StoreErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "insufficient_stock"
  | "rate_limited"
  | "gateway_error";

export class StoreError extends Error {
  readonly code: StoreErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: StoreErrorCode, message: string, options?: { retryAfterSeconds?: number }) {
    super(message);
    this.name = "StoreError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function notFound(message = "Not found"): StoreError {
  return new StoreError("not_found", message);
}
