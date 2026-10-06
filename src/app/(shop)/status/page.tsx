import type { Metadata } from "next";
import { HealthStatus } from "@/components/health-status";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.status.title, robots: { index: false } };

export default function StatusPage() {
  return <HealthStatus />;
}
