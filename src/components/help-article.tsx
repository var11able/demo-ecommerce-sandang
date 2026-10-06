import { copy } from "@/lib/copy";
import type { HelpPage, HelpSection, HelpTable } from "@/lib/help-content";

function Table({ table }: { table: HelpTable }) {
  return (
    <table className="w-full border-collapse text-left text-body tabular">
      <caption className="pb-2 text-left text-caption text-muted">{table.caption}</caption>
      <thead>
        <tr className="border-b border-ink">
          {table.columns.map((column) => (
            <th key={column} scope="col" className="py-2 pr-4 label-caps">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.label} className="border-b border-line">
            <th scope="row" className="py-2 pr-4 font-medium">
              {row.label}
            </th>
            {row.cells.map((cell, index) => (
              <td key={table.columns[index + 1]} className="py-2 pr-4 text-ink-soft">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({ section }: { section: HelpSection }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading-sm">{section.heading}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-body-lg text-ink-soft">
          {paragraph}
        </p>
      ))}
      {section.table && <Table table={section.table} />}
      {section.list && (
        <ul className="flex list-disc flex-col gap-2 pl-6 text-body-lg text-ink-soft">
          {section.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HelpArticle({ page, extra }: { page: HelpPage; extra?: HelpSection }) {
  return (
    <article className="mx-auto flex max-w-prose flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-heading-lg lg:text-display">{page.title}</h1>
        <p className="text-body-lg text-ink-soft">{page.intro}</p>
        <p className="text-caption text-muted">{copy.help.demoNote}</p>
      </header>
      {extra && <Section section={extra} />}
      {page.sections.map((section) => (
        <Section key={section.heading} section={section} />
      ))}
    </article>
  );
}
