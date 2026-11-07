import { describe, expect, it } from "vitest";
import {
  INSTRUMENT_PRESETS, NTC_REFERENCE_CURVES, THERMOCOUPLE_TYPES,
  adcToVoltage, canBitTiming, dbFromPowerRatio, dbFromVoltageRatio, dividerOptions, dividerVout, extractFields,
  formatSpec, halfDigitMaxCounts, i2cPullup, I2C_IOL, I2C_TR_MAX, instrumentPreset, layoutStruct, measurementAccuracy,
  nearestValue, ntcBetaFromTwoPoints, ntcBetaLabel, ntcBetaResistance, ntcBetaTemperature, ntcCheckAgainstTable,
  ntcDividerReading, ntcFitSteinhartHart, ntcModelDeviation, ntcSteinhartResistance, ntcSteinhartTemperature,
  ntcSweepTemperatures, parseStructBody, powerRatioFromDb, rtdResistance, rtdTemperature, sineLevels, tcTemperature,
  tcVoltage, tcWithColdJunction, timerSolutions, uartBaudError, voltageRatioFromDb, voltageToAdc, vrmsFromPower,
  wattsFromDbm,
  type AccuracySpec, type Arch, type BitField, type CountBasis, type ESeriesName, type I2cMode, type NtcBetaParams,
  type NtcDividerTopology, type SteinhartHartCoefficients,
} from "@testbench/engine";
import { callTool } from "../registry";
import { parity } from "../testing/parity";

describe("sensor-signal parity", () => {
  // AdcTool.tsx: count → adcToVoltage cards (V, LSB mV, ratio %); voltage → voltageToAdc code + hex + LSB.
  const adcV = (count: number, bits = 12, vref = 3.3) => {
    const r = adcToVoltage(count, bits, vref);
    return { direction: "countToVoltage", bits, vrefV: vref, maxCode: 2 ** bits - 1, count, voltageV: r.voltage, lsbMv: r.lsb * 1000, ratioPercent: r.ratio * 100 };
  };
  const adcC = (v: number, bits: number, vref: number) => {
    const code = voltageToAdc(v, bits, vref);
    const maxCode = 2 ** bits - 1;
    return { direction: "voltageToCount", bits, vrefV: vref, maxCode, voltageV: v, code, codeHex: "0x" + code.toString(16).toUpperCase(), lsbMv: (vref / maxCode) * 1000 };
  };
  parity("sensor.adc", [
    { input: {}, expected: adcV(2048) },
    { input: { count: 0 }, expected: adcV(0) },
    { input: { bits: 10, vrefV: 5, count: 1023 }, expected: adcV(1023, 10, 5) },
    { input: { bits: 24, vrefV: 2.048, count: 8388608 }, expected: adcV(8388608, 24, 2.048) },
    { input: { direction: "voltageToCount" }, expected: adcC(1.65, 12, 3.3) },
    { input: { direction: "voltageToCount", bits: 16, vrefV: 2.5, voltageV: 1.2 }, expected: adcC(1.2, 16, 2.5) },
    { input: { direction: "voltageToCount", bits: 8, vrefV: 3.3, voltageV: 9 }, expected: adcC(9, 8, 3.3) },
  ]);

  // DbDbmTool.tsx
  const dbm = (d: number, z: number) => {
    const w = wattsFromDbm(d);
    return { mode: "dbm", dbm: d, impedanceOhms: z, powerMw: w * 1000, powerW: w, vrmsV: vrmsFromPower(w, z) };
  };
  parity("sensor.db_dbm", [
    { input: {}, expected: dbm(0, 50) },
    { input: { dbm: 30, impedanceOhms: 75 }, expected: dbm(30, 75) },
    { input: { dbm: -47.5, impedanceOhms: 600 }, expected: dbm(-47.5, 600) },
    { input: { mode: "power", ratio: 2 }, expected: { mode: "power", direction: "toDb", ratio: 2, db: dbFromPowerRatio(2) } },
    { input: { mode: "voltage", ratio: 0.5 }, expected: { mode: "voltage", direction: "toDb", ratio: 0.5, db: dbFromVoltageRatio(0.5) } },
    { input: { mode: "power", direction: "toRatio", db: -3 }, expected: { mode: "power", direction: "toRatio", db: -3, ratio: powerRatioFromDb(-3) } },
    { input: { mode: "voltage", direction: "toRatio" }, expected: { mode: "voltage", direction: "toRatio", db: 3, ratio: voltageRatioFromDb(3) } },
  ]);

  // AccuracyTool.tsx: spec fields → AccuracySpec (percent or ppm path), count basis, measurementAccuracy; a preset
  // fills unit/range/% terms from its row (applyPreset) and switches the basis to the row's resolution.
  const acc = (o: {
    reading: number; range?: number; unit?: string; ppm?: boolean; rdg?: number; rng?: number; counts?: number; offset?: number;
    basisKind?: CountBasis["kind"]; basisValue?: number; preset?: string; row?: number;
  }) => {
    let range = o.range ?? 10;
    let unit = o.unit ?? "V";
    let basisKind = o.basisKind ?? "countsFullScale";
    const bv = o.basisValue ?? 6000;
    let basis: CountBasis = basisKind === "countsFullScale" ? { kind: basisKind, countsFullScale: bv } : basisKind === "digits" ? { kind: basisKind, digits: bv } : { kind: basisKind, resolution: bv };
    let spec: AccuracySpec;
    let instrument: unknown = null;
    if (o.preset) {
      const p = instrumentPreset(o.preset)!;
      const row = p.ranges[o.row ?? 0]!;
      unit = p.unit;
      range = row.range;
      spec = { percentOfReading: row.spec.percentOfReading, percentOfRange: row.spec.percentOfRange, counts: row.spec.counts, offset: undefined };
      if (row.countBasis?.kind === "resolution") { basisKind = "resolution"; basis = row.countBasis; }
      instrument = { id: p.id, vendor: p.vendor, model: p.model, functionName: p.functionName, rangeLabel: row.label, conditions: p.conditions, source: p.source, note: row.note ?? null };
    } else {
      const rdg = o.rdg ?? 0.0035;
      const rng = o.rng ?? 0.0005;
      spec = {
        percentOfReading: o.ppm ? undefined : rdg, ppmOfReading: o.ppm ? rdg : undefined,
        percentOfRange: o.ppm ? undefined : rng, ppmOfRange: o.ppm ? rng : undefined,
        counts: o.counts, offset: o.offset,
      };
    }
    const r = measurementAccuracy({ reading: o.reading, range, spec, countBasis: basis });
    if (!r.ok) throw new Error(r.error);
    return {
      instrument, reading: o.reading, range, unit, spec: formatSpec(spec, unit),
      uncertainty: r.uncertainty, min: r.min, max: r.max, percentOfReading: r.percentOfReading, ppmOfReading: r.ppmOfReading,
      percentOfRange: r.percentOfRange, terms: r.terms, dominantTerm: r.dominant?.id ?? null,
      readingPercentOfRange: r.readingPercentOfRange, countSize: r.countSize, crossoverReading: r.crossoverReading,
      readingExceedsRange: r.readingExceedsRange, fixedExceedsReading: r.fixedExceedsReading,
      maxDisplayCounts: basisKind === "digits" ? halfDigitMaxCounts(bv) : null,
    };
  };
  parity("sensor.measurement_accuracy", [
    { input: { reading: 4.7 }, expected: acc({ reading: 4.7 }) },
    { input: { reading: 0.1 }, expected: acc({ reading: 0.1 }) },
    { input: { reading: -11, range: 10, offset: 0.001 }, expected: acc({ reading: -11, offset: 0.001 }) },
    { input: { reading: 12, range: 20, proportionalUnit: "ppm", ofReading: 35, ofRange: 5 }, expected: acc({ reading: 12, range: 20, ppm: true, rdg: 35, rng: 5 }) },
    { input: { reading: 1.234, range: 6, ofReading: 0.05, ofRange: 0, counts: 3, countBasis: "digits", countBasisValue: 3.5 },
      expected: acc({ reading: 1.234, range: 6, rdg: 0.05, rng: 0, counts: 3, basisKind: "digits", basisValue: 3.5 }) },
    { input: { reading: 400, range: 600, ofReading: 0.1, ofRange: 0, counts: 2, unit: "mV" }, expected: acc({ reading: 400, range: 600, rdg: 0.1, rng: 0, counts: 2, unit: "mV" }) },
    { input: { reading: 3.3, instrument: "fluke-87v-dcv", presetRange: 1 }, expected: acc({ reading: 3.3, preset: "fluke-87v-dcv", row: 1 }) },
    { input: { reading: 0.05, instrument: "keysight-34461a-dcv" }, expected: acc({ reading: 0.05, preset: "keysight-34461a-dcv", row: 0 }) },
    { input: { reading: 750, instrument: "siglent-sdm3055-dcv", presetRange: 4, range: 1, ofReading: 9 }, expected: acc({ reading: 750, preset: "siglent-sdm3055-dcv", row: 4 }) },
    { input: { reading: 0.0123, instrument: INSTRUMENT_PRESETS[5]!.id }, expected: acc({ reading: 0.0123, preset: INSTRUMENT_PRESETS[5]!.id }) },
  ]);

  // ThermistorTool.tsx
  const CURVE = NTC_REFERENCE_CURVES[0]!;
  const DEFAULT_POINTS = CURVE.suggestedFitC.map((c) => {
    const row = CURVE.table.find(([t]) => t === c)!;
    return { celsius: row[0], ohms: row[1] };
  });
  const ntc = (o: {
    toT?: boolean; x?: number; r0?: number; t0?: number; derived?: boolean; betaK?: number; lo?: number; hi?: number;
    coefficients?: SteinhartHartCoefficients; points?: { celsius: number; ohms: number }[];
    topology?: NtcDividerTopology; series?: number; supply?: number; bits?: number;
  }) => {
    const toT = o.toT ?? true;
    const points = o.points ?? DEFAULT_POINTS;
    let co: SteinhartHartCoefficients | null = null;
    let fitMaxResidualC: number | null = null;
    if (o.coefficients) co = o.coefficients;
    else {
      const fit = ntcFitSteinhartHart(points);
      if (!fit.ok) throw new Error(fit.error);
      co = fit.coefficients;
      fitMaxResidualC = fit.maxResidualC;
    }
    const lo = o.lo ?? 25, hi = o.hi ?? 85;
    const rl = ntcSteinhartResistance(co, lo), rh = ntcSteinhartResistance(co, hi);
    if (!rl.ok || !rh.ok) throw new Error("pair");
    const d = ntcBetaFromTwoPoints({ ohms: rl.ohms, celsius: lo }, { ohms: rh.ohms, celsius: hi });
    if (!d.ok) throw new Error(d.error);
    const betaValue = o.derived ? d.beta : o.betaK ?? 3977;
    const beta: NtcBetaParams = { r0Ohms: o.r0 ?? 10000, t0C: o.t0 ?? 25, beta: betaValue, betaLowC: lo, betaHighC: hi };
    const x = o.x ?? (toT ? 32554 : 0);
    let sh: Record<string, number>, bm: Record<string, number>, gap: Record<string, number>, divOhms: number;
    if (toT) {
      const b = ntcBetaTemperature(beta, x), s = ntcSteinhartTemperature(co, x);
      if (!b.ok || !s.ok) throw new Error("conv");
      sh = { celsius: s.celsius }; bm = { celsius: b.celsius }; gap = { deltaC: b.celsius - s.celsius }; divOhms = x;
    } else {
      const b = ntcBetaResistance(beta, x), s = ntcSteinhartResistance(co, x);
      if (!b.ok || !s.ok) throw new Error("conv");
      sh = { ohms: s.ohms }; bm = { ohms: b.ohms };
      gap = { deltaOhms: b.ohms - s.ohms, deltaPercent: ((b.ohms - s.ohms) / s.ohms) * 100 }; divOhms = s.ohms;
    }
    const temps = points.map((p) => p.celsius);
    const dLo = Math.min(...temps), dHi = Math.max(...temps);
    const dev = ntcModelDeviation(beta, co, ntcSweepTemperatures(dLo, dHi, 7));
    if (!dev.ok) throw new Error(dev.error);
    const onCurve = !o.coefficients && points.every((p) => CURVE.table.some(([tc, ro]) => tc === p.celsius && ro === p.ohms));
    const chk = onCurve ? ntcCheckAgainstTable(co, CURVE.table) : null;
    const dv = ntcDividerReading({ ohms: divOhms, seriesOhms: o.series ?? 10000, supplyVolts: o.supply ?? 3.3, topology: o.topology ?? "pulldown", adcBits: o.bits ?? 12 });
    if (!dv.ok) throw new Error(dv.error);
    return {
      direction: toT ? "resistanceToTemperature" : "temperatureToResistance",
      input: toT ? { resistanceOhms: x } : { temperatureC: x },
      steinhartHart: sh, beta: bm, betaMinusSteinhartHart: gap, betaLabel: ntcBetaLabel(beta), betaK: betaValue, derivedBetaK: d.beta,
      coefficients: co, fitMaxResidualC,
      deviation: { fromC: dLo, toC: dHi, maxAbsDeviationC: dev.maxAbsDeviationC, worstCelsius: dev.worstCelsius, rows: dev.rows },
      tableCheck: chk && chk.ok ? { curve: CURVE.label, rows: chk.count, maxAbsC: chk.maxAbsC, worstCelsius: chk.worstCelsius, rmsC: chk.rmsC } : null,
      divider: { thermistorOhms: divOhms, outputV: dv.volts, ratio: dv.ratio, adcCount: dv.counts ?? null, adcFullScale: dv.fullScaleCounts ?? null },
    };
  };
  const pagePoints = [{ celsius: 0, ohms: 32554 }, { celsius: 25, ohms: 10000 }, { celsius: 85, ohms: 1070 }];
  const ownPoints = [{ celsius: 0, ohms: 30000 }, { celsius: 25, ohms: 10000 }, { celsius: 100, ohms: 700 }];
  parity("sensor.ntc_thermistor", [
    { input: {}, expected: ntc({}) },
    { input: { direction: "temperatureToResistance", temperatureC: 100 }, expected: ntc({ toT: false, x: 100 }) },
    { input: { resistanceOhms: 1070, betaSource: "derived" }, expected: ntc({ x: 1070, derived: true }) },
    { input: { resistanceOhms: 5000, shSource: "coefficients", dividerTopology: "pullup" },
      expected: ntc({ x: 5000, coefficients: { a: 1.138449e-3, b: 2.325188e-4, c: 9.469821e-8 }, topology: "pullup" }) },
    { input: { resistanceOhms: 12000, betaK: 3950, fitPoints: pagePoints }, expected: ntc({ x: 12000, betaK: 3950, points: pagePoints }) },
    { input: { resistanceOhms: 2000, fitPoints: ownPoints, betaLowC: 0, betaHighC: 100, betaSource: "derived" },
      expected: ntc({ x: 2000, points: ownPoints, lo: 0, hi: 100, derived: true }) },
    { input: { direction: "temperatureToResistance", temperatureC: -20, seriesOhms: 47000, supplyV: 5, adcBits: 10 },
      expected: ntc({ toT: false, x: -20, series: 47000, supply: 5, bits: 10 }) },
  ]);

  // Pt100Tool.tsx
  parity("sensor.rtd_pt100", [
    { input: {}, expected: { sensor: "PT100", r0Ohms: 100, temperatureC: 100, resistanceOhms: rtdResistance(100, 100) } },
    { input: { temperatureC: 0 }, expected: { sensor: "PT100", r0Ohms: 100, temperatureC: 0, resistanceOhms: rtdResistance(0, 100) } },
    { input: { sensor: "PT1000", temperatureC: 850 }, expected: { sensor: "PT1000", r0Ohms: 1000, temperatureC: 850, resistanceOhms: rtdResistance(850, 1000) } },
    { input: { direction: "resistanceToTemperature" }, expected: { sensor: "PT100", r0Ohms: 100, resistanceOhms: 108.5, temperatureC: rtdTemperature(108.5, 100) } },
    { input: { sensor: "PT1000", direction: "resistanceToTemperature", resistanceOhms: 1385.055 },
      expected: { sensor: "PT1000", r0Ohms: 1000, resistanceOhms: 1385.055, temperatureC: rtdTemperature(1385.055, 1000) } },
  ]);

  // RmsPeakTool.tsx
  const sine = (kind: "rms" | "peak" | "pp", value: number) => ({ kind, value, ...sineLevels(kind, value) });
  parity("sensor.rms_peak", [
    { input: {}, expected: sine("rms", 230) },
    { input: { value: 120 }, expected: sine("rms", 120) },
    { input: { kind: "peak", value: 1 }, expected: sine("peak", 1) },
    { input: { kind: "pp", value: 10 }, expected: sine("pp", 10) },
    { input: { kind: "rms", value: -3.3 }, expected: sine("rms", -3.3) },
  ]);

  // ThermocoupleTool.tsx: the three modes, with the span line the page shows for the current direction.
  const info = (t: string) => THERMOCOUPLE_TYPES.find((x) => x.id === t)!;
  const toMv = (t: string, c: number) => {
    const r = tcVoltage(t, c);
    if (!r.ok) throw new Error(r.error);
    return { type: t, name: info(t).name, mode: "toMv", temperatureC: c, millivolts: r.millivolts, subrangeC: { min: r.subrange.minC, max: r.subrange.maxC }, validSpanC: { min: info(t).minC, max: info(t).maxC } };
  };
  const span = (t: string) => ({ validSpanMv: { min: info(t).minMv, max: info(t).maxMv }, validSpanC: { min: info(t).inverseMinC, max: info(t).inverseMaxC } });
  const toC = (t: string, mv: number) => {
    const r = tcTemperature(t, mv);
    if (!r.ok) throw new Error(r.error);
    return { type: t, name: info(t).name, mode: "toC", millivolts: mv, temperatureC: r.celsius, errorBandC: { min: r.errorMinC, max: r.errorMaxC }, subrangeMv: { min: r.subrange.minMv, max: r.subrange.maxMv }, ...span(t) };
  };
  const cjc = (t: string, mv: number, cj: number) => {
    const r = tcWithColdJunction(t, mv, cj);
    if (!r.ok) throw new Error(r.error);
    return {
      type: t, name: info(t).name, mode: "cjc", millivolts: mv, coldJunctionC: cj, temperatureC: r.celsius, coldJunctionMv: r.coldJunctionMv, totalMv: r.totalMv,
      errorBandC: { min: r.errorMinC, max: r.errorMaxC }, subrangeMv: { min: r.subrange.minMv, max: r.subrange.maxMv }, ...span(t),
    };
  };
  parity("sensor.thermocouple", [
    { input: {}, expected: cjc("K", 4.096, 25) },
    { input: { mode: "toC", millivolts: 4.096 }, expected: toC("K", 4.096) },
    { input: { mode: "toMv", type: "J", temperatureC: 500 }, expected: toMv("J", 500) },
    { input: { type: "T", millivolts: -1.2, coldJunctionC: 22 }, expected: cjc("T", -1.2, 22) },
    { input: { mode: "toC", type: "S", millivolts: 10 }, expected: toC("S", 10) },
    { input: { mode: "toMv", type: "B", temperatureC: 1200 }, expected: toMv("B", 1200) },
    { input: { mode: "toMv", type: "K", temperatureC: 1372 }, expected: toMv("K", 1372) },
    { input: { type: "E", millivolts: 20, coldJunctionC: 30 }, expected: cjc("E", 20, 30) },
  ]);

  // VoltageDividerTool.tsx
  const find = (vin: number, vout: number, series: ESeriesName, scale: number) => ({
    mode: "find", vinV: vin, targetVoutV: vout, series,
    options: dividerOptions(vin, vout, series, scale).map((o) => ({ r1Ohms: o.r1, r2Ohms: o.r2, voutV: o.vout, errorPercent: o.error * 100, totalOhms: o.totalR })),
  });
  parity("sensor.voltage_divider", [
    { input: {}, expected: find(5, 3.3, "E96", 10000) },
    { input: { vinV: 12, voutV: 3.3, series: "E24" }, expected: find(12, 3.3, "E24", 10000) },
    { input: { vinV: 24, voutV: 2.5, r2ScaleOhms: 1000 }, expected: find(24, 2.5, "E96", 1000) },
    { input: { vinV: 3.3, voutV: 1.8, series: "E24", r2ScaleOhms: 100000 }, expected: find(3.3, 1.8, "E24", 100000) },
    { input: { mode: "compute" }, expected: { mode: "compute", vinV: 5, r1Ohms: 10000, r2Ohms: 10000, voutV: dividerVout(5, 10000, 10000) } },
    { input: { mode: "compute", vinV: 3.3, r1Ohms: 4700, r2Ohms: 10000 }, expected: { mode: "compute", vinV: 3.3, r1Ohms: 4700, r2Ohms: 10000, voutV: dividerVout(3.3, 4700, 10000) } },
  ]);
});

describe("embedded-mcu parity", () => {
  // BitFieldTool.tsx: hex text → BigInt, total bits = hex digits × 4, extractFields; BigInts as strings.
  const bf = (text: string, fields: BitField[]) => {
    const raw = text.trim().replace(/^0x/i, "");
    const v = BigInt("0x" + raw);
    return {
      valueHex: "0x" + v.toString(16).toUpperCase(), valueDecimal: v.toString(), totalBits: raw.length * 4,
      binary: v.toString(2).padStart(raw.length * 4, "0"),
      fields: extractFields(v, fields).map((f) => ({ name: f.name, lsb: f.lsb, width: f.width, value: f.value.toString(), hex: f.hex, binary: f.binary })),
    };
  };
  const pageFields = [{ name: "low byte", lsb: 0, width: 8 }, { name: "mid", lsb: 8, width: 12 }, { name: "high", lsb: 20, width: 12 }];
  parity("mcu.bit_fields", [
    { input: {}, expected: bf("CAFE1234", pageFields) },
    { input: { value: "0xdeadbeef", fields: pageFields }, expected: bf("0xdeadbeef", pageFields) },
    { input: { value: "FFFFFFFFFFFFFFFF", fields: [{ name: "top", lsb: 63, width: 1 }, { name: "all", lsb: 0, width: 64 }] },
      expected: bf("FFFFFFFFFFFFFFFF", [{ name: "top", lsb: 63, width: 1 }, { name: "all", lsb: 0, width: 64 }]) },
    { input: { value: "0x0000A5", fields: [{ name: "b7", lsb: 7, width: 1 }, { lsb: 0, width: 4 }] },
      expected: bf("0x0000A5", [{ name: "b7", lsb: 7, width: 1 }, { name: "field", lsb: 0, width: 4 }]) },
    { input: { value: "1", fields: [{ name: "beyond", lsb: 8, width: 8 }] }, expected: bf("1", [{ name: "beyond", lsb: 8, width: 8 }]) },
  ]);

  // CanBitTimingTool.tsx: sample point typed in %, engine takes 0..1.
  const can = (f: number, r: number, sp: number) => ({
    clockHz: f, bitrate: r, samplePointPercent: sp,
    options: canBitTiming(f, r, sp / 100).map((o) => ({ prescaler: o.prescaler, tqPerBit: o.tqPerBit, seg1: o.seg1, seg2: o.seg2, samplePointPercent: o.samplePoint * 100, actualBitrate: o.actualRate, errorPercent: o.error * 100 })),
  });
  parity("mcu.can_bit_timing", [
    { input: {}, expected: can(8e6, 5e5, 87.5) },
    { input: { clockHz: 16000000, bitrate: 250000 }, expected: can(16e6, 250000, 87.5) },
    { input: { clockHz: 42000000, bitrate: 1000000, samplePointPercent: 80 }, expected: can(42e6, 1e6, 80) },
    { input: { clockHz: 36000000, bitrate: 125000, samplePointPercent: 75 }, expected: can(36e6, 125000, 75) },
    { input: { clockHz: 24000000, bitrate: 83333 }, expected: can(24e6, 83333, 87.5) },
  ]);

  // I2cPullupTool.tsx: pF → F, suggestion = nearest E24 to the geometric mean of the bounds.
  const i2c = (mode: I2cMode, vdd: number, pf: number) => {
    const r = i2cPullup(vdd, pf * 1e-12, mode);
    return {
      mode, vddV: vdd, busCapacitancePf: pf, riseTimeMaxNs: I2C_TR_MAX[mode] * 1e9, sinkCurrentMa: I2C_IOL[mode] * 1e3,
      rMinOhms: r.rMin, rMaxOhms: r.rMax, ok: r.ok, suggestedOhms: r.ok ? nearestValue(Math.sqrt(r.rMin * r.rMax), "E24") : null,
      ...(r.ok ? {} : { note: "No valid resistor: rise-time limit is below the sink-current limit. Reduce bus capacitance, lower the speed mode, or use a bus accelerator." }),
    };
  };
  parity("mcu.i2c_pullup", [
    { input: {}, expected: i2c("fast", 3.3, 150) },
    { input: { mode: "standard", vddV: 5, busCapacitancePf: 400 }, expected: i2c("standard", 5, 400) },
    { input: { mode: "fast-plus", vddV: 3.3, busCapacitancePf: 100 }, expected: i2c("fast-plus", 3.3, 100) },
    { input: { vddV: 1.8, busCapacitancePf: 50 }, expected: i2c("fast", 1.8, 50) },
    { input: { vddV: 5, busCapacitancePf: 400 }, expected: i2c("fast", 5, 400) },
  ]);

  // TimerCalcTool.tsx: period column = 1/actual in ms.
  const tim = (f: number, t: number) => ({
    timerClockHz: f, targetHz: t,
    options: timerSolutions(f, t).map((o) => ({ psc: o.psc, arr: o.arr, actualHz: o.actual, periodMs: (1 / o.actual) * 1000, errorPercent: o.error * 100 })),
  });
  parity("mcu.timer_prescaler", [
    { input: {}, expected: tim(72e6, 1000) },
    { input: { timerClockHz: 84000000, targetHz: 50 }, expected: tim(84e6, 50) },
    { input: { timerClockHz: 16000000, targetHz: 38000 }, expected: tim(16e6, 38000) },
    { input: { timerClockHz: 170000000, targetHz: 1 }, expected: tim(170e6, 1) },
    { input: { timerClockHz: 48000000, targetHz: 7 }, expected: tim(48e6, 7) },
  ]);

  // StructPaddingTool.tsx: sizeof / alignment / padding line, padding % rounded as on the page, tail padding from the byte map.
  const DEFAULT_SRC = "uint8_t  flags;\nuint32_t count;\nuint16_t id;\nchar     name[8];";
  const lay = (src: string, arch: Arch) => {
    const p = parseStructBody(src);
    if (!p.ok) throw new Error(p.error);
    const l = layoutStruct(p.members, arch);
    const data = l.rows.reduce((n, r) => n + r.padBefore + r.size, 0);
    return {
      arch, sizeofBytes: l.size, alignBytes: l.align, totalPaddingBytes: l.totalPadding,
      paddingPercent: Math.round((l.totalPadding / l.size) * 100), tailPaddingBytes: l.size - data,
      members: l.rows.map((r) => ({ name: r.name, type: r.type, pointer: r.pointer, count: r.count, offset: r.offset, sizeBytes: r.size, align: r.align, padBefore: r.padBefore })),
    };
  };
  parity("mcu.struct_padding", [
    { input: {}, expected: lay(DEFAULT_SRC, 32) },
    { input: { arch: 64, members: "long l; char c;" }, expected: lay("long l; char c;", 64) },
    { input: { members: "char c; double d; char e;", arch: 64 }, expected: lay("char c; double d; char e;", 64) },
    { input: { members: "uint8_t a; void *p; uint16_t b;" }, expected: lay("uint8_t a; void *p; uint16_t b;", 32) },
    { input: { members: "{\n  int32_t x; // comment\n  /* c */ uint8_t buf[3];\n}", arch: 64 }, expected: lay("{\n  int32_t x; // comment\n  /* c */ uint8_t buf[3];\n}", 64) },
  ]);

  // UartBaudTool.tsx: verdict at the ±2 % rule of thumb, plus the common-baud table.
  const COMMON = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
  const uart = (f: number, b: number, os: number) => {
    const r = uartBaudError(f, b, os);
    return {
      clockHz: f, baud: b, oversampling: os, divisor: r.divisor, actualBaud: r.actualBaud, errorPercent: r.error * 100, withinTolerance: Math.abs(r.error) < 0.02,
      commonBauds: COMMON.map((x) => {
        const e = uartBaudError(f, x, os);
        return { baud: x, divisor: e.divisor, actualBaud: e.actualBaud, errorPercent: e.error * 100, withinTolerance: Math.abs(e.error) < 0.02 };
      }),
    };
  };
  parity("mcu.uart_baud_error", [
    { input: {}, expected: uart(16e6, 115200, 16) },
    { input: { clockHz: 14745600, baud: 115200 }, expected: uart(14745600, 115200, 16) },
    { input: { clockHz: 72000000, baud: 921600, oversampling: 8 }, expected: uart(72e6, 921600, 8) },
    { input: { clockHz: 8000000, baud: 9600 }, expected: uart(8e6, 9600, 16) },
    { input: { clockHz: 1000000, baud: 2000000 }, expected: uart(1e6, 2e6, 16) },
  ]);
});

describe("sensor/mcu reject unusable input with a message", () => {
  it.each([
    ["sensor.adc", { count: 4096 }],
    ["sensor.adc", { vrefV: 0 }],
    ["sensor.db_dbm", { mode: "power", ratio: -1 }],
    ["sensor.measurement_accuracy", { reading: 1, range: 0 }],
    ["sensor.measurement_accuracy", { reading: 1, ofReading: 0, ofRange: 0 }],
    ["sensor.measurement_accuracy", { reading: 1, instrument: "fluke-87v-dcv", presetRange: 9 }],
    ["sensor.rtd_pt100", { temperatureC: -10 }],
    ["sensor.rtd_pt100", { direction: "resistanceToTemperature", resistanceOhms: 90 }],
    ["sensor.thermocouple", { mode: "toMv", type: "T", temperatureC: 1000 }],
    ["sensor.voltage_divider", { voutV: 6 }],
    ["mcu.bit_fields", { value: "FF", fields: [{ lsb: 60, width: 8 }] }],
    ["mcu.can_bit_timing", { samplePointPercent: 100 }],
    ["mcu.can_bit_timing", { clockHz: 1000000, bitrate: 1000000 }],
    ["mcu.timer_prescaler", { timerClockHz: 1000, targetHz: 2000 }],
    ["mcu.struct_padding", { members: "foo_t x;" }],
    ["mcu.uart_baud_error", { baud: 0 }],
  ])("%s %j", (name, input) => {
    const r = callTool(name, input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});
