import type { ReactNode } from "react";
import { PageFade } from "@/components/motion/appear";

export default function ShopTemplate({ children }: { children: ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
