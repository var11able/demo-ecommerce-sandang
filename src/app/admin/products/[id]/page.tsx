import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { idParamsSchema, type AdminProduct } from "@/contracts/admin";
import { copy } from "@/lib/copy";
import { getAdminProduct, listAdminCategories } from "@/server/admin";
import { StoreError } from "@/server/errors";
import { getViewer } from "../../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.editProduct };

async function load(id: string): Promise<AdminProduct | null> {
  if (!idParamsSchema.safeParse({ id }).success) {
    return null;
  }
  try {
    return await getAdminProduct(id);
  } catch (error) {
    if (error instanceof StoreError && error.code === "not_found") {
      return null;
    }
    throw error;
  }
}

export default async function AdminProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const product = await load((await params).id);
  if (!product) {
    notFound();
  }
  const viewer = (await getViewer())!;
  const categories = await listAdminCategories();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/products" className="text-caption text-muted underline underline-offset-4">
        {copy.admin.nav.products}
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-heading-lg">{product.name}</h1>
        <Link
          href={`/products/${product.slug}`}
          className="text-caption underline underline-offset-4"
        >
          {copy.admin.backToShop}
        </Link>
      </div>
      <ProductForm
        product={product}
        categories={categories}
        canCreate={viewer.role === "admin"}
        canUpload={viewer.role === "admin"}
      />
    </div>
  );
}
