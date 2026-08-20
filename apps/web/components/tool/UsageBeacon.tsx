"use client";

import { useCallback, useRef } from "react";

/**
 * Counts that a tool was actually used — not merely opened.
 *
 * Page views already exist in Cloudflare Web Analytics; what they cannot say
 * is whether the visitor interacted. So this wraps the tool panel and, on the
 * first interaction with a real control (typing, picking, clicking a button),
 * fires navigator.sendBeacon("/hit", slug) exactly once per page load.
 *
 * The beacon body is the tool slug and nothing else. No input values, no
 * identifier, no cookie, no localStorage — "crc-32 was used once" is the
 * entire message, which is why this does not break the §1 promise that what
 * you type never leaves your browser. Links in the FAQ and text selection do
 * not count; viewing a page with its default values does not count.
 *
 * Fire-and-forget on purpose: if the endpoint is missing or blocked, nothing
 * observable happens and the tool works exactly the same.
 */
export function UsageBeacon({ slug, children }: { slug: string; children: React.ReactNode }) {
  const sent = useRef(false);

  const report = useCallback(
    (e: React.SyntheticEvent) => {
      if (sent.current) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest("input, select, textarea, button")) return;
      sent.current = true;
      try {
        navigator.sendBeacon?.("/hit", slug);
      } catch {
        // Telemetry never gets to break a tool.
      }
    },
    [slug],
  );

  return (
    <div onInputCapture={report} onClickCapture={report}>
      {children}
    </div>
  );
}
