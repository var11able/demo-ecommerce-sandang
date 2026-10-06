import type { Metadata } from "next";
import Link from "next/link";
import { Cell, DataTable } from "@/components/admin/data-table";
import { ButtonLink } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { copy } from "@/lib/copy";
import { listAdminProducts } from "@/server/admin";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.nav.products };

export default async function AdminProductsPage() {
  const viewer = (await getViewer())!;
  const products = await listAdminProducts();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading-lg">{copy.admin.nav.products}</h1>
        {viewer.role === "admin" && (
          <ButtonLink href="/admin/products/new" variant="primary">
            {copy.admin.newProduct}
          </ButtonLink>
        )}
      </div>
      {products.length === 0 ? (
        <p className="text-body text-muted">{copy.admin.noProducts}</p>
      ) : (
        <DataTable
          caption={copy.admin.nav.products}
          columns={[
            copy.admin.columns.product,
            copy.admin.columns.category,
            copy.admin.columns.published,
            copy.admin.columns.variants,
          ]}
        >
          {products.map((product) => (
            <tr key={product.id}>
              <Cell>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  {product.name}
                </Link>
                <span className="block text-muted">
                  {[product.colour?.name, product.material].filter(Boolean).join(" · ")}
                </span>
              </Cell>
              <Cell>{product.categoryName}</Cell>
              <Cell>{product.isPublished ? copy.admin.yes : copy.admin.no}</Cell>
              <Cell>
                <ul className="flex flex-col gap-1">
                  {product.variants.map((variant) => (
                    <li key={variant.id} className="tabular">
                      {variant.name} · <Price amount={variant.price} /> ·{" "}
                      <span className={variant.stock - variant.reserved <= 5 ? "text-danger" : ""}>
                        {variant.stock - variant.reserved} / {variant.stock}
                      </span>
                    </li>
                  ))}
                </ul>
              </Cell>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
