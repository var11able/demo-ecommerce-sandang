import type { ReactNode } from "react";

export function DataTable({
  columns,
  children,
  caption,
}: {
  columns: string[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto border border-ink bg-surface">
      <table className="w-full border-collapse text-left text-caption">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-ink">
            {columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-3 font-medium whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border-b border-line px-3 py-3 align-top ${className ?? ""}`}>{children}</td>
  );
}
