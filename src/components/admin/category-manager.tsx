"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { adminCategoryResponseSchema, AdminCategory } from "@/contracts/admin";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { Button } from "../ui/button";
import { Notice } from "../ui/notice";
import { TextField } from "../ui/text-field";
import { Cell, DataTable } from "./data-table";

export function CategoryManager({
  categories,
  canEdit,
}: {
  categories: AdminCategory[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function save(
    path: string,
    method: "POST" | "PATCH",
    body: unknown,
    form: HTMLFormElement,
  ) {
    setMessage(null);
    const result = await callApi<typeof adminCategoryResponseSchema>(path, { method, body });
    if (result.ok) {
      form.reset();
      router.refresh();
    } else {
      setMessage(result.message);
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void save("/admin/categories", "POST", { name: String(new FormData(form).get("name")) }, form);
  }

  function handleRename(id: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      void save(
        `/admin/categories/${id}`,
        "PATCH",
        { name: String(new FormData(form).get("name")) },
        form,
      );
    };
  }

  return (
    <div className="flex flex-col gap-6">
      {message && <Notice tone="problem" role="alert" title={message} />}
      {categories.length === 0 && <p className="text-body text-muted">{copy.admin.noCategories}</p>}
      <DataTable columns={[copy.admin.columns.name, copy.admin.columns.products]}>
        {categories.map((category) => (
          <tr key={category.id}>
            <Cell>
              {canEdit ? (
                <form
                  onSubmit={handleRename(category.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <TextField
                    id={`category-${category.id}`}
                    name="name"
                    label={copy.admin.categoryName}
                    defaultValue={category.name}
                    maxLength={50}
                    required
                  />
                  <Button type="submit">{copy.admin.rename}</Button>
                </form>
              ) : (
                category.name
              )}
            </Cell>
            <Cell className="tabular">{category.productCount}</Cell>
          </tr>
        ))}
      </DataTable>
      {canEdit && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 border border-ink bg-surface p-5"
        >
          <TextField
            id="new-category"
            name="name"
            label={copy.admin.newCategory}
            maxLength={50}
            required
          />
          <Button type="submit" variant="primary">
            {copy.admin.addCategory}
          </Button>
        </form>
      )}
    </div>
  );
}
