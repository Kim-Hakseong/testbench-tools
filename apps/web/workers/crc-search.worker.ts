/// <reference lib="webworker" />
// Deep-search worker: exhaustive polynomial sweep in chunks so the UI thread
// stays free and progress can stream back (DESIGN §2 — identify deep search).
import {
  deepSearchRange,
  defaultDeepSearchSpace,
  type CrcParams,
  type CrcSample,
} from "@testbench/engine";

export interface SearchRequest {
  samples: { data: number[]; checksum: number }[];
  width: 8 | 16;
}

export type SearchEvent =
  | { type: "progress"; done: number; total: number }
  | { type: "found"; params: CrcParams[] }
  | { type: "done"; count: number };

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { samples, width } = e.data;
  const s: CrcSample[] = samples.map((x) => ({
    data: new Uint8Array(x.data),
    checksum: x.checksum,
  }));
  const maxPoly = ((1 << width) >>> 0) - 1;
  const chunk = width === 8 ? 0x40 : 0x1000;
  const space = defaultDeepSearchSpace(width);
  let count = 0;

  for (let from = 0; from <= maxPoly; from += chunk) {
    const to = Math.min(from + chunk - 1, maxPoly);
    const res = deepSearchRange(s, width, from, to, space);
    if (res.length > 0) {
      count += res.length;
      self.postMessage({ type: "found", params: res } satisfies SearchEvent);
    }
    self.postMessage({ type: "progress", done: to + 1, total: maxPoly + 1 } satisfies SearchEvent);
  }
  self.postMessage({ type: "done", count } satisfies SearchEvent);
};
