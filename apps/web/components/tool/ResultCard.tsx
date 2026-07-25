"use client";

import { CopyButton } from "@/components/CopyButton";

/** Single result row: label + large mono value + copy button. */
export function ResultCard({
  label,
  value,
  size = "md",
}: {
  label: string;
  value: string;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-btn border border-line-soft bg-elevated px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-mute">{label}</div>
        <div
          key={value}
          className={`tb-flash truncate font-mono text-ink ${size === "lg" ? "text-2xl" : "text-sm"}`}
        >
          {value}
        </div>
      </div>
      <CopyButton text={value} />
    </div>
  );
}
