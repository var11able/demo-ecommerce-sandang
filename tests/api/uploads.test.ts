import { beforeEach, describe, expect, it } from "vitest";
import { POST as upload } from "@/app/api/v1/admin/uploads/route";
import { GET as servePhoto } from "@/app/uploads/[name]/route";
import { uploadResponseSchema } from "@/contracts/admin";
import { registerAdmin, registerCustomer } from "../support/accounts";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);

function formWith(bytes: Uint8Array, filename: string, type: string): FormData {
  const form = new FormData();
  form.set("photo", new File([bytes as BlobPart], filename, { type }));
  return form;
}

function uploadAs(cookie: string, form: FormData, origin?: string) {
  return callRoute(upload, { method: "POST", cookie, form, ...(origin ? { origin } : {}) });
}

describe("photo upload", () => {
  beforeEach(resetDatabase);

  it("stores a photo under a random name and serves it back", async () => {
    const admin = await registerAdmin();
    const response = await uploadAs(
      admin.cookie,
      formWith(pngBytes, "my holiday.png", "image/png"),
    );
    expect(response.status).toBe(201);
    const { url } = uploadResponseSchema.parse(await readJson(response));
    expect(url).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);
    expect(url).not.toContain("holiday");

    const served = await callRoute(servePhoto, { params: { name: url.split("/").pop()! } });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(pngBytes);
  });

  it("takes the type from the file's first bytes, not its name or declared type", async () => {
    const admin = await registerAdmin();
    const disguised = await uploadAs(admin.cookie, formWith(jpegBytes, "photo.png", "image/png"));
    expect(uploadResponseSchema.parse(await readJson(disguised)).url).toMatch(/\.jpg$/);
    const webp = await uploadAs(admin.cookie, formWith(webpBytes, "photo.jpg", "image/jpeg"));
    expect(uploadResponseSchema.parse(await readJson(webp)).url).toMatch(/\.webp$/);

    const script = new TextEncoder().encode("<script>alert(1)</script>");
    const refused = await uploadAs(admin.cookie, formWith(script, "photo.jpg", "image/jpeg"));
    expect(refused.status).toBe(400);
  });

  it("refuses photos over 4 MB", async () => {
    const admin = await registerAdmin();
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(jpegBytes);
    const response = await uploadAs(admin.cookie, formWith(big, "big.jpg", "image/jpeg"));
    expect(response.status).toBe(413);
  });

  it("is open to Admins only, not the demo Admin or Customers", async () => {
    const demo = await registerAdmin("demo_admin");
    const customer = await registerCustomer();
    expect((await uploadAs(demo.cookie, formWith(pngBytes, "a.png", "image/png"))).status).toBe(
      403,
    );
    expect((await uploadAs(customer.cookie, formWith(pngBytes, "a.png", "image/png"))).status).toBe(
      403,
    );
  });

  it("still checks the Origin", async () => {
    const admin = await registerAdmin();
    const response = await uploadAs(
      admin.cookie,
      formWith(pngBytes, "a.png", "image/png"),
      "https://evil.example",
    );
    expect(response.status).toBe(403);
  });

  it("answers not found for names it did not create", async () => {
    for (const name of ["../../.env", "abc.png", "0123456789abcdef0123456789abcdef.svg"]) {
      expect((await callRoute(servePhoto, { params: { name } })).status).toBe(404);
    }
  });
});
