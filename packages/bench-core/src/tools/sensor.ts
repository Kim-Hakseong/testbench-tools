// Sensor & signal and embedded MCU tools — the same engine calls the site's
// components in apps/web/components/tool/ make, with their input parsing
// replaced by JSON Schema and their result cards returned as plain JSON.
//
// Numbers are returned unrounded (the page rounds only for display); the unit
// of every number is in its key name.

import {
  INSTRUMENT_PRESETS,
  NTC_REFERENCE_CURVES,
  THERMOCOUPLE_TYPES,
  adcToVoltage,
  canBitTiming,
  dbFromPowerRatio,
  dbFromVoltageRatio,
  dividerOptions,
  dividerVout,
  extractFields,
  formatSpec,
  halfDigitMaxCounts,
  i2cPullup,
  I2C_IOL,
  I2C_TR_MAX,
  instrumentPreset,
  layoutStruct,
  measurementAccuracy,
  nearestValue,
  ntcBetaFromTwoPoints,
  ntcBetaLabel,
  ntcBetaResistance,
  ntcBetaTemperature,
  ntcCheckAgainstTable,
  ntcDividerReading,
  ntcFitSteinhartHart,
  ntcModelDeviation,
  ntcSteinhartResistance,
  ntcSteinhartTemperature,
  ntcSweepTemperatures,
  parseStructBody,
  powerRatioFromDb,
  rtdResistance,
  rtdTemperature,
  sineLevels,
  tcTemperature,
  tcVoltage,
  tcWithColdJunction,
  timerSolutions,
  uartBaudError,
  voltageRatioFromDb,
  voltageToAdc,
  vrmsFromPower,
  wattsFromDbm,
  type AccuracySpec,
  type Arch,
  type BitField,
  type CountBasis,
  type ESeriesName,
  type I2cMode,
  type NtcBetaParams,
  type NtcDividerTopology,
  type SteinhartHartCoefficients,
} from "@testbench/engine";
import { ToolInputError, num, str, type ToolDef } from "../define";

/** Optional numeric input: absent means "this term is not in my spec", like a blank page field. */
const opt = (o: Record<string, unknown>, k: string): number | undefined => (o[k] === undefined ? undefined : Number(o[k]));

/** The MCU pages' `num()`: zero and negatives are refused. */
function positive(o: Record<string, unknown>, k: string, label: string): number {
  const v = num(o, k);
  if (!(v > 0)) throw new ToolInputError(`${label} must be greater than 0.`);
  return v;
}

// ---------------------------------------------------------------------------
// Sensor & signal
// ---------------------------------------------------------------------------

const ADC_BITS = [8, 10, 12, 14, 16, 24];

const adc: ToolDef = {
  name: "sensor.adc",
  slug: "adc-calculator",
  category: "sensor-signal",
  title: "ADC count ↔ voltage",
  description:
    "Convert an N-bit ADC count to volts or a voltage to the nearest code, using ratio = count / (2^N − 1). Example: 12-bit, Vref 3.3 V, count 2048 → 1.650403 V with an LSB of 0.805861 mV.",
  inputSchema: {
    type: "object",
    properties: {
      direction: { type: "string", enum: ["countToVoltage", "voltageToCount"], default: "countToVoltage", description: "Count → voltage, or voltage → nearest code." },
      bits: { type: "integer", enum: ADC_BITS, default: 12, description: "ADC resolution in bits." },
      vrefV: { type: "number", default: 3.3, description: "Reference (full-scale) voltage in volts; must be > 0." },
      count: { type: "integer", default: 2048, description: "ADC count, 0…2^N − 1 (countToVoltage)." },
      voltageV: { type: "number", default: 1.65, description: "Input voltage in volts (voltageToCount)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const bits = num(input, "bits");
    const vref = num(input, "vrefV");
    if (!(vref > 0)) throw new ToolInputError("vrefV must be greater than 0.");
    const maxCode = Math.pow(2, bits) - 1;
    if (input.direction === "countToVoltage") {
      const count = num(input, "count");
      if (count < 0 || count > maxCode) throw new ToolInputError(`Count must be an integer in 0…${maxCode}.`);
      const r = adcToVoltage(count, bits, vref);
      return { direction: "countToVoltage", bits, vrefV: vref, maxCode, count, voltageV: r.voltage, lsbMv: r.lsb * 1000, ratioPercent: r.ratio * 100 };
    }
    const voltage = num(input, "voltageV");
    const code = voltageToAdc(voltage, bits, vref);
    return { direction: "voltageToCount", bits, vrefV: vref, maxCode, voltageV: voltage, code, codeHex: "0x" + code.toString(16).toUpperCase(), lsbMv: (vref / maxCode) * 1000 };
  },
  examples: [
    {},
    { count: 4095 },
    { bits: 10, vrefV: 5, count: 512 },
    { direction: "voltageToCount", bits: 16, vrefV: 2.5, voltageV: 1.2 },
    { direction: "voltageToCount", bits: 24, vrefV: 3.3, voltageV: 4 },
    { direction: "voltageToCount", bits: 8, vrefV: 3.3, voltageV: -0.2 },
  ],
};

const dbDbm: ToolDef = {
  name: "sensor.db_dbm",
  slug: "db-dbm",
  category: "sensor-signal",
  title: "dB / dBm converter",
  description:
    "Convert dBm to milliwatts, watts and Vrms into 50/75/600 Ω, or a power or voltage ratio to and from dB. Example: 0 dBm into 50 Ω → 1 mW and 0.223607 Vrms; voltage ratio 2 → 6.0206 dB.",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["dbm", "power", "voltage"], default: "dbm", description: "dbm: dBm ↔ power; power: 10·log10 ratio; voltage: 20·log10 ratio." },
      dbm: { type: "number", default: 0, description: "Power level in dBm (mode dbm)." },
      impedanceOhms: { type: "number", enum: [50, 75, 600], default: 50, description: "Load impedance for the Vrms figure (mode dbm)." },
      direction: { type: "string", enum: ["toDb", "toRatio"], default: "toDb", description: "Ratio → dB or dB → ratio (modes power and voltage)." },
      ratio: { type: "number", default: 2, description: "P2/P1 or V2/V1, must be > 0 (direction toDb)." },
      db: { type: "number", default: 3, description: "Level in dB (direction toRatio)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const mode = str(input, "mode");
    if (mode === "dbm") {
      const dbm = num(input, "dbm");
      const z = num(input, "impedanceOhms");
      const w = wattsFromDbm(dbm);
      return { mode, dbm, impedanceOhms: z, powerMw: w * 1000, powerW: w, vrmsV: vrmsFromPower(w, z) };
    }
    if (input.direction === "toDb") {
      const ratio = num(input, "ratio");
      if (!(ratio > 0)) throw new ToolInputError("ratio must be greater than 0.");
      return { mode, direction: "toDb", ratio, db: mode === "power" ? dbFromPowerRatio(ratio) : dbFromVoltageRatio(ratio) };
    }
    const db = num(input, "db");
    return { mode, direction: "toRatio", db, ratio: mode === "power" ? powerRatioFromDb(db) : voltageRatioFromDb(db) };
  },
  examples: [
    {},
    { dbm: 30, impedanceOhms: 75 },
    { dbm: -20, impedanceOhms: 600 },
    { mode: "power", ratio: 2 },
    { mode: "voltage", ratio: 2 },
    { mode: "power", direction: "toRatio", db: -3 },
    { mode: "voltage", direction: "toRatio", db: 20 },
  ],
};

const PRESET_IDS = INSTRUMENT_PRESETS.map((p) => p.id);

const measurementAccuracyTool: ToolDef = {
  name: "sensor.measurement_accuracy",
  slug: "measurement-accuracy",
  category: "sensor-signal",
  title: "Measurement accuracy / uncertainty",
  description:
    "Turn an instrument accuracy spec ±(% of reading + % of range + counts + offset) into an absolute ± uncertainty with a per-term breakdown, manually or from a sourced DMM preset. Example: reading 4.7 V on the 10 V range at ±(0.0035 % of reading + 0.0005 % of range) → ±0.0002145 V, 45.6 ppm of reading.",
  inputSchema: {
    type: "object",
    properties: {
      reading: { type: "number", description: "The value the instrument displayed." },
      instrument: { type: "string", enum: PRESET_IDS, description: "Optional sourced preset (DC voltage, 1-year spec). When set, range, unit and all spec fields come from the preset row." },
      presetRange: { type: "integer", minimum: 0, default: 0, description: "Row of the preset's range table, 0 = lowest range (only with instrument)." },
      range: { type: "number", default: 10, description: "Range (full scale) the instrument was on, same unit as reading; must be > 0." },
      unit: { type: "string", default: "V", maxLength: 6, description: "Unit label for the output." },
      proportionalUnit: { type: "string", enum: ["percent", "ppm"], default: "percent", description: "Whether ofReading/ofRange are in % or ppm." },
      ofReading: { type: "number", default: 0.0035, description: "% (or ppm) of reading term; 0 = none." },
      ofRange: { type: "number", default: 0.0005, description: "% (or ppm) of range term; 0 = none." },
      counts: { type: "number", description: "Counts/digits term (optional); needs countBasis." },
      offset: { type: "number", description: "Fixed offset in the measured unit (optional)." },
      countBasis: { type: "string", enum: ["countsFullScale", "digits", "resolution"], default: "countsFullScale", description: "How one count is sized: display counts at full scale, display digits (4.5, 5.5…), or the resolution itself." },
      countBasisValue: { type: "number", default: 6000, description: "Value for countBasis (e.g. 6000 counts, 4.5 digits, or 0.001 V)." },
    },
    required: ["reading"],
    additionalProperties: false,
  },
  run: (input) => {
    const reading = num(input, "reading");
    let range = num(input, "range");
    let unit = str(input, "unit");
    let basisKind = str(input, "countBasis") as CountBasis["kind"];
    const basisValue = num(input, "countBasisValue");
    let instrument: Record<string, unknown> | null = null;
    let spec: AccuracySpec;
    let countBasis: CountBasis | undefined =
      basisKind === "countsFullScale" ? { kind: "countsFullScale", countsFullScale: basisValue }
      : basisKind === "digits" ? { kind: "digits", digits: basisValue }
      : { kind: "resolution", resolution: basisValue };

    if (input.instrument !== undefined) {
      const preset = instrumentPreset(str(input, "instrument"))!;
      const row = preset.ranges[num(input, "presetRange")];
      if (!row) throw new ToolInputError(`presetRange must be 0…${preset.ranges.length - 1} for ${preset.id}.`);
      // AccuracyTool.applyPreset: unit, range and the % terms from the row; offset cleared.
      unit = preset.unit;
      range = row.range;
      spec = { percentOfReading: row.spec.percentOfReading, percentOfRange: row.spec.percentOfRange, counts: row.spec.counts, offset: undefined };
      if (row.countBasis?.kind === "resolution") {
        basisKind = "resolution";
        countBasis = row.countBasis;
      }
      instrument = {
        id: preset.id, vendor: preset.vendor, model: preset.model, functionName: preset.functionName,
        rangeLabel: row.label, conditions: preset.conditions, source: preset.source, note: row.note ?? null,
      };
    } else {
      const ppm = input.proportionalUnit === "ppm";
      const rdg = opt(input, "ofReading");
      const rng = opt(input, "ofRange");
      spec = {
        percentOfReading: ppm ? undefined : rdg,
        ppmOfReading: ppm ? rdg : undefined,
        percentOfRange: ppm ? undefined : rng,
        ppmOfRange: ppm ? rng : undefined,
        counts: opt(input, "counts"),
        offset: opt(input, "offset"),
      };
    }

    const r = measurementAccuracy({ reading, range, spec, countBasis });
    if (!r.ok) throw new ToolInputError(r.error);
    if (r.specEmpty) throw new ToolInputError("Enter at least one term of your instrument's accuracy specification.");
    return {
      instrument,
      reading,
      range,
      unit,
      spec: formatSpec(spec, unit),
      uncertainty: r.uncertainty,
      min: r.min,
      max: r.max,
      percentOfReading: r.percentOfReading,
      ppmOfReading: r.ppmOfReading,
      percentOfRange: r.percentOfRange,
      terms: r.terms.map((t) => ({ id: t.id, label: t.label, value: t.value, fraction: t.fraction, fixed: t.fixed })),
      dominantTerm: r.dominant?.id ?? null,
      readingPercentOfRange: r.readingPercentOfRange,
      countSize: r.countSize,
      crossoverReading: r.crossoverReading,
      readingExceedsRange: r.readingExceedsRange,
      fixedExceedsReading: r.fixedExceedsReading,
      maxDisplayCounts: basisKind === "digits" ? halfDigitMaxCounts(basisValue) : null,
    };
  },
  examples: [
    { reading: 4.7 },
    { reading: 0.1 },
    { reading: 3.3, instrument: "fluke-87v-dcv", presetRange: 1 },
    { reading: 0.05, instrument: "keysight-34461a-dcv", presetRange: 0 },
    { reading: 12, range: 20, proportionalUnit: "ppm", ofReading: 35, ofRange: 5 },
    { reading: 1.234, range: 6, ofReading: 0.05, ofRange: 0, counts: 3, countBasis: "digits", countBasisValue: 3.5 },
  ],
};

// --- NTC thermistor ---------------------------------------------------------

const CURVE = NTC_REFERENCE_CURVES[0]!;
const DEFAULT_POINTS = CURVE.suggestedFitC.map((c) => {
  const row = CURVE.table.find(([t]) => t === c)!;
  return { celsius: row[0], ohms: row[1] };
});

const ntc: ToolDef = {
  name: "sensor.ntc_thermistor",
  slug: "ntc-thermistor-calculator",
  category: "sensor-signal",
  title: "NTC thermistor (Beta and Steinhart-Hart)",
  description:
    "Convert NTC thermistor resistance to temperature (or back) with both the Beta equation and a Steinhart-Hart curve fitted to three points, plus the gap between them, a model-deviation sweep and an optional divider/ADC reading. Example: 32554 Ω with R0 10 kΩ at 25 °C and B25/85 3977 K, fitted to the Vishay NTCLE100E3103 points → 0.021 °C (Steinhart-Hart) and 0.762 °C (Beta).",
  inputSchema: {
    type: "object",
    properties: {
      direction: { type: "string", enum: ["resistanceToTemperature", "temperatureToResistance"], default: "resistanceToTemperature", description: "Which way to convert." },
      resistanceOhms: { type: "number", default: 32554, description: "Measured resistance in Ω (resistanceToTemperature)." },
      temperatureC: { type: "number", default: 0, description: "Temperature in °C (temperatureToResistance)." },
      r0Ohms: { type: "number", default: 10000, description: "Beta model: resistance at T0, in Ω." },
      t0C: { type: "number", default: 25, description: "Beta model: anchor temperature T0 in °C." },
      betaSource: { type: "string", enum: ["value", "derived"], default: "value", description: "value: use betaK from the datasheet; derived: compute B from the Steinhart-Hart curve between betaLowC and betaHighC." },
      betaK: { type: "number", default: 3977, description: "B parameter in kelvin (betaSource value)." },
      betaLowC: { type: "number", default: 25, description: "Lower temperature B is quoted between, °C." },
      betaHighC: { type: "number", default: 85, description: "Upper temperature B is quoted between, °C." },
      shSource: { type: "string", enum: ["fit", "coefficients"], default: "fit", description: "fit: fit A, B, C to fitPoints; coefficients: use shA/shB/shC directly." },
      fitPoints: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        description: "Three (°C, Ω) points for the Steinhart-Hart fit; omitted = the Vishay NTCLE100E3103 datasheet points at −40, 25 and 125 °C.",
        items: {
          type: "object",
          properties: {
            celsius: { type: "number", description: "Temperature in °C." },
            ohms: { type: "number", description: "Resistance in Ω." },
          },
          required: ["celsius", "ohms"],
          additionalProperties: false,
        },
      },
      shA: { type: "number", default: 1.138449e-3, description: "Steinhart-Hart A (shSource coefficients)." },
      shB: { type: "number", default: 2.325188e-4, description: "Steinhart-Hart B (shSource coefficients)." },
      shC: { type: "number", default: 9.469821e-8, description: "Steinhart-Hart C (shSource coefficients)." },
      dividerTopology: { type: "string", enum: ["pulldown", "pullup"], default: "pulldown", description: "pulldown: series resistor to supply, thermistor to ground; pullup: the reverse." },
      seriesOhms: { type: "number", default: 10000, description: "Divider series resistor in Ω." },
      supplyV: { type: "number", default: 3.3, description: "Divider supply (and ratiometric ADC reference) in volts." },
      adcBits: { type: "integer", default: 12, description: "ADC resolution for the divider count." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const points = (input.fitPoints as { celsius: number; ohms: number }[] | undefined) ?? DEFAULT_POINTS;
    const shSource = str(input, "shSource");
    let co: SteinhartHartCoefficients | null = null;
    let shError: string | null = null;
    let fitMaxResidualC: number | null = null;
    if (shSource === "fit") {
      const fit = ntcFitSteinhartHart(points);
      if (fit.ok) {
        co = fit.coefficients;
        fitMaxResidualC = fit.maxResidualC;
      } else shError = fit.error;
    } else {
      co = { a: num(input, "shA"), b: num(input, "shB"), c: num(input, "shC") };
    }

    const pairLo = num(input, "betaLowC");
    const pairHi = num(input, "betaHighC");
    let derived: { beta: number } | { error: string } | null = null;
    if (co) {
      const lo = ntcSteinhartResistance(co, pairLo);
      const hi = ntcSteinhartResistance(co, pairHi);
      if (!lo.ok) derived = { error: lo.error };
      else if (!hi.ok) derived = { error: hi.error };
      else {
        const b = ntcBetaFromTwoPoints({ ohms: lo.ohms, celsius: pairLo }, { ohms: hi.ohms, celsius: pairHi });
        derived = b.ok ? { beta: b.beta } : { error: b.error };
      }
    }
    let betaValue: number;
    if (input.betaSource === "value") betaValue = num(input, "betaK");
    else if (derived && "beta" in derived) betaValue = derived.beta;
    else throw new ToolInputError(derived ? derived.error : shError ?? "No Steinhart-Hart curve to derive B from.");
    const beta: NtcBetaParams = { r0Ohms: num(input, "r0Ohms"), t0C: num(input, "t0C"), beta: betaValue, betaLowC: pairLo, betaHighC: pairHi };

    const toT = input.direction === "resistanceToTemperature";
    const x = toT ? num(input, "resistanceOhms") : num(input, "temperatureC");
    const bRes = toT ? ntcBetaTemperature(beta, x) : ntcBetaResistance(beta, x);
    const sRes = co ? (toT ? ntcSteinhartTemperature(co, x) : ntcSteinhartResistance(co, x)) : null;
    if (!bRes.ok && !(sRes && sRes.ok)) throw new ToolInputError(bRes.error);
    const model = (r: typeof bRes) => (r.ok ? ("celsius" in r ? { celsius: r.celsius } : { ohms: r.ohms }) : { error: r.error });

    let gap: Record<string, number> | null = null;
    if (bRes.ok && sRes?.ok) {
      if ("celsius" in bRes && "celsius" in sRes) gap = { deltaC: bRes.celsius - sRes.celsius };
      else if ("ohms" in bRes && "ohms" in sRes) gap = { deltaOhms: bRes.ohms - sRes.ohms, deltaPercent: ((bRes.ohms - sRes.ohms) / sRes.ohms) * 100 };
    }

    let deviation: Record<string, unknown> | null = null;
    if (co) {
      const temps = points.map((p) => p.celsius);
      const lo = Math.min(...temps);
      const hi = Math.max(...temps);
      const d = ntcModelDeviation(beta, co, ntcSweepTemperatures(lo, hi, 7));
      if (d.ok) deviation = { fromC: lo, toC: hi, maxAbsDeviationC: d.maxAbsDeviationC, worstCelsius: d.worstCelsius, rows: d.rows };
    }

    const usingCurvePoints = shSource === "fit" && points.every((p) => CURVE.table.some(([tc, ro]) => tc === p.celsius && ro === p.ohms));
    let tableCheck: Record<string, unknown> | null = null;
    if (usingCurvePoints && co) {
      const c = ntcCheckAgainstTable(co, CURVE.table);
      if (c.ok) tableCheck = { curve: CURVE.label, rows: c.count, maxAbsC: c.maxAbsC, worstCelsius: c.worstCelsius, rmsC: c.rmsC };
    }

    const dividerOhms = toT ? x : sRes?.ok && "ohms" in sRes ? sRes.ohms : bRes.ok && "ohms" in bRes ? bRes.ohms : null;
    let divider: Record<string, unknown> | null = null;
    if (dividerOhms !== null) {
      const dv = ntcDividerReading({
        ohms: dividerOhms,
        seriesOhms: num(input, "seriesOhms"),
        supplyVolts: num(input, "supplyV"),
        topology: str(input, "dividerTopology") as NtcDividerTopology,
        adcBits: num(input, "adcBits"),
      });
      divider = dv.ok
        ? { thermistorOhms: dividerOhms, outputV: dv.volts, ratio: dv.ratio, adcCount: dv.counts ?? null, adcFullScale: dv.fullScaleCounts ?? null }
        : { error: dv.error };
    }

    return {
      direction: toT ? "resistanceToTemperature" : "temperatureToResistance",
      input: toT ? { resistanceOhms: x } : { temperatureC: x },
      steinhartHart: sRes ? model(sRes) : shError ? { error: shError } : null,
      beta: model(bRes),
      betaMinusSteinhartHart: gap,
      betaLabel: ntcBetaLabel(beta),
      betaK: betaValue,
      derivedBetaK: derived && "beta" in derived ? derived.beta : null,
      coefficients: co,
      fitMaxResidualC,
      deviation,
      tableCheck,
      divider,
    };
  },
  examples: [
    {},
    { direction: "temperatureToResistance", temperatureC: 100 },
    { resistanceOhms: 1070, betaSource: "derived" },
    { resistanceOhms: 5000, shSource: "coefficients", dividerTopology: "pullup" },
    { resistanceOhms: 12000, r0Ohms: 10000, betaK: 3950, fitPoints: [{ celsius: 0, ohms: 32554 }, { celsius: 25, ohms: 10000 }, { celsius: 85, ohms: 1070 }] },
    { direction: "temperatureToResistance", temperatureC: -20, seriesOhms: 47000, supplyV: 5, adcBits: 10 },
  ],
};

const pt100: ToolDef = {
  name: "sensor.rtd_pt100",
  slug: "pt100-calculator",
  category: "sensor-signal",
  title: "PT100 / PT1000 RTD",
  description:
    "Convert temperature to resistance or resistance to temperature for a PT100 or PT1000 RTD using the IEC 60751 Callendar-Van Dusen equation (0…850 °C branch). Example: PT100 at 100 °C → 138.5055 Ω.",
  inputSchema: {
    type: "object",
    properties: {
      sensor: { type: "string", enum: ["PT100", "PT1000"], default: "PT100", description: "R0 = 100 Ω or 1000 Ω." },
      direction: { type: "string", enum: ["temperatureToResistance", "resistanceToTemperature"], default: "temperatureToResistance", description: "Which way to convert." },
      temperatureC: { type: "number", default: 100, description: "Temperature in °C, 0…850 (temperatureToResistance)." },
      resistanceOhms: { type: "number", default: 108.5, description: "Resistance in Ω, ≥ R0 (resistanceToTemperature)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const r0 = input.sensor === "PT1000" ? 1000 : 100;
    if (input.direction === "temperatureToResistance") {
      const t = num(input, "temperatureC");
      const r = rtdResistance(t, r0);
      if (r === null) throw new ToolInputError("Supported range is 0…850 °C (the T < 0 °C branch of IEC 60751 is not implemented here).");
      return { sensor: str(input, "sensor"), r0Ohms: r0, temperatureC: t, resistanceOhms: r };
    }
    const r = num(input, "resistanceOhms");
    const t = rtdTemperature(r, r0);
    if (t === null) throw new ToolInputError(`Supported range is R ≥ R0 (${r0} Ω), i.e. T ≥ 0 °C.`);
    return { sensor: str(input, "sensor"), r0Ohms: r0, resistanceOhms: r, temperatureC: t };
  },
  examples: [
    {},
    { temperatureC: 0 },
    { sensor: "PT1000", temperatureC: 850 },
    { direction: "resistanceToTemperature" },
    { sensor: "PT1000", direction: "resistanceToTemperature", resistanceOhms: 1385.055 },
  ],
};

const rmsPeak: ToolDef = {
  name: "sensor.rms_peak",
  slug: "rms-peak",
  category: "sensor-signal",
  title: "RMS / peak / peak-to-peak (sine)",
  description:
    "Convert between RMS, peak, peak-to-peak and rectified average for a pure sine wave with no DC offset. Example: 230 V RMS → 325.269 V peak, 650.538 V peak-to-peak, 207.073 V rectified average.",
  inputSchema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["rms", "peak", "pp"], default: "rms", description: "What `value` is: RMS, peak, or peak-to-peak." },
      value: { type: "number", default: 230, description: "The known level (any unit; outputs use the same unit)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const l = sineLevels(str(input, "kind") as "rms" | "peak" | "pp", num(input, "value"));
    return { kind: str(input, "kind"), value: num(input, "value"), rms: l.rms, peak: l.peak, peakToPeak: l.peakToPeak, avgRectified: l.avgRectified };
  },
  examples: [{}, { value: 120 }, { kind: "peak", value: 1 }, { kind: "pp", value: 10 }, { kind: "rms", value: 0.707 }],
};

const TC_IDS = THERMOCOUPLE_TYPES.map((t) => t.id as string);

const thermocouple: ToolDef = {
  name: "sensor.thermocouple",
  slug: "thermocouple-calculator",
  category: "sensor-signal",
  title: "Thermocouple (NIST ITS-90, types B E J K N R S T)",
  description:
    "Convert thermocouple °C to mV, mV to °C, or measured mV plus cold-junction temperature to hot-junction °C with the NIST Monograph 175 polynomials, including the inverse error band and sub-range used. Example: type K, 4.096 mV measured with the cold junction at 25 °C → 124.31 °C.",
  inputSchema: {
    type: "object",
    properties: {
      type: { type: "string", enum: TC_IDS, default: "K", description: "Thermocouple type letter." },
      mode: { type: "string", enum: ["cjc", "toC", "toMv"], default: "cjc", description: "cjc: measured mV + cold junction → °C; toC: mV → °C (cold junction at 0 °C); toMv: °C → mV." },
      temperatureC: { type: "number", default: 100, description: "Hot-junction temperature in °C (mode toMv)." },
      millivolts: { type: "number", default: 4.096, description: "Measured voltage in mV (modes cjc and toC)." },
      coldJunctionC: { type: "number", default: 25, description: "Cold-junction temperature in °C (mode cjc)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const type = str(input, "type");
    const info = THERMOCOUPLE_TYPES.find((x) => x.id === type)!;
    const mode = str(input, "mode");
    const base = { type, name: info.name, mode };
    if (mode === "toMv") {
      const c = num(input, "temperatureC");
      const r = tcVoltage(type, c);
      if (!r.ok) throw new ToolInputError(r.error);
      return { ...base, temperatureC: c, millivolts: r.millivolts, subrangeC: { min: r.subrange.minC, max: r.subrange.maxC }, validSpanC: { min: info.minC, max: info.maxC } };
    }
    const mv = num(input, "millivolts");
    const span = { validSpanMv: { min: info.minMv, max: info.maxMv }, validSpanC: { min: info.inverseMinC, max: info.inverseMaxC } };
    if (mode === "toC") {
      const r = tcTemperature(type, mv);
      if (!r.ok) throw new ToolInputError(r.error);
      return { ...base, millivolts: mv, temperatureC: r.celsius, errorBandC: { min: r.errorMinC, max: r.errorMaxC }, subrangeMv: { min: r.subrange.minMv, max: r.subrange.maxMv }, ...span };
    }
    const cj = num(input, "coldJunctionC");
    const r = tcWithColdJunction(type, mv, cj);
    if (!r.ok) throw new ToolInputError(r.error);
    return {
      ...base, millivolts: mv, coldJunctionC: cj, temperatureC: r.celsius, coldJunctionMv: r.coldJunctionMv, totalMv: r.totalMv,
      errorBandC: { min: r.errorMinC, max: r.errorMaxC }, subrangeMv: { min: r.subrange.minMv, max: r.subrange.maxMv }, ...span,
    };
  },
  examples: [
    {},
    { mode: "toC", millivolts: 4.096 },
    { mode: "toMv", type: "J", temperatureC: 500 },
    { type: "T", millivolts: -1.2, coldJunctionC: 22 },
    { mode: "toC", type: "S", millivolts: 10 },
    { mode: "toMv", type: "B", temperatureC: 1200 },
  ],
};

const voltageDivider: ToolDef = {
  name: "sensor.voltage_divider",
  slug: "voltage-divider",
  category: "sensor-signal",
  title: "Voltage divider",
  description:
    "Find E24/E96 resistor pairs for a target divider output, or compute the unloaded Vout = Vin·R2/(R1+R2) for given resistors. Example: compute with Vin 5 V, R1 10 kΩ, R2 10 kΩ → 2.5 V.",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["find", "compute"], default: "find", description: "find: search standard-value pairs; compute: Vout from R1/R2." },
      vinV: { type: "number", default: 5, description: "Input voltage in volts." },
      voutV: { type: "number", default: 3.3, description: "Target output in volts (mode find)." },
      series: { type: "string", enum: ["E24", "E96"], default: "E96", description: "Resistor series to search (mode find)." },
      r2ScaleOhms: { type: "number", enum: [1000, 10000, 100000], default: 10000, description: "R2 magnitude to search around (mode find)." },
      r1Ohms: { type: "number", default: 10000, description: "Top resistor in Ω (mode compute)." },
      r2Ohms: { type: "number", default: 10000, description: "Bottom resistor in Ω (mode compute)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const vin = num(input, "vinV");
    if (input.mode === "compute") {
      const r1 = num(input, "r1Ohms");
      const r2 = num(input, "r2Ohms");
      if (!(r1 + r2 > 0)) throw new ToolInputError("R1 + R2 must be greater than 0.");
      return { mode: "compute", vinV: vin, r1Ohms: r1, r2Ohms: r2, voutV: dividerVout(vin, r1, r2) };
    }
    const vout = num(input, "voutV");
    const opts = dividerOptions(vin, vout, str(input, "series") as ESeriesName, num(input, "r2ScaleOhms"));
    if (opts.length === 0) throw new ToolInputError("No divider: target Vout must be greater than 0 and less than Vin.");
    return {
      mode: "find", vinV: vin, targetVoutV: vout, series: str(input, "series"),
      options: opts.map((o) => ({ r1Ohms: o.r1, r2Ohms: o.r2, voutV: o.vout, errorPercent: o.error * 100, totalOhms: o.totalR })),
    };
  },
  examples: [
    {},
    { vinV: 12, voutV: 3.3, series: "E24" },
    { vinV: 24, voutV: 2.5, r2ScaleOhms: 1000 },
    { mode: "compute" },
    { mode: "compute", vinV: 3.3, r1Ohms: 4700, r2Ohms: 10000 },
  ],
};

// ---------------------------------------------------------------------------
// Embedded MCU
// ---------------------------------------------------------------------------

const DEFAULT_BIT_FIELDS: BitField[] = [
  { name: "low byte", lsb: 0, width: 8 },
  { name: "mid", lsb: 8, width: 12 },
  { name: "high", lsb: 20, width: 12 },
];

const bitFields: ToolDef = {
  name: "mcu.bit_fields",
  slug: "bit-field-extractor",
  category: "embedded-mcu",
  title: "Register bit-field extractor",
  description:
    "Extract named bit fields (LSB position + width) from a hex register value of up to 64 bits, giving each field in decimal, hex and binary. Example: 0xCAFE1234 with fields lsb 0 width 8, lsb 8 width 12, lsb 20 width 12 → 0x34, 0xE12, 0xCAF.",
  inputSchema: {
    type: "object",
    properties: {
      value: { type: "string", pattern: "^\\s*(0[xX])?[0-9A-Fa-f]{1,16}\\s*$", default: "CAFE1234", description: "Register value in hex, ≤ 64 bits, e.g. \"0xCAFE1234\"." },
      fields: {
        type: "array",
        minItems: 1,
        maxItems: 64,
        description: "Fields to extract; omitted = the page's three sample fields (0/8, 8/12, 20/12).",
        items: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 100, description: "Field name." },
            lsb: { type: "integer", minimum: 0, maximum: 63, description: "Least-significant bit position (0-based)." },
            width: { type: "integer", minimum: 1, maximum: 64, description: "Field width in bits." },
          },
          required: ["lsb", "width"],
          additionalProperties: false,
        },
      },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const raw = str(input, "value").trim().replace(/^0x/i, "");
    const value = BigInt("0x" + raw);
    const totalBits = raw.length * 4;
    const given = (input.fields as { name?: string; lsb: number; width: number }[] | undefined) ?? DEFAULT_BIT_FIELDS;
    const fields: BitField[] = given.map((f) => ({ name: f.name || "field", lsb: f.lsb, width: f.width }));
    for (const f of fields) {
      if (f.lsb + f.width > 64) throw new ToolInputError(`Field "${f.name}": lsb + width must be ≤ 64.`);
    }
    return {
      valueHex: "0x" + value.toString(16).toUpperCase(),
      valueDecimal: value.toString(),
      totalBits,
      binary: value.toString(2).padStart(totalBits, "0"),
      fields: extractFields(value, fields).map((f) => ({ name: f.name, lsb: f.lsb, width: f.width, value: f.value.toString(), hex: f.hex, binary: f.binary })),
    };
  },
  examples: [
    {},
    { value: "0x40021000", fields: [{ name: "offset", lsb: 0, width: 16 }, { name: "base", lsb: 16, width: 16 }] },
    { value: "FFFFFFFFFFFFFFFF", fields: [{ name: "top", lsb: 63, width: 1 }, { name: "all", lsb: 0, width: 64 }] },
    { value: "0x0000A5", fields: [{ name: "b7", lsb: 7, width: 1 }, { lsb: 0, width: 4 }] },
    { value: "1", fields: [{ name: "bit0", lsb: 0, width: 1 }, { name: "beyond", lsb: 8, width: 8 }] },
  ],
};

const canTiming: ToolDef = {
  name: "mcu.can_bit_timing",
  slug: "can-bit-timing",
  category: "embedded-mcu",
  title: "CAN bit timing",
  description:
    "Find CAN 2.0 prescaler, SEG1 and SEG2 settings (8–25 tq per bit, SYNC + SEG1 + SEG2) for a clock, bitrate and target sample point, best first. Example: 8 MHz clock, 500 kbit/s, 87.5 % → prescaler 1, 16 tq, SEG1 13, SEG2 2, 0 % error.",
  inputSchema: {
    type: "object",
    properties: {
      clockHz: { type: "number", default: 8000000, description: "CAN peripheral clock in Hz." },
      bitrate: { type: "number", default: 500000, description: "Target bitrate in bit/s." },
      samplePointPercent: { type: "number", default: 87.5, description: "Target sample point in %, between 0 and 100 exclusive." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const fclk = positive(input, "clockHz", "clockHz");
    const rate = positive(input, "bitrate", "bitrate");
    const sp = num(input, "samplePointPercent");
    if (!(sp > 0 && sp < 100)) throw new ToolInputError("samplePointPercent must be between 0 and 100.");
    const opts = canBitTiming(fclk, rate, sp / 100);
    if (opts.length === 0) throw new ToolInputError("No valid configuration (8–25 tq/bit) — try a different clock/bitrate combination.");
    return {
      clockHz: fclk, bitrate: rate, samplePointPercent: sp,
      options: opts.map((o) => ({ prescaler: o.prescaler, tqPerBit: o.tqPerBit, seg1: o.seg1, seg2: o.seg2, samplePointPercent: o.samplePoint * 100, actualBitrate: o.actualRate, errorPercent: o.error * 100 })),
    };
  },
  examples: [
    {},
    { clockHz: 16000000, bitrate: 250000 },
    { clockHz: 42000000, bitrate: 1000000, samplePointPercent: 80 },
    { clockHz: 36000000, bitrate: 125000, samplePointPercent: 75 },
    { clockHz: 80000000, bitrate: 500000 },
  ],
};

const I2C_MODES: I2cMode[] = ["standard", "fast", "fast-plus"];

const i2c: ToolDef = {
  name: "mcu.i2c_pullup",
  slug: "i2c-pullup",
  category: "embedded-mcu",
  title: "I2C pull-up resistor",
  description:
    "Compute the valid I2C pull-up range from VDD, bus capacitance and speed mode (UM10204: R_min = (VDD − 0.4 V)/I_OL, R_max = t_r/(0.8473·C_b)) with a suggested E24 value. Example: fast mode (400 kHz), 3.3 V, 150 pF → 967 Ω … 2.36 kΩ, suggested 1.5 kΩ.",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", enum: I2C_MODES, default: "fast", description: "standard = 100 kHz, fast = 400 kHz, fast-plus = 1 MHz." },
      vddV: { type: "number", default: 3.3, description: "Pull-up supply voltage in volts." },
      busCapacitancePf: { type: "number", default: 150, description: "Total bus capacitance in pF." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const vdd = positive(input, "vddV", "vddV");
    const cap = positive(input, "busCapacitancePf", "busCapacitancePf");
    const mode = str(input, "mode") as I2cMode;
    const r = i2cPullup(vdd, cap * 1e-12, mode);
    const mid = r.ok ? Math.sqrt(r.rMin * r.rMax) : null;
    return {
      mode, vddV: vdd, busCapacitancePf: cap,
      riseTimeMaxNs: I2C_TR_MAX[mode] * 1e9, sinkCurrentMa: I2C_IOL[mode] * 1e3,
      rMinOhms: r.rMin, rMaxOhms: r.rMax, ok: r.ok,
      suggestedOhms: mid === null ? null : nearestValue(mid, "E24"),
      ...(r.ok ? {} : { note: "No valid resistor: rise-time limit is below the sink-current limit. Reduce bus capacitance, lower the speed mode, or use a bus accelerator." }),
    };
  },
  examples: [
    {},
    { mode: "standard", vddV: 5, busCapacitancePf: 400 },
    { mode: "fast-plus", vddV: 3.3, busCapacitancePf: 100 },
    { mode: "fast", vddV: 1.8, busCapacitancePf: 50 },
    { mode: "fast", vddV: 5, busCapacitancePf: 400 },
  ],
};

const timer: ToolDef = {
  name: "mcu.timer_prescaler",
  slug: "stm32-timer",
  category: "embedded-mcu",
  title: "STM32 timer PSC/ARR",
  description:
    "Find 16-bit timer prescaler (PSC) and auto-reload (ARR) register values for a target frequency, f = f_clk / ((PSC+1)·(ARR+1)), best matches first. Example: 72 MHz clock, 1000 Hz target → PSC 1, ARR 35999 with 0 % error.",
  inputSchema: {
    type: "object",
    properties: {
      timerClockHz: { type: "number", default: 72000000, description: "Timer input clock in Hz." },
      targetHz: { type: "number", default: 1000, description: "Wanted update frequency in Hz; must not exceed the clock." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const fclk = positive(input, "timerClockHz", "timerClockHz");
    const target = positive(input, "targetHz", "targetHz");
    if (target > fclk) throw new ToolInputError("targetHz must not exceed timerClockHz.");
    const opts = timerSolutions(fclk, target);
    if (opts.length === 0) throw new ToolInputError("No 16-bit PSC/ARR pair reaches this frequency — check the inputs.");
    return {
      timerClockHz: fclk, targetHz: target,
      options: opts.map((o) => ({ psc: o.psc, arr: o.arr, actualHz: o.actual, periodMs: (1 / o.actual) * 1000, errorPercent: o.error * 100 })),
    };
  },
  examples: [
    {},
    { timerClockHz: 84000000, targetHz: 50 },
    { timerClockHz: 16000000, targetHz: 38000 },
    { timerClockHz: 170000000, targetHz: 1 },
    { timerClockHz: 48000000, targetHz: 7 },
  ],
};

const DEFAULT_STRUCT = `uint8_t  flags;
uint32_t count;
uint16_t id;
char     name[8];`;

const structPadding: ToolDef = {
  name: "mcu.struct_padding",
  slug: "struct-padding",
  category: "embedded-mcu",
  title: "C struct padding / layout",
  description:
    "Lay out C struct members with natural (System V-style) alignment on a 32- or 64-bit target, giving each member's offset, size and padding plus sizeof and total padding. Example: \"uint8_t flags; uint32_t count; uint16_t id; char name[8];\" on 32-bit → sizeof 20 with 5 bytes padding.",
  inputSchema: {
    type: "object",
    properties: {
      members: { type: "string", maxLength: 20000, default: DEFAULT_STRUCT, description: "Member declarations, one per line or ';'-separated, e.g. \"uint8_t flags; char name[8]; void *p;\"." },
      arch: { type: "integer", enum: [32, 64], default: 32, description: "Target word size in bits (long and pointers follow it)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const p = parseStructBody(str(input, "members"));
    if (!p.ok) throw new ToolInputError(p.error);
    const l = layoutStruct(p.members, num(input, "arch") as Arch);
    const last = l.rows[l.rows.length - 1]!;
    return {
      arch: num(input, "arch"),
      sizeofBytes: l.size,
      alignBytes: l.align,
      totalPaddingBytes: l.totalPadding,
      paddingPercent: Math.round((l.totalPadding / l.size) * 100),
      tailPaddingBytes: l.size - (last.offset + last.size),
      members: l.rows.map((r) => ({ name: r.name, type: r.type, pointer: r.pointer, count: r.count, offset: r.offset, sizeBytes: r.size, align: r.align, padBefore: r.padBefore })),
    };
  },
  examples: [
    {},
    { arch: 64 },
    { members: "char c; double d; char e;", arch: 64 },
    { members: "uint8_t a; void *p; uint16_t b;", arch: 32 },
    { members: "{\n  int32_t x; // comment\n  uint8_t buf[3];\n}" },
  ],
};

const COMMON_BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

const uart: ToolDef = {
  name: "mcu.uart_baud_error",
  slug: "uart-baud-error",
  category: "embedded-mcu",
  title: "UART baud rate error",
  description:
    "Compute the UART baud divisor round(f_clk/(oversampling·baud)), the actual baud and its error against the ~±2 % rule of thumb, plus a table of common baud rates. Example: 16 MHz clock, 115200 baud, ×16 oversampling → divisor 9, 111111.1 baud, −3.549 % error.",
  inputSchema: {
    type: "object",
    properties: {
      clockHz: { type: "number", default: 16000000, description: "Peripheral clock in Hz." },
      baud: { type: "number", default: 115200, description: "Wanted baud rate." },
      oversampling: { type: "integer", enum: [16, 8], default: 16, description: "Receiver oversampling factor." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const fclk = positive(input, "clockHz", "clockHz");
    const baud = positive(input, "baud", "baud");
    const os = num(input, "oversampling");
    const r = uartBaudError(fclk, baud, os);
    return {
      clockHz: fclk, baud, oversampling: os,
      divisor: r.divisor, actualBaud: r.actualBaud, errorPercent: r.error * 100, withinTolerance: Math.abs(r.error) < 0.02,
      commonBauds: COMMON_BAUDS.map((b) => {
        const x = uartBaudError(fclk, b, os);
        return { baud: b, divisor: x.divisor, actualBaud: x.actualBaud, errorPercent: x.error * 100, withinTolerance: Math.abs(x.error) < 0.02 };
      }),
    };
  },
  examples: [
    {},
    { clockHz: 14745600, baud: 115200 },
    { clockHz: 72000000, baud: 921600, oversampling: 8 },
    { clockHz: 8000000, baud: 9600 },
    { clockHz: 48000000, baud: 1000000, oversampling: 16 },
  ],
};

export const SENSOR_TOOLS: ToolDef[] = [
  adc,
  dbDbm,
  measurementAccuracyTool,
  ntc,
  pt100,
  rmsPeak,
  thermocouple,
  voltageDivider,
  bitFields,
  canTiming,
  i2c,
  timer,
  structPadding,
  uart,
];
