import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { StoreError } from "../errors";

export const maxPhotoBytes = 4 * 1024 * 1024;

export type PhotoType = "jpg" | "png" | "webp";

const contentTypes: Record<PhotoType, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const storedName = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "jpg";
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "webp";
  }
  return null;
}

export interface PhotoStore {
  save(name: string, bytes: Uint8Array): Promise<string>;
  read(name: string): Promise<Uint8Array | null>;
}

export class LocalPhotoStore implements PhotoStore {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  async save(name: string, bytes: Uint8Array): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, name), bytes, { flag: "wx" });
    return `/uploads/${name}`;
  }

  async read(name: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(join(this.directory, name)));
    } catch {
      return null;
    }
  }
}

export class BlobPhotoStore implements PhotoStore {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async save(name: string, bytes: Uint8Array): Promise<string> {
    const type = name.split(".").pop() as PhotoType;
    const blob = await put(`uploads/${name}`, Buffer.from(bytes), {
      access: "public",
      addRandomSuffix: false,
      contentType: contentTypes[type],
      token: this.token,
    });
    return blob.url;
  }

  async read(): Promise<Uint8Array | null> {
    return null;
  }
}

type PhotoStoreEnvironment = {
  BLOB_READ_WRITE_TOKEN?: string | undefined;
  UPLOADS_DIR?: string | undefined;
};

export function choosePhotoStore(environment: PhotoStoreEnvironment): PhotoStore {
  if (environment.BLOB_READ_WRITE_TOKEN) {
    return new BlobPhotoStore(environment.BLOB_READ_WRITE_TOKEN);
  }
  return new LocalPhotoStore(environment.UPLOADS_DIR ?? join(process.cwd(), ".data", "uploads"));
}

function photoStore(): PhotoStore {
  return choosePhotoStore({
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    UPLOADS_DIR: process.env.UPLOADS_DIR,
  });
}

export async function storePhoto(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength > maxPhotoBytes) {
    throw new StoreError("invalid_request", "Photos can be at most 4 MB.");
  }
  const type = detectPhotoType(bytes);
  if (!type) {
    throw new StoreError("invalid_request", "Upload a JPEG, PNG, or WebP photo.");
  }
  return photoStore().save(`${randomBytes(16).toString("hex")}.${type}`, bytes);
}

export async function readPhoto(
  name: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const match = storedName.exec(name);
  if (!match?.[1]) {
    return null;
  }
  const bytes = await photoStore().read(name);
  return bytes ? { bytes, contentType: contentTypes[match[1] as PhotoType] } : null;
}
