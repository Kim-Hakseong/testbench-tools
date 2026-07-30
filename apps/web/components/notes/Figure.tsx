/**
 * Figures for the field notes.
 *
 * Inline SVG, never an image file: it keeps the site's zero-external-request
 * rule, stays crisp at any zoom, and follows the theme because every stroke is
 * `currentColor` or a token. The text inside is real text, so it is selectable
 * and readable by anything parsing the page.
 *
 * The plotted series are computed by the caller from the shipped engine, not
 * drawn by hand — a figure that can drift away from the calculation is worse
 * than no figure.
 */

export function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="mt-6">
      <div className="overflow-x-auto rounded-btn border border-line-soft bg-elevated p-4">
        {children}
      </div>
      <figcaption className="mt-2 text-[13px] leading-6 text-mute">{caption}</figcaption>
    </figure>
  );
}

export interface Point {
  x: number;
  y: number;
}

interface PlotProps {
  points: Point[];
  /** Axis labels. */
  xLabel: string;
  yLabel: string;
  /** Ticks to print, in data units. */
  xTicks: number[];
  yTicks: number[];
  /** Optional horizontal reference line, e.g. zero error. */
  zeroLine?: boolean;
  /** Points to mark and label individually. */
  markers?: { x: number; y: number; label: string; anchor?: "start" | "middle" | "end" }[];
  /** Formatting for tick text. */
  fmtX?: (v: number) => string;
  fmtY?: (v: number) => string;
  ariaLabel: string;
}

const W = 660;
const H = 260;
const PAD = { top: 16, right: 18, bottom: 34, left: 56 };

/** Line chart. Data coordinates in, SVG out — no runtime, no library. */
export function LinePlot({
  points,
  xLabel,
  yLabel,
  xTicks,
  yTicks,
  zeroLine,
  markers = [],
  fmtX = String,
  fmtY = String,
  ariaLabel,
}: PlotProps) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs, ...xTicks);
  const x1 = Math.max(...xs, ...xTicks);
  const y0 = Math.min(...ys, ...yTicks);
  const y1 = Math.max(...ys, ...yTicks);

  const px = (x: number) =>
    PAD.left + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
  const py = (y: number) =>
    H - PAD.bottom - ((y - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full min-w-[520px] text-mute"
      style={{ fontFamily: "var(--tb-font-mono, monospace)" }}
    >
      {/* frame */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="currentColor" strokeWidth="1" opacity="0.35" />

      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} stroke="currentColor" strokeWidth="1" opacity="0.12" />
          <text x={PAD.left - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fill="currentColor">
            {fmtY(t)}
          </text>
        </g>
      ))}

      {xTicks.map((t) => (
        <text key={`x${t}`} x={px(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="11" fill="currentColor">
          {fmtX(t)}
        </text>
      ))}

      {zeroLine && (
        <line x1={PAD.left} y1={py(0)} x2={W - PAD.right} y2={py(0)} stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      )}

      <path d={path} fill="none" stroke="var(--tb-accent-green, #047a4e)" strokeWidth="2" strokeLinejoin="round" />

      {markers.map((m) => (
        <g key={m.label}>
          <circle cx={px(m.x)} cy={py(m.y)} r="3.5" fill="var(--tb-accent-green, #047a4e)" />
          <text
            x={px(m.x) + (m.anchor === "end" ? -8 : 8)}
            y={py(m.y) - 8}
            textAnchor={m.anchor ?? "start"}
            fontSize="11"
            fill="currentColor"
          >
            {m.label}
          </text>
        </g>
      ))}

      <text x={W - PAD.right} y={H - 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.8">
        {xLabel}
      </text>
      <text x={4} y={12} fontSize="11" fill="currentColor" opacity="0.8">
        {yLabel}
      </text>
    </svg>
  );
}

/**
 * A signal span drawn against its raw count span, for the cases where the two
 * do not line up the way everyone assumes.
 */
export function CountMap({
  rows,
  ariaLabel,
}: {
  rows: { title: string; left: string; right: string; correct: boolean }[];
  ariaLabel: string;
}) {
  const w = 660;
  const rowH = 62;
  const h = rows.length * rowH + 10;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full min-w-[520px] text-mute"
      style={{ fontFamily: "var(--tb-font-mono, monospace)" }}
    >
      {rows.map((r, i) => {
        const y = i * rowH + 30;
        const colour = r.correct ? "var(--tb-accent-green, #047a4e)" : "var(--tb-accent-red, #b3261e)";
        return (
          <g key={r.title}>
            <text x="0" y={y - 12} fontSize="11" fill="currentColor">
              {r.title}
            </text>
            <line x1="8" y1={y + 8} x2={w - 8} y2={y + 8} stroke={colour} strokeWidth="2" />
            <circle cx="8" cy={y + 8} r="4" fill={colour} />
            <circle cx={w - 8} cy={y + 8} r="4" fill={colour} />
            <text x="8" y={y + 28} fontSize="11" fill="currentColor">
              {r.left}
            </text>
            <text x={w - 8} y={y + 28} textAnchor="end" fontSize="11" fill="currentColor">
              {r.right}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The 32 bits of an ARINC 429 word, drawn as the fields people argue about. */
export function WordLayout({
  fields,
  ariaLabel,
}: {
  fields: { label: string; bits: string; span: number }[];
  ariaLabel: string;
}) {
  const w = 660;
  const h = 96;
  const total = fields.reduce((a, f) => a + f.span, 0);
  let x = 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full min-w-[520px] text-mute"
      style={{ fontFamily: "var(--tb-font-mono, monospace)" }}
    >
      {fields.map((f) => {
        const fw = (f.span / total) * w;
        const at = x;
        x += fw;
        return (
          <g key={f.label}>
            <rect
              x={at + 1}
              y="26"
              width={fw - 2}
              height="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
              rx="3"
            />
            <text x={at + fw / 2} y="18" textAnchor="middle" fontSize="11" fill="currentColor">
              {f.label}
            </text>
            <text
              x={at + fw / 2}
              y="48"
              textAnchor="middle"
              fontSize="12"
              fill="var(--tb-accent-green, #047a4e)"
            >
              {f.bits}
            </text>
          </g>
        );
      })}
      <text x="0" y="80" fontSize="11" fill="currentColor">
        bit 32
      </text>
      <text x={w} y="80" textAnchor="end" fontSize="11" fill="currentColor">
        bit 1
      </text>
    </svg>
  );
}
