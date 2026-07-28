"use client";

import { useMemo, useState } from "react";
import { MODE_CODES } from "@testbench/engine";

export function Mil1553ModeCodesTool() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODE_CODES;
    return MODE_CODES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        String(m.code) === q ||
        m.code.toString(2).includes(q) ||
        ("0x" + m.code.toString(16)).includes(q),
    );
  }, [query]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by code or name — e.g. “2”, “status”, “reset”…"
        aria-label="Filter mode codes"
        className="w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute"
      />
      <div className="mt-4 overflow-x-auto rounded-btn border border-line-soft">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">5-bit</th>
              <th className="px-3 py-2 font-medium">T/R</th>
              <th className="px-3 py-2 font-medium">Data word</th>
              <th className="px-3 py-2 font-medium">Function</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={`${m.code}-${m.tr}`} className="border-b border-line-soft font-mono text-[13px] last:border-0">
                <td className="px-3 py-2 text-ink">{m.code}</td>
                <td className="px-3 py-2 text-mute">{m.code.toString(2).padStart(5, "0")}</td>
                <td className="px-3 py-2 text-body">{m.tr === 1 ? "1 (Tx)" : "0 (Rx)"}</td>
                <td className={`px-3 py-2 ${m.dataWord ? "text-ok" : "text-mute"}`}>{m.dataWord ? "yes" : "no"}</td>
                <td className="px-3 py-2 font-sans text-body">{m.name}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-mute">No mode code matches “{query}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-xs text-mute">
        Codes 9–15 and 22–31 are reserved. Mode commands use subaddress 0 or 31.
      </p>
    </div>
  );
}
