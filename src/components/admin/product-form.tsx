"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { adminProductResponseSchema, AdminCategory, AdminProduct } from "@/contracts/admin";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { Button } from "../ui/button";
import { Notice } from "../ui/notice";
import { SelectField } from "../ui/select-field";
import { TextAreaField, TextField } from "../ui/text-field";
import { PhotoPicker } from "./photo-picker";

type Feedback = { tone: "success" | "problem"; text: string } | null;

function colourFromForm(form: FormData): { name: string; hex: string } | null {
  const name = String(form.get("colourName") ?? "").trim();
  const hex = String(form.get("colourHex") ?? "").trim();
  return name || hex ? { name, hex } : null;
}

function variantFromForm(form: FormData) {
  return {
    name: String(form.get("variantName") ?? "").trim(),
    price: Number(form.get("price")),
    stock: Number(form.get("stock")),
    weightGrams: Number(form.get("weightGrams")),
  };
}

function VariantFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults?: { name: string; price: number; stock: number; weightGrams: number };
}) {
  const fields = copy.admin.productFields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField
        id={`${idPrefix}-name`}
        name="variantName"
        label={fields.variantName}
        defaultValue={defaults?.name}
        maxLength={50}
        required
      />
      <TextField
        id={`${idPrefix}-price`}
        name="price"
        type="number"
        min={1}
        step={1}
        label={fields.price}
        defaultValue={defaults?.price}
        required
      />
      <TextField
        id={`${idPrefix}-stock`}
        name="stock"
        type="number"
        min={0}
        step={1}
        label={fields.stock}
        defaultValue={defaults?.stock}
        required
      />
      <TextField
        id={`${idPrefix}-weight`}
        name="weightGrams"
        type="number"
        min={1}
        step={1}
        label={fields.weight}
        defaultValue={defaults?.weightGrams}
        required
      />
    </div>
  );
}

function VariantEditor({
  variant,
  onSaved,
}: {
  variant: AdminProduct["variants"][number];
  onSaved: (product: AdminProduct) => void;
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);
    const result = await callApi<typeof adminProductResponseSchema>(
      `/admin/variants/${variant.id}`,
      {
        method: "PATCH",
        body: variantFromForm(new FormData(event.currentTarget)),
      },
    );
    setPending(false);
    if (result.ok && result.data) {
      onSaved(result.data.product);
      setFeedback({ tone: "success", text: copy.admin.saved });
    } else if (!result.ok) {
      setFeedback({ tone: "problem", text: result.message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-b border-line pb-5">
      <VariantFields idPrefix={`variant-${variant.id}`} defaults={variant} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? copy.admin.saving : copy.admin.productFields.saveVariant}
        </Button>
        <span className="text-caption text-muted">
          {copy.admin.productFields.reserved}: {variant.reserved}
        </span>
        {feedback && (
          <span
            role="status"
            className={
              feedback.tone === "problem" ? "text-caption text-danger" : "text-caption text-success"
            }
          >
            {feedback.text}
          </span>
        )}
      </div>
    </form>
  );
}

export function ProductForm({
  product,
  categories,
  canCreate,
  canUpload,
}: {
  product: AdminProduct | null;
  categories: Pick<AdminCategory, "slug" | "name">[];
  canCreate: boolean;
  canUpload: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(product);
  const [images, setImages] = useState(product?.images ?? []);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const fields = copy.admin.productFields;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const slug = String(form.get("slug") ?? "").trim();
    const productFields = {
      name: String(form.get("name") ?? "").trim(),
      categorySlug: String(form.get("categorySlug") ?? ""),
      material: String(form.get("material") ?? "").trim(),
      colour: colourFromForm(form),
      styleGroup: String(form.get("styleGroup") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim(),
      isPublished: form.get("isPublished") === "on",
      images,
      ...(slug ? { slug } : {}),
    };
    setPending(true);
    setFeedback(null);
    const result = current
      ? await callApi<typeof adminProductResponseSchema>(`/admin/products/${current.id}`, {
          method: "PATCH",
          body: productFields,
        })
      : await callApi<typeof adminProductResponseSchema>("/admin/products", {
          method: "POST",
          body: { ...productFields, variants: [variantFromForm(form)] },
        });
    setPending(false);
    if (result.ok && result.data) {
      const saved = result.data.product;
      if (!current) {
        router.replace(`/admin/products/${saved.id}`);
        return;
      }
      setCurrent(saved);
      setFeedback({ tone: "success", text: copy.admin.saved });
      router.refresh();
    } else if (!result.ok) {
      setFeedback({
        tone: "problem",
        text: result.fields ? Object.values(result.fields).join(" ") : result.message,
      });
    }
  }

  async function handleAddVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) {
      return;
    }
    const formElement = event.currentTarget;
    const result = await callApi<typeof adminProductResponseSchema>("/admin/variants", {
      method: "POST",
      body: { productId: current.id, ...variantFromForm(new FormData(formElement)) },
    });
    if (result.ok && result.data) {
      setCurrent(result.data.product);
      formElement.reset();
    } else if (!result.ok) {
      setFeedback({ tone: "problem", text: result.message });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {feedback && <Notice tone={feedback.tone} role="status" title={feedback.text} />}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 border border-ink bg-surface p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            id="name"
            name="name"
            label={fields.name}
            defaultValue={current?.name}
            maxLength={100}
            required
          />
          <TextField
            id="slug"
            name="slug"
            label={fields.slug}
            hint={fields.slugHint}
            defaultValue={current?.slug}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={100}
          />
          <SelectField
            id="categorySlug"
            name="categorySlug"
            label={fields.category}
            placeholder={fields.category}
            options={categories.map((category) => ({ value: category.slug, label: category.name }))}
            defaultValue={current?.categorySlug}
            required
          />
          <TextField
            id="material"
            name="material"
            label={fields.material}
            defaultValue={current?.material}
            maxLength={100}
            required
          />
          <TextField
            id="colourName"
            name="colourName"
            label={fields.colourName}
            defaultValue={current?.colour?.name}
            maxLength={40}
          />
          <TextField
            id="colourHex"
            name="colourHex"
            label={fields.colourHex}
            hint={fields.colourHint}
            defaultValue={current?.colour?.hex}
            pattern="#[0-9a-fA-F]{6}"
            maxLength={7}
          />
          <TextField
            id="styleGroup"
            name="styleGroup"
            label={fields.styleGroup}
            hint={fields.styleGroupHint}
            defaultValue={current?.styleGroup ?? undefined}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={100}
          />
        </div>
        <TextAreaField
          id="description"
          name="description"
          label={fields.description}
          defaultValue={current?.description}
          rows={5}
          maxLength={2000}
          required
        />
        <PhotoPicker images={images} onChange={setImages} canUpload={canUpload} />
        <label className="flex items-center gap-3 text-body">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={current?.isPublished ?? true}
            className="size-5 accent-ink"
          />
          {fields.published}
        </label>
        {!current && <VariantFields idPrefix="first-variant" />}
        <div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? copy.admin.saving : copy.admin.save}
          </Button>
        </div>
      </form>

      {current && (
        <section
          className="flex flex-col gap-5 border border-ink bg-surface p-6"
          aria-labelledby="variants-title"
        >
          <h2 id="variants-title" className="text-heading-sm">
            {copy.admin.columns.variants}
          </h2>
          {current.variants.map((variant) => (
            <VariantEditor key={variant.id} variant={variant} onSaved={setCurrent} />
          ))}
          {canCreate && (
            <form onSubmit={handleAddVariant} className="flex flex-col gap-3">
              <h3 className="text-body-lg">{fields.addVariant}</h3>
              <VariantFields idPrefix="new-variant" />
              <div>
                <Button type="submit">{fields.addVariant}</Button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
