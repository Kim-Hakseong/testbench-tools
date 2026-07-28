import type { CategoryId } from "@/content/tools-meta";

// Line-style geometric pictograms, 1.5px stroke — never emoji, never filled blobs.
const PATHS: Record<CategoryId, React.ReactNode> = {
  // hex grid
  "checksum-crc": (
    <>
      <path d="M8 3.5 4 6v5l4 2.5L12 11V6L8 3.5Z" />
      <path d="M16 10.5l-4 2.5v5l4 2.5 4-2.5v-5l-4-2.5Z" />
    </>
  ),
  // pulse train
  "protocol-decoders": (
    <path d="M2 16h3V8h4v8h4V8h4v8h5" />
  ),
  // bidirectional arrows
  "data-converters": (
    <>
      <path d="M4 8h13m0 0-3-3m3 3-3 3" />
      <path d="M20 16H7m0 0 3-3m-3 3 3 3" />
    </>
  ),
  // ladder rung / IO block
  "plc-industrial": (
    <>
      <path d="M4 3v18M20 3v18" />
      <path d="M4 8h6m4 0h6M10 8v3h4V8" />
      <path d="M4 16h4m8 0h4M8 16v-2h8v2" />
    </>
  ),
  // waveform
  "sensor-signal": (
    <path d="M2 12h3l2-6 4 12 3-9 2 3h6" />
  ),
  // chip outline
  "embedded-mcu": (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M9 7V4m6 3V4M9 20v-3m6 3v-3M7 9H4m3 6H4m16-6h-3m3 6h-3" />
    </>
  ),
  // dual-redundant data bus with terminals
  "avionics-databus": (
    <>
      <path d="M3 7h18M3 10h18" />
      <path d="M8 10v3M16 10v3" />
      <rect x="6" y="13" width="4" height="5" rx="0.5" />
      <rect x="14" y="13" width="4" height="5" rx="0.5" />
    </>
  ),
  // document with binary
  "file-tools": (
    <>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h2m2 0h2M9 16h2m2 0h2" />
    </>
  ),
};

export function CategoryIcon({ id, className }: { id: CategoryId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
