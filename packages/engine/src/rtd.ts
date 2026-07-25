// Platinum RTD (PT100 / PT1000) per IEC 60751 Callendar-Van Dusen, T ≥ 0 °C:
//   R(T) = R0 · (1 + A·T + B·T²)
// The T < 0 branch (C-term quartic) is P1 and NOT implemented — callers must
// surface the supported range (DESIGN §2).

export const CVD_A = 3.9083e-3;
export const CVD_B = -5.775e-7;

/** Resistance in Ω at tempC (≥ 0). Returns null outside the supported range. */
export function rtdResistance(tempC: number, r0 = 100): number | null {
  if (!Number.isFinite(tempC) || tempC < 0 || tempC > 850) return null;
  return r0 * (1 + CVD_A * tempC + CVD_B * tempC * tempC);
}

/**
 * Temperature in °C from resistance (inverse via quadratic formula).
 * Valid for R ≥ R0 (T ≥ 0). Returns null outside the supported range.
 */
export function rtdTemperature(r: number, r0 = 100): number | null {
  if (!Number.isFinite(r) || r < r0) return null;
  const disc = CVD_A * CVD_A - 4 * CVD_B * (1 - r / r0);
  if (disc < 0) return null;
  const t = (-CVD_A + Math.sqrt(disc)) / (2 * CVD_B);
  return t < 0 || t > 850 ? null : t;
}
