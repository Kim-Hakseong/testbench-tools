// CRC identification: match (data, checksum) samples against the preset
// catalog, plus an exhaustive parameter search designed to run in chunks
// (driven by a Web Worker on the UI side — this module stays DOM-free).
import { crc, CRC_PRESETS, type CrcParams, type CrcPreset } from "./checksum";

export interface CrcSample {
  data: Uint8Array;
  checksum: number;
}

/** Presets whose CRC matches EVERY sample (intersection across pairs). */
export function identifyFromCatalog(samples: CrcSample[]): CrcPreset[] {
  if (samples.length === 0) return [];
  return CRC_PRESETS.filter((p) =>
    samples.every((s) => crc(s.data, p) === (s.checksum >>> 0)),
  );
}

export interface DeepSearchSpace {
  inits: number[];
  xorouts: number[];
  reflects: [boolean, boolean][];
}

/** Default brute-force space: init/xorout ∈ {0, all-ones}, all 4 reflect combos. */
export function defaultDeepSearchSpace(width: number): DeepSearchSpace {
  const mask = width < 32 ? (((1 << width) >>> 0) - 1) >>> 0 : 0xffffffff;
  return {
    inits: [0, mask],
    xorouts: [0, mask],
    reflects: [
      [false, false],
      [true, true],
      [true, false],
      [false, true],
    ],
  };
}

/**
 * Exhaustively test every polynomial in [polyFrom, polyTo] (inclusive) against
 * all samples over the given space. Call repeatedly over sub-ranges to keep a
 * worker responsive. Even polynomials are skipped (a CRC generator polynomial
 * always has its x^0 term set).
 */
export function deepSearchRange(
  samples: CrcSample[],
  width: number,
  polyFrom: number,
  polyTo: number,
  space: DeepSearchSpace = defaultDeepSearchSpace(width),
): CrcParams[] {
  if (samples.length === 0) return [];
  const found: CrcParams[] = [];
  for (let poly = polyFrom | 1; poly <= polyTo; poly += 2) {
    for (const init of space.inits) {
      for (const [refin, refout] of space.reflects) {
        for (const xorout of space.xorouts) {
          const params: CrcParams = { width, poly, init, refin, refout, xorout };
          let ok = true;
          for (const s of samples) {
            if (crc(s.data, params) !== (s.checksum >>> 0)) {
              ok = false;
              break;
            }
          }
          if (ok) found.push(params);
        }
      }
    }
  }
  return found;
}

/** Name a parameter set if it coincides with a catalog preset. */
export function matchPresetName(params: CrcParams): string | null {
  const p = CRC_PRESETS.find(
    (x) =>
      x.width === params.width &&
      x.poly === params.poly &&
      x.init === params.init &&
      x.refin === params.refin &&
      x.refout === params.refout &&
      x.xorout === params.xorout,
  );
  return p ? p.name : null;
}
