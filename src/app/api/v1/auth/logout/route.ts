import { logOut } from "@/server/accounts";
import { defineRoute } from "../../_lib/define-route";
import { noContent } from "../../_lib/responses";
import { clearedSessionCookie } from "../../_lib/session-cookie";

export const POST = defineRoute({
  access: "public",
  handle: async ({ sessionToken }) => {
    await logOut(sessionToken);
    return noContent({ "Set-Cookie": clearedSessionCookie() });
  },
});
