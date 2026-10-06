import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartView } from "@/components/cart-view";
import { copy } from "@/lib/copy";
import { getCart } from "@/server/cart";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.cart.title };

export default async function CartPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login?next=/cart");
  }
  return <CartView initialCart={await getCart(viewer.id)} />;
}
