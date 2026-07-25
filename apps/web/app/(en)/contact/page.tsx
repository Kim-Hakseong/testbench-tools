import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact TestBench.tools — bug reports, corrections and tool requests.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Contact</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body">
        <p>
          Bug reports, incorrect constants, feature requests, or anything else —
          email works best:
        </p>
        <p className="font-mono text-lg text-ink">
          <a href="mailto:contact@testbench.tools" className="underline decoration-line-strong underline-offset-4 hover:opacity-90">
            contact@testbench.tools
          </a>
        </p>
        <p>
          Reports of wrong values get priority. If a calculator disagrees with
          your instrument or datasheet, include the input, the expected value
          and its source — the fix usually ships with a new regression test.
        </p>
      </div>
    </div>
  );
}
