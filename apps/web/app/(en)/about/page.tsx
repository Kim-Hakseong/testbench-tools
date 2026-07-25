import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "TestBench.tools is a free collection of browser-based micro-tools for test & measurement, embedded and industrial automation engineers.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">About TestBench.tools</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body">
        <p>
          TestBench.tools is a collection of small, fast, free tools for the
          people who sit between hardware and software: test &amp; measurement
          engineers, embedded developers and industrial automation folks. CRC
          calculators, protocol frame decoders, PLC scaling math, sensor
          equations, measurement file converters — the ten-minute annoyances of
          bench work, each turned into a page that answers instantly.
        </p>
        <p>Three principles drive every tool here:</p>
        <ul className="space-y-2 pl-5">
          <li className="list-disc">
            <strong className="text-ink">Instant.</strong> No sign-up, no
            configuration ceremony. Each page loads with a worked example
            already computed and updates as you type.
          </li>
          <li className="list-disc">
            <strong className="text-ink">Client-side.</strong> Every
            calculation and file conversion runs in your browser. Your frames,
            registers and measurement files never leave your machine —
            important when the data belongs to a customer or a lab.
          </li>
          <li className="list-disc">
            <strong className="text-ink">Verified.</strong> The calculation
            engines are covered by an automated test suite pinned to published
            check values and golden vectors (the CRC of{" "}
            <code>&quot;123456789&quot;</code>, IEC 60751 resistance points, Modbus
            reference frames). If a tool page states a number, a test asserts
            it.
          </li>
        </ul>
        <p>
          The site is free and supported by minimal advertising. There are no
          accounts, no paywalls and no upload servers.
        </p>
        <p>
          Found a bug, a wrong constant, or a tool you wish existed?{" "}
          <Link href="/contact/" className="text-body underline decoration-line-strong underline-offset-4 hover:text-ink">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
