import Link from "next/link";
import { NOCTRA_PRODUCTS, NOCTRA_TRAITS, NOCTRA_WAITLIST, waitlistHref, type NoctraWaitlist } from "@/content/noctra";

function Traits() {
  return (
    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Noctra">
      {NOCTRA_TRAITS.map((w) => (
        <li key={w} className="rounded-md border border-line-strong px-2.5 py-1 font-mono text-xs uppercase tracking-[0.14em] text-body">{w}</li>
      ))}
    </ul>
  );
}

function Mark() {
  return (
    <div className="flex items-center gap-2 font-serif text-[13px] tracking-[0.12em] text-mute">
      <span aria-hidden="true" className="h-1.5 w-1.5 flex-none" style={{ background: "#31A9BC" }} />
      Noctra
    </div>
  );
}

export function NoctraIndex() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Mark />
      <h1 className="mt-3 text-4xl sm:text-5xl">Noctra</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-body">
        Desktop instruments for test benches that cannot touch a network. The tools on this site
        decode one frame or one value in a browser; Noctra does the same work at full size,
        installed on the machine, offline.
      </p>
      <Traits />

      <h2 className="tb-display mt-12 text-2xl">In preparation</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {NOCTRA_WAITLIST.map((p) => (
          <Link key={p.slug} href={`/noctra/${p.slug}/`} className="rounded-card border border-line-soft bg-surface p-4 transition-colors hover:border-line-strong">
            <h3 className="text-sm font-medium text-ink">{p.name}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-mute">{p.line}</p>
            <span className="mt-3 inline-block font-mono text-[11px] text-body">Join the waitlist →</span>
          </Link>
        ))}
      </div>

      <h2 className="tb-display mt-12 text-2xl">Available</h2>
      <ul className="mt-4 divide-y divide-line-soft rounded-btn border border-line-soft">
        {NOCTRA_PRODUCTS.map((p) => (
          <li key={p.name} className="px-4 py-3">
            <span className="text-sm font-medium text-ink">{p.name}</span>
            <span className="text-sm text-body"> — {p.line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-mute">
        Questions or a bench to describe: <Link href="/contact/" className="underline decoration-line-strong underline-offset-4 hover:text-body">contact</Link>.
      </p>
    </div>
  );
}

export function NoctraWaitlistPage({ product }: { product: NoctraWaitlist }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
        <Link href="/noctra/" className="transition-colors hover:text-body">Noctra</Link>
        <span className="mx-1.5">/</span>
        <span>{product.slug}</span>
      </nav>
      <h1 className="mt-4 text-4xl sm:text-5xl">{product.name}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-body">{product.line}</p>
      <Traits />

      {/* Rendered only once a real screenshot is configured in content/noctra.ts. */}
      {product.screenshot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.screenshot} alt={`${product.name} screenshot`} className="mt-8 w-full rounded-card border border-line-soft" />
      )}

      <div className="mt-10 rounded-card border border-line-strong bg-surface p-5">
        <p className="text-[15px] text-ink">{product.name} is in preparation.</p>
        <p className="mt-1 text-sm text-mute">
          Leave your address and you will hear when it is ready — one email, nothing else. {product.fromHere}
        </p>
        <a href={waitlistHref(product.name)} className="mt-4 inline-block rounded-btn border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:border-ink">
          Join the waitlist by email →
        </a>
      </div>
    </div>
  );
}
