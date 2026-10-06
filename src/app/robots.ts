import type { MetadataRoute } from "next";
import { getStoreSettings } from "@/server/store";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const { origin } = getStoreSettings();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/account",
        "/cart",
        "/checkout",
        "/orders/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/unsubscribe",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
