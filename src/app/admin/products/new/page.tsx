import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { copy } from "@/lib/copy";
import { listAdminCategories } from "@/server/admin";
import { getViewer } from "../../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.newProduct };

export default async function NewProductPage() {
  const viewer = (await getViewer())!;
  if (viewer.role !== "admin") {
    notFound();
  }
  const categories = await listAdminCategories();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/products" className="text-caption text-muted underline underline-offset-4">
        {copy.admin.nav.products}
      </Link>
      <h1 className="text-heading-lg">{copy.admin.newProduct}</h1>
      <ProductForm product={null} categories={categories} canCreate canUpload />
    </div>
  );
}
