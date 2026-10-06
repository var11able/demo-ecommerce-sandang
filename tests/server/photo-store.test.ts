import { describe, expect, it } from "vitest";
import { BlobPhotoStore, LocalPhotoStore, choosePhotoStore } from "@/server/media";

describe("choosePhotoStore", () => {
  it("uses Vercel Blob when a Blob token is configured", () => {
    expect(choosePhotoStore({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" })).toBeInstanceOf(
      BlobPhotoStore,
    );
  });

  it("keeps photos on the local disk otherwise", () => {
    expect(choosePhotoStore({})).toBeInstanceOf(LocalPhotoStore);
    expect(choosePhotoStore({ BLOB_READ_WRITE_TOKEN: "" })).toBeInstanceOf(LocalPhotoStore);
  });
});
