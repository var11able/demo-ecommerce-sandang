import { uploadResponseSchema } from "@/contracts/admin";
import { maxPhotoBytes, storePhoto } from "@/server/media";
import { defineRoute } from "../../_lib/define-route";
import { errorResponse, respond } from "../../_lib/responses";

const maxRequestBytes = maxPhotoBytes + 64 * 1024;

export const POST = defineRoute({
  access: "admin",
  bodyType: "multipart",
  handle: async ({ request }) => {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > maxRequestBytes) {
      return errorResponse(413, { code: "too_large", message: "Photos can be at most 4 MB." });
    }
    const form = await request.formData().catch(() => null);
    const photo = form?.get("photo");
    if (!(photo instanceof File)) {
      return errorResponse(400, { code: "invalid_request", message: "Choose a photo to upload." });
    }
    if (photo.size > maxPhotoBytes) {
      return errorResponse(413, { code: "too_large", message: "Photos can be at most 4 MB." });
    }
    const url = await storePhoto(new Uint8Array(await photo.arrayBuffer()));
    return respond(uploadResponseSchema, { url }, { status: 201 });
  },
});
