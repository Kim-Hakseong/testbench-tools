import Link from "next/link";
import { TOOLS } from "@/content/tools-meta";
import { noteBySlug } from "@/content/notes";

/**
 * Frame for a field note: breadcrumb → serif H1 → standfirst → source line →
 * body. Deliberately the same silhouette as ToolShell so a note reads as part
 * of the site rather than a bolted-on blog.
 */
export function NoteShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const note = noteBySlug(slug);
  if (!note) throw new Error(`Unknown note slug: ${slug}`);

  return (
    <article className="border-b border-line-soft">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
          <Link href="/" className="transition-colors hover:text-body">
            Tools
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/notes/" className="text-ok transition-colors hover:text-body">
            Notes
          </Link>
        </nav>

        <h1 className="mt-4 text-4xl sm:text-5xl">{note.title}</h1>
        <p className="mt-3 text-[15px] text-mute">{note.description}</p>

        <p className="mt-5 border-t border-line-soft pt-4 font-mono text-xs text-mute">
          <time dateTime={note.published}>{note.published}</time>
          <span className="mx-2">·</span>
          Source: {note.source}
        </p>

        <div className="mt-8">{children}</div>

        <NoteTools slugs={note.tools} />
      </div>
    </article>
  );
}

/** Paragraph — one place to keep measure and rhythm consistent. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[15px] leading-7 text-body">{children}</p>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl text-ink sm:text-3xl">{children}</h2>;
}

/**
 * A quoted figure straight out of the source document. Monospaced and boxed so
 * a reader can tell at a glance which numbers are the manual's and which are
 * the argument being made about them.
 */
export function Quoted({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-btn border border-line-soft bg-elevated p-4">
      <div className="font-mono text-[13px] leading-6 text-body">{children}</div>
    </div>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 rounded-btn border border-line-strong bg-surface px-4 py-3 text-[15px] leading-7 text-ink">
      {children}
    </p>
  );
}

function NoteTools({ slugs }: { slugs: string[] }) {
  const tools = slugs
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  if (tools.length === 0) return null;

  return (
    <aside className="mt-12 border-t border-line-soft pt-6">
      <h2 className="font-mono text-xs uppercase tracking-wide text-mute">
        Tools for this
      </h2>
      <ul className="mt-3 space-y-2">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/tools/${t.slug}/`}
              className="text-[15px] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-mute"
            >
              {t.name}
            </Link>
            <span className="ml-2 text-sm text-mute">{t.description}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
