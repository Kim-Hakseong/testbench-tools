import { describe, expect, it } from "vitest";
import { TdmsParser, tdmsToCsv, type TdmsFile } from "./tdms";
import {
  buildF64Raw,
  buildMetadata,
  buildSegment,
  concatBytes,
  TOC_BIG_ENDIAN,
  TOC_META,
  TOC_NEW_OBJ_LIST,
  TOC_RAW,
} from "./testutil/tdms-writer";
import vectors from "../vectors/tdms.json";

const N = vectors.samplesPerChannel;
const CH1 = Array.from({ length: N }, (_, i) => vectors.channels.ch1.first + i * vectors.channels.ch1.step);
const CH2 = Array.from({ length: N }, (_, i) => vectors.channels.ch2.first + i * vectors.channels.ch2.step);
const HALF = N / 2;

/** Two-segment file: segment 2 reuses raw indexes via the 0x00000000 header. */
function makeFile(): Uint8Array {
  const g = vectors.group;
  const seg1 = buildSegment(
    TOC_META | TOC_RAW | TOC_NEW_OBJ_LIST,
    buildMetadata([
      { path: "/", props: [{ name: "title", type: "string", value: vectors.fileProperties.title }] },
      { path: `/'${g}'` },
      {
        path: `/'${g}'/'ch1'`,
        index: { dtype: 10, count: HALF },
        props: [
          { name: "unit", type: "string", value: vectors.channelProperties.unit },
          { name: "gain", type: "f64", value: vectors.channelProperties.gain },
        ],
      },
      { path: `/'${g}'/'ch2'`, index: { dtype: 10, count: HALF } },
    ]),
    buildF64Raw(CH1.slice(0, HALF), CH2.slice(0, HALF)),
  );
  const seg2 = buildSegment(
    TOC_META | TOC_RAW,
    buildMetadata([
      { path: `/'${g}'/'ch1'`, index: "match" },
      { path: `/'${g}'/'ch2'`, index: "match" },
    ]),
    buildF64Raw(CH1.slice(HALF), CH2.slice(HALF)),
  );
  return concatBytes(seg1, seg2);
}

function parseWithChunks(bytes: Uint8Array, sizes: number[]): TdmsFile {
  const parser = new TdmsParser();
  let off = 0;
  let k = 0;
  while (off < bytes.length) {
    const n = Math.min(sizes[k % sizes.length]!, bytes.length - off);
    parser.push(bytes.subarray(off, off + n));
    off += n;
    k++;
  }
  return parser.finish();
}

function verify(file: TdmsFile) {
  expect(file.properties.title).toBe(vectors.fileProperties.title);
  expect(file.groups).toHaveLength(1);
  const group = file.groups[0]!;
  expect(group.name).toBe(vectors.group);
  expect(group.channels.map((c) => c.name).sort()).toEqual(["ch1", "ch2"]);
  const ch1 = group.channels.find((c) => c.name === "ch1")!;
  const ch2 = group.channels.find((c) => c.name === "ch2")!;
  expect(ch1.properties.unit).toBe(vectors.channelProperties.unit);
  expect(ch1.properties.gain).toBe(vectors.channelProperties.gain);
  expect(ch1.data).toEqual(CH1);
  expect(ch2.data).toEqual(CH2);
}

describe("§9.7 TDMS roundtrip", () => {
  const bytes = makeFile();

  it("writer-generated file parses back: tree, properties, all samples", () => {
    const parser = new TdmsParser();
    parser.push(bytes);
    verify(parser.finish());
  });

  it("streaming invariance: 1-byte chunks give the identical result", () => {
    verify(parseWithChunks(bytes, [1]));
  });

  it("streaming invariance: irregular chunk sizes give the identical result", () => {
    verify(parseWithChunks(bytes, [1, 3, 7, 13, 29, 64, 5]));
    verify(parseWithChunks(bytes, [28, 2, 100, 1, 999]));
  });

  it("single-push equals chunked parse exactly (deep equality)", () => {
    const whole = new TdmsParser();
    whole.push(bytes);
    expect(parseWithChunks(bytes, [11])).toEqual(whole.finish());
  });
});

describe("tdms edges", () => {
  it("rejects non-TDMS data", () => {
    const parser = new TdmsParser();
    expect(() => parser.push(new Uint8Array(Array(64).fill(0x41)))).toThrow(/TDSm/);
  });

  it("rejects big-endian segments explicitly", () => {
    const seg = buildSegment(TOC_META | TOC_RAW | TOC_BIG_ENDIAN, buildMetadata([]), new Uint8Array(0));
    const parser = new TdmsParser();
    expect(() => parser.push(seg)).toThrow(/Big-endian/);
  });

  it("csv output: header + padded columns", () => {
    const csv = tdmsToCsv([
      { group: "g", name: "a", data: [1, 2, 3] },
      { group: "g", name: "b", data: [10] },
    ]);
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe("g/a,g/b");
    expect(lines[1]).toBe("1,10");
    expect(lines[3]).toBe("3,");
  });
});
