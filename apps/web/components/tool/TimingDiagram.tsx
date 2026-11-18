"use client";

// Step-trace timing diagram shared by the PLC timer and edge tools. Each
// sample holds until the next scan, which is how a PLC output actually behaves.

const W = 640;
const LABEL = 56;
const ROW = 22;
const ANALOG = 64;

export type Trace<S> =
  | { kind: "bit"; label: string; get: (s: S) => boolean }
  | { kind: "ramp"; label: string; get: (s: S) => number };

export function TimingDiagram<S extends { t: number }>({ samples, traces, preset, duration, title }: {
  samples: S[];
  traces: Trace<S>[];
  /** Dashed reference line on ramp rows (the timer preset); omit for none. */
  preset?: number;
  duration: number;
  title: string;
}) {
  const x = (t: number) => LABEL + ((W - LABEL - 8) * t) / duration;
  const rampMax = Math.max(preset ?? 0, ...traces.flatMap((tr) => (tr.kind === "ramp" ? samples.map(tr.get) : [0])), 1);
  let y = 6;
  const rows = traces.map((tr) => {
    const top = y;
    const h = tr.kind === "bit" ? ROW : ANALOG;
    y += h + 8;
    return { tr, top, h };
  });
  const height = y + 14;

  const step = (val: (s: S) => number) => {
    let d = "";
    samples.forEach((s, i) => {
      const next = i + 1 < samples.length ? samples[i + 1]!.t : duration;
      d += `${i === 0 ? "M" : "L"}${x(s.t).toFixed(1)},${val(s).toFixed(1)}H${x(next).toFixed(1)}`;
    });
    return d;
  };

  return (
    <figure className="mt-3">
      <figcaption className="font-mono text-xs text-mute">{title}</figcaption>
      {/* Below ~560 px the labels would shrink past legibility, so the diagram scrolls inside the card instead. */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${height}`} style={{ minWidth: 560 }} className="mt-1 w-full text-ink" role="img" aria-label={title}>
          {rows.map(({ tr, top, h }) => (
            <g key={tr.label}>
              <text x={0} y={top + h / 2 + 4} className="fill-current font-mono" fontSize="11">{tr.label}</text>
              <line x1={LABEL} x2={W - 8} y1={top + h} y2={top + h} stroke="currentColor" strokeOpacity="0.15" />
              {tr.kind === "bit" ? (
                <path d={step((s) => (tr.get(s) ? top + 2 : top + h))} fill="none" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <>
                  {preset !== undefined && (
                    <>
                      <line x1={LABEL} x2={W - 8} y1={top + h - (h * preset) / rampMax} y2={top + h - (h * preset) / rampMax} stroke="currentColor" strokeOpacity="0.45" strokeDasharray="4 3" />
                      <text x={W - 8} y={top + h - (h * preset) / rampMax + 11} textAnchor="end" className="fill-current font-mono" fontSize="10" opacity="0.6">{preset}</text>
                    </>
                  )}
                  <path d={step((s) => top + h - (h * tr.get(s)) / rampMax)} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </>
              )}
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <text key={f} x={x(duration * f)} y={height - 2} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} className="fill-current font-mono" fontSize="10" opacity="0.6">
              {Math.round(duration * f)}
            </text>
          ))}
        </svg>
      </div>
    </figure>
  );
}
