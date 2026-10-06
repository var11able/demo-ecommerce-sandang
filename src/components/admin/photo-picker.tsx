"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import type { uploadResponseSchema } from "@/contracts/admin";
import { uploadFile } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { Button } from "../ui/button";

async function uploadPhoto(file: File): Promise<{ url: string } | { error: string }> {
  const form = new FormData();
  form.set("photo", file);
  const result = await uploadFile<typeof uploadResponseSchema>("/admin/uploads", form);
  return result.ok ? { url: result.data.url } : { error: result.message };
}

export function PhotoPicker({
  images,
  onChange,
  canUpload,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  canUpload: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setUploading(true);
    setMessage(null);
    const result = await uploadPhoto(file);
    setUploading(false);
    if ("url" in result) {
      onChange([...images, result.url]);
    } else {
      setMessage(result.error);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-body">{copy.admin.productFields.photos}</legend>
      <ul className="flex flex-wrap gap-3">
        {images.map((image) => (
          <li key={image} className="flex flex-col items-start gap-2">
            <span className="relative block size-24 overflow-hidden bg-fog">
              <Image src={image} alt="" fill sizes="96px" className="object-cover" />
            </span>
            <Button
              variant="quiet"
              onClick={() => onChange(images.filter((item) => item !== image))}
            >
              {copy.admin.productFields.removePhoto}
            </Button>
          </li>
        ))}
      </ul>
      {canUpload && (
        <label className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-control border border-ink px-5 text-body has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
          {uploading ? copy.admin.productFields.uploading : copy.admin.productFields.upload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      )}
      <p role="alert" className="text-caption text-danger empty:hidden">
        {message}
      </p>
    </fieldset>
  );
}
