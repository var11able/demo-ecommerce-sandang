import { z } from "zod";
import { readPhoto } from "@/server/media";
import { defineRoute } from "../../api/v1/_lib/define-route";
import { errorResponse } from "../../api/v1/_lib/responses";

export const GET = defineRoute({
  access: "public",
  params: z.strictObject({ name: z.string().max(64) }),
  handle: async ({ params }) => {
    const photo = await readPhoto(params.name);
    if (!photo) {
      return errorResponse(404, { code: "not_found", message: "Photo not found" });
    }
    return new Response(new Blob([photo.bytes as BlobPart]), {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
});
