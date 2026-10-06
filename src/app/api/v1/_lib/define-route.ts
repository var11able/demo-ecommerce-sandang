import type { NextRequest } from "next/server";
import { z } from "zod";
import { findSessionCustomer, type SessionCustomer } from "@/server/accounts";
import { readEnvironment } from "@/server/env";
import { errorResponse, storeErrorResponse, validationErrorResponse } from "./responses";
import { sessionCookieName } from "./session-cookie";

export type Access = "public" | "customer" | "admin" | "machine";
export type BodyType = "json" | "multipart" | "raw";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const emptyObject = z.strictObject({});
type EmptyObject = typeof emptyObject;

type RouteParams = { params: Promise<Record<string, string | string[] | undefined>> };

type ViewerFor<A extends Access> = A extends "customer" | "admin"
  ? SessionCustomer
  : A extends "public"
    ? SessionCustomer | null
    : null;

export type RouteInput<A extends Access, Q, B, P> = {
  request: NextRequest;
  query: Q;
  body: B;
  params: P;
  viewer: ViewerFor<A>;
  visitor: string;
  sessionToken: string | undefined;
};

type RouteSpec<A extends Access, Q extends z.ZodType, B extends z.ZodType, P extends z.ZodType> = {
  access: A;
  bodyType?: BodyType;
  query?: Q;
  body?: B;
  params?: P;
  allowDemoAdmin?: boolean;
  handle: (input: RouteInput<A, z.output<Q>, z.output<B>, z.output<P>>) => Promise<Response>;
};

export type RouteHandler = ((request: NextRequest, context: RouteParams) => Promise<Response>) & {
  access: Access;
};

class RequestRefused extends Error {
  readonly response: Response;

  constructor(response: Response) {
    super("Request refused");
    this.response = response;
  }
}

function invalid(message: string): RequestRefused {
  return new RequestRefused(
    validationErrorResponse(new z.ZodError([{ code: "custom", path: [], message, input: null }])),
  );
}

function parseOrRefuse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new RequestRefused(validationErrorResponse(result.error));
  }
  return result.data;
}

export function visitorAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function checkForgedRequest(request: NextRequest, bodyType: BodyType, hasBody: boolean): void {
  if (request.headers.get("origin") !== readEnvironment().APP_ORIGIN) {
    throw new RequestRefused(
      errorResponse(403, { code: "forbidden", message: "This request was refused." }),
    );
  }
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const expected = bodyType === "multipart" ? "multipart/form-data" : "application/json";
  if (hasBody && contentType !== expected) {
    throw new RequestRefused(
      errorResponse(415, { code: "unsupported_media_type", message: `Send ${expected}.` }),
    );
  }
}

async function readJsonBody(text: string): Promise<unknown> {
  if (text.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw invalid("Body must be JSON");
  }
}

async function resolveViewer(
  access: Access,
  token: string | undefined,
  allowDemoAdmin: boolean,
): Promise<SessionCustomer | null> {
  if (access === "machine") {
    return null;
  }
  const viewer = await findSessionCustomer(token);
  if (access === "public") {
    return viewer;
  }
  if (!viewer) {
    throw new RequestRefused(
      errorResponse(401, { code: "unauthenticated", message: "Log in to continue." }),
    );
  }
  if (access === "admin") {
    const allowed = viewer.role === "admin" || (viewer.role === "demo_admin" && allowDemoAdmin);
    if (!allowed) {
      throw new RequestRefused(
        errorResponse(403, {
          code: "forbidden",
          message:
            viewer.role === "demo_admin"
              ? "The demo Admin cannot do this."
              : "You do not have access to this.",
        }),
      );
    }
  }
  return viewer;
}

export function defineRoute<
  A extends Access,
  Q extends z.ZodType = EmptyObject,
  B extends z.ZodType = EmptyObject,
  P extends z.ZodType = z.ZodType<Record<string, string>>,
>(spec: RouteSpec<A, Q, B, P>): RouteHandler {
  const bodyType = spec.bodyType ?? "json";
  const handler = async (request: NextRequest, context: RouteParams): Promise<Response> => {
    try {
      const changesState = stateChangingMethods.has(request.method);
      const rawBody = changesState && bodyType !== "multipart" ? await request.text() : "";
      if (changesState && spec.access !== "machine") {
        checkForgedRequest(request, bodyType, bodyType === "multipart" || rawBody.trim() !== "");
      }
      const sessionToken = request.cookies.get(sessionCookieName)?.value;
      const viewer = (await resolveViewer(
        spec.access,
        sessionToken,
        spec.allowDemoAdmin ?? false,
      )) as ViewerFor<A>;
      const query = parseOrRefuse(
        spec.query ?? emptyObject,
        Object.fromEntries(request.nextUrl.searchParams),
      ) as z.output<Q>;
      const params = (
        spec.params ? parseOrRefuse(spec.params, await context.params) : await context.params
      ) as z.output<P>;
      const body = (
        bodyType === "json" && changesState
          ? parseOrRefuse(spec.body ?? emptyObject, await readJsonBody(rawBody))
          : bodyType === "raw"
            ? rawBody
            : {}
      ) as z.output<B>;
      return await spec.handle({
        request,
        query,
        body,
        params,
        viewer,
        visitor: visitorAddress(request),
        sessionToken,
      });
    } catch (error) {
      if (error instanceof RequestRefused) {
        return error.response;
      }
      return storeErrorResponse(error);
    }
  };
  return Object.assign(handler, { access: spec.access });
}
