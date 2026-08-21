import type { Metadata } from "next";
import Link from "next/link";
import { notesByDate } from "@/content/notes";

export const metadata: Metadata = {
  alternates: { canonical: "/notes/" },
  title: "Field notes",
  description:
    "Write-ups on the places where a vendor manual and the obvious reading of it disagree — raw analog counts, protocol bit order, sensor curves. Every claim cited to the document it came from.",
  openGraph: { url: "/notes/",
    images: ["/og/notes.png"],
    siteName: "TestBench.tools",
    type: "website",
  },
};

export default function Page() {
  const notes = notesByDate();

  return (
    <div className="border-b border-line-soft">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
          <Link href="/" className="transition-colors hover:text-body">
            Tools
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ok">Notes</span>
        </nav>

        <h1 className="mt-4 text-4xl sm:text-5xl">Field notes</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-mute">
          The tools answer “convert this for me”. These answer “why did the obvious reading of
          the manual give me the wrong number”. Each note is tied to a specific document —
          publication number, revision, and the table the figures were read out of.
        </p>

        <ul className="mt-10 space-y-8">
          {notes.map((n) => (
            <li key={n.slug} className="border-t border-line-soft pt-6">
              <p className="font-mono text-xs text-mute">
                <time dateTime={n.published}>{n.published}</time>
              </p>
              <h2 className="mt-2 text-2xl">
                <Link
                  href={`/notes/${n.slug}/`}
                  className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-mute"
                >
                  {n.title}
                </Link>
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-body">{n.description}</p>
              <p className="mt-2 font-mono text-xs text-mute">Source: {n.source}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
