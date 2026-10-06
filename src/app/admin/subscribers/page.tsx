import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cell, DataTable } from "@/components/admin/data-table";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { listSubscribers } from "@/server/newsletter";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.nav.subscribers };

export default async function AdminSubscribersPage() {
  const viewer = (await getViewer())!;
  if (viewer.role !== "admin") {
    notFound();
  }
  const subscribers = await listSubscribers();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-heading-lg">{copy.admin.nav.subscribers}</h1>
          <p className="text-caption text-muted">
            {copy.admin.subscriberCount(subscribers.length)}
          </p>
        </div>
        <a
          href="/api/v1/admin/subscribers?format=csv"
          download
          className="inline-flex min-h-11 items-center rounded-control border border-ink bg-ink px-6 text-body text-surface"
        >
          {copy.admin.downloadCsv}
        </a>
      </div>
      {subscribers.length === 0 ? (
        <p className="text-body text-muted">{copy.admin.noSubscribers}</p>
      ) : (
        <DataTable columns={[copy.admin.columns.email, copy.admin.columns.subscribed]}>
          {subscribers.map((subscriber) => (
            <tr key={subscriber.email}>
              <Cell>{subscriber.email}</Cell>
              <Cell>{formatDateTime(subscriber.subscribedAt)}</Cell>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
