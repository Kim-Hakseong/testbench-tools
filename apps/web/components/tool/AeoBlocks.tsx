// AEO content building blocks (DESIGN §6): direct-answer paragraph,
// prose sections, worked-example data well, parameters table, FAQ accordion.

export function AnswerBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 max-w-3xl text-[15px] leading-relaxed text-body">{children}</p>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="tb-display text-2xl">{title}</h2>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-body">
        {children}
      </div>
    </section>
  );
}

/** Data well for worked examples — everything inside is data, so mono. */
export function DataWell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line-soft bg-well p-4 font-mono text-[13px] leading-relaxed text-body">
      {children}
    </div>
  );
}

export interface ParamRow {
  name: string;
  value: string;
  note?: string;
}

export function ParamsTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line-soft">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
            <th className="px-4 py-2.5 font-medium">Parameter</th>
            <th className="px-4 py-2.5 font-medium">Value</th>
            <th className="px-4 py-2.5 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line-soft last:border-0">
              <td className="px-4 py-2.5 text-body">{r.name}</td>
              <td className="px-4 py-2.5 font-mono text-[13px] text-ink">{r.value}</td>
              <td className="px-4 py-2.5 text-mute">{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section className="mt-10">
      <h2 className="tb-display text-2xl">FAQ</h2>
      <div className="mt-4 max-w-3xl divide-y divide-line-soft rounded-card border border-line-soft">
        {items.map((item) => (
          <details key={item.q} className="group px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:content-none">
              <span className="mr-2 inline-block font-mono text-xs text-mute transition-transform group-open:rotate-90">
                ▸
              </span>
              {item.q}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-relaxed text-body">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
