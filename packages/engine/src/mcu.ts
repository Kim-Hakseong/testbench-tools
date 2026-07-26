// MCU peripheral math: CAN bit timing, I2C pull-up bounds, timer divider
// search, UART baud error. Pure TS, no DOM.

// ---------------------------------------------------------------------------
// CAN 2.0 bit timing: one bit = SYNC(1 tq) + SEG1 + SEG2, sampled after SEG1
// ---------------------------------------------------------------------------
export interface CanTimingOption {
  prescaler: number;
  /** Total time quanta per bit (incl. sync). */
  tqPerBit: number;
  seg1: number; // prop + phase1, in tq
  seg2: number; // phase2, in tq
  samplePoint: number; // 0..1
  actualRate: number;
  /** Relative bitrate error (signed). */
  error: number;
}

export function canBitTiming(
  fclk: number,
  targetRate: number,
  targetSamplePoint = 0.875,
  maxPrescaler = 1024,
): CanTimingOption[] {
  const options: CanTimingOption[] = [];
  for (let presc = 1; presc <= maxPrescaler; presc++) {
    const tqPerBit = Math.round(fclk / (presc * targetRate));
    if (tqPerBit < 8) break; // higher prescalers only shrink tq count further
    if (tqPerBit > 25) continue;
    let seg2 = Math.round(tqPerBit * (1 - targetSamplePoint));
    seg2 = Math.min(Math.max(seg2, 1), 8);
    const seg1 = tqPerBit - 1 - seg2;
    if (seg1 < 1 || seg1 > 16) continue;
    const actualRate = fclk / (presc * tqPerBit);
    options.push({
      prescaler: presc,
      tqPerBit,
      seg1,
      seg2,
      samplePoint: (1 + seg1) / tqPerBit,
      actualRate,
      error: (actualRate - targetRate) / targetRate,
    });
  }
  return options
    .sort(
      (a, b) =>
        Math.abs(a.error) - Math.abs(b.error) ||
        Math.abs(a.samplePoint - targetSamplePoint) - Math.abs(b.samplePoint - targetSamplePoint) ||
        b.tqPerBit - a.tqPerBit,
    )
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// I2C pull-up bounds (I2C-bus specification UM10204 formulas)
// ---------------------------------------------------------------------------
export type I2cMode = "standard" | "fast" | "fast-plus";

/** Max rise time (30→70 %) per mode, in seconds — from the I2C specification. */
export const I2C_TR_MAX: Record<I2cMode, number> = {
  standard: 1000e-9,
  fast: 300e-9,
  "fast-plus": 120e-9,
};

/** Spec sink current at VOL 0.4 V: 3 mA (standard/fast), 20 mA (Fast-mode Plus). */
export const I2C_IOL: Record<I2cMode, number> = {
  standard: 3e-3,
  fast: 3e-3,
  "fast-plus": 20e-3,
};

export interface I2cPullupResult {
  /** Below this the driver can't pull SDA to VOL (0.4 V). */
  rMin: number;
  /** Above this the RC rise time exceeds the spec limit. */
  rMax: number;
  ok: boolean;
}

export function i2cPullup(vdd: number, busCapFarads: number, mode: I2cMode): I2cPullupResult {
  const rMin = (vdd - 0.4) / I2C_IOL[mode];
  // tr = 0.8473 · Rp · Cb  (rise 30 % → 70 % of VDD)
  const rMax = I2C_TR_MAX[mode] / (0.8473 * busCapFarads);
  return { rMin, rMax, ok: rMax >= rMin };
}

// ---------------------------------------------------------------------------
// Generic 16-bit timer: f_out = fclk / ((PSC+1) · (ARR+1))
// ---------------------------------------------------------------------------
export interface TimerOption {
  psc: number; // prescaler register value
  arr: number; // auto-reload register value
  actual: number;
  error: number;
}

export function timerSolutions(
  fclk: number,
  targetHz: number,
  maxCount = 65536, // 16-bit registers hold 0..65535 → divider 1..65536
): TimerOption[] {
  const totalDiv = fclk / targetHz;
  const options: TimerOption[] = [];
  const seen = new Set<string>();
  for (let div1 = 1; div1 <= maxCount; div1++) {
    if (div1 * maxCount < totalDiv) continue;
    if (div1 > totalDiv) break;
    const div2 = Math.round(totalDiv / div1);
    for (const d2 of [div2, div2 + 1, div2 - 1]) {
      if (d2 < 1 || d2 > maxCount) continue;
      const key = `${div1}/${d2}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const actual = fclk / (div1 * d2);
      options.push({ psc: div1 - 1, arr: d2 - 1, actual, error: (actual - targetHz) / targetHz });
    }
    if (options.length > 4000) break;
  }
  return options
    .sort((a, b) => Math.abs(a.error) - Math.abs(b.error) || a.psc - b.psc)
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// UART baud divider: divisor = round(fclk / (oversampling · baud))
// ---------------------------------------------------------------------------
export interface UartBaudResult {
  divisor: number;
  actualBaud: number;
  /** Signed error fraction; receivers typically tolerate ~±2 % total. */
  error: number;
}

export function uartBaudError(fclk: number, baud: number, oversampling = 16): UartBaudResult {
  const divisor = Math.max(1, Math.round(fclk / (oversampling * baud)));
  const actualBaud = fclk / (oversampling * divisor);
  return { divisor, actualBaud, error: (actualBaud - baud) / baud };
}
