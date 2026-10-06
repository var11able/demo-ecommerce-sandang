import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { InteractiveMarker } from "@/components/motion/appear";
import { copy } from "@/lib/copy";
import { homePhotos } from "@/lib/home-photos";
import { getStoreSettings } from "@/server/store";
import "./globals.css";

const inter = Inter({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(getStoreSettings().origin),
    title: {
      default: `${copy.store.name}: ${copy.store.tagline}`,
      template: `%s · ${copy.store.name}`,
    },
    description: copy.store.description,
    openGraph: {
      siteName: copy.store.name,
      type: "website",
      images: [{ url: homePhotos.hero, width: 2400, height: 900, alt: copy.home.heroPhoto }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <InteractiveMarker />
      </body>
    </html>
  );
}
