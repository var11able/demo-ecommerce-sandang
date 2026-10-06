import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { copy } from "@/lib/copy";
import { listAdminCategories } from "@/server/admin";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.nav.categories };

export default async function AdminCategoriesPage() {
  const viewer = (await getViewer())!;
  const categories = await listAdminCategories();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-heading-lg">{copy.admin.nav.categories}</h1>
      <CategoryManager categories={categories} canEdit={viewer.role === "admin"} />
    </div>
  );
}
