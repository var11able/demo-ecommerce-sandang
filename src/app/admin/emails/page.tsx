import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cell, DataTable } from "@/components/admin/data-table";
import { Notice } from "@/components/ui/notice";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { listRecordedEmails } from "@/server/email";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.nav.emails };

export default async function AdminEmailsPage() {
  const viewer = (await getViewer())!;
  if (viewer.role !== "admin") {
    notFound();
  }
  const emails = await listRecordedEmails();
  const text = copy.admin.emails;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading-lg">{copy.admin.nav.emails}</h1>
        <p className="text-caption text-muted">{text.count(emails.length)}</p>
      </div>
      <Notice title={text.noticeTitle}>
        <p>{text.notice}</p>
      </Notice>
      {emails.length === 0 ? (
        <p className="text-body text-muted">{text.empty}</p>
      ) : (
        <DataTable
          columns={[text.columns.sent, text.columns.to, text.columns.email, text.columns.status]}
        >
          {emails.map((email) => (
            <tr key={email.id}>
              <Cell className="whitespace-nowrap">{formatDateTime(email.createdAt)}</Cell>
              <Cell>{email.to}</Cell>
              <Cell>
                <p className="label-caps text-muted">{text.kinds[email.kind]}</p>
                <p>{email.subject}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-caption underline underline-offset-4">
                    {text.showBody}
                  </summary>
                  <pre className="mt-2 font-text text-caption whitespace-pre-wrap text-ink-soft">
                    {email.body}
                  </pre>
                </details>
              </Cell>
              <Cell className="whitespace-nowrap">{text.statuses[email.status]}</Cell>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
