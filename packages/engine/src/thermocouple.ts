// Thermocouple temperature ↔ voltage on the ITS-90 scale.
//
// Source of every number below: the NIST ITS-90 Thermocouple Database (NIST
// Standard Reference Database 60), file `allcoeff.tab`, which reproduces the
// coefficient tables of NIST Monograph 175 (Burns, Scroger, Strouse, Croarkin
// and Guthrie, April 1993). Provenance, table numbers and the cross-check
// against the Monograph reference tables are recorded in
// `spec/thermocouple-coefficients.md`. Coefficients not listed in that file
// must not be added here.
//
// Two distinct functions per type, and they are not inverses of each other:
//
//   T → V  The *reference function*. Exact by definition — it is what defines
//          the thermocouple type. A piecewise polynomial in °C giving mV, with
//          the emf referenced to a junction at 0 °C. Type K carries an extra
//          Gaussian-shaped term above 0 °C (see K_EXPONENTIAL); omitting it
//          costs up to ~0.12 mV, roughly 3 °C, and the result still looks
//          plausible — which is why it is called out here.
//
//   V → T  An *approximate inverse*. NIST fits a separate polynomial and
//          publishes the residual error band for each subrange. That band is
//          carried on every result rather than being rounded away, because a
//          silently-wrong temperature is worse than a refusal in calibration
//          work.
//
// The inverse covers a narrower span than the reference function for most
// types (type K: −270…1372 °C forward, only −200…1372 °C back). Inputs outside
// the published span are refused instead of extrapolated.

/** The eight letter-designated types of NIST Monograph 175. */
export type ThermocoupleType = "B" | "E" | "J" | "K" | "N" | "R" | "S" | "T";

/** One piece of the T → V reference function. */
export interface TcDirectSubrange {
  /** Inclusive lower bound in °C. */
  minC: number;
  /** Inclusive upper bound in °C. */
  maxC: number;
  /** Coefficients c_0…c_n, ascending powers of t90, giving mV. */
  coefficients: readonly number[];
  /** Type K only: add a0·exp(a1·(t90 − a2)²) to the polynomial. */
  exponential?: { a0: number; a1: number; a2: number };
}

/** One piece of the V → T approximate inverse, selected by voltage. */
export interface TcInverseSubrange {
  /** Inclusive lower bound in mV. */
  minMv: number;
  /** Inclusive upper bound in mV. */
  maxMv: number;
  /** Temperature span this piece is fitted over, in °C. */
  minC: number;
  maxC: number;
  /** Coefficients d_0…d_n, ascending powers of E in mV, giving °C. */
  coefficients: readonly number[];
  /** NIST's published residual band for this piece, in °C (most negative). */
  errorMinC: number;
  /** NIST's published residual band for this piece, in °C (most positive). */
  errorMaxC: number;
}

export interface ThermocoupleInfo {
  id: ThermocoupleType;
  /** Material pairing exactly as Monograph 175 names the type. */
  name: string;
  /** Span of the T → V reference function, in °C. */
  minC: number;
  maxC: number;
  /** Voltage span the V → T inverse is published for, in mV. */
  minMv: number;
  maxMv: number;
  /** Temperature span the V → T inverse is published for, in °C. */
  inverseMinC: number;
  inverseMaxC: number;
  direct: readonly TcDirectSubrange[];
  inverse: readonly TcInverseSubrange[];
  /** Where in Monograph 175 this type's reference function is defined. */
  source: string;
}

// ---------------------------------------------------------------------------
// Coefficients — NIST SRD 60 `allcoeff.tab`.
//
// The literals keep NIST's own 0.xxxE±nn formatting so a reader can diff them
// against the source file line by line. Trailing zero coefficients that NIST
// prints to pad a column are kept for the same reason; Horner ignores them.
// ---------------------------------------------------------------------------

/**
 * Type K above 0 °C only: E += a0·exp(a1·(t90 − a2)²).
 * Monograph 175 table 7.3.1 gives a0/a1 in µV; a0 is stated here in mV to
 * match the rest of the module (1.185976E+02 µV = 0.1185976 mV).
 */
export const K_EXPONENTIAL = {
  a0: 0.118597600000e0,
  a1: -0.118343200000e-3,
  a2: 0.126968600000e3,
} as const;

const TYPE_B: ThermocoupleInfo = {
  id: "B",
  name: "Platinum-30% rhodium alloy vs. platinum-6% rhodium alloy",
  minC: 0,
  maxC: 1820,
  minMv: 0.291,
  maxMv: 13.82,
  inverseMinC: 250,
  inverseMaxC: 1820,
  source: "NIST Monograph 175 §2.3 (table 2.3.1); inverse: appendix A2.1",
  direct: [
    {
      minC: 0,
      maxC: 630.615,
      coefficients: [
        0.0e0, -0.24650818346e-3, 0.59040421171e-5, -0.13257931636e-8, 0.15668291901e-11,
        -0.1694452924e-14, 0.62990347094e-18,
      ],
    },
    {
      minC: 630.615,
      maxC: 1820,
      coefficients: [
        -0.38938168621e1, 0.2857174747e-1, -0.84885104785e-4, 0.15785280164e-6,
        -0.16835344864e-9, 0.11109794013e-12, -0.44515431033e-16, 0.98975640821e-20,
        -0.93791330289e-24,
      ],
    },
  ],
  inverse: [
    {
      minMv: 0.291,
      maxMv: 2.431,
      minC: 250,
      maxC: 700,
      errorMinC: -0.02,
      errorMaxC: 0.03,
      coefficients: [
        9.8423321e1, 6.99715e2, -8.4765304e2, 1.0052644e3, -8.3345952e2, 4.5508542e2,
        -1.5523037e2, 2.988675e1, -2.474286e0,
      ],
    },
    {
      minMv: 2.431,
      maxMv: 13.82,
      minC: 700,
      maxC: 1820,
      errorMinC: -0.01,
      errorMaxC: 0.02,
      coefficients: [
        2.1315071e2, 2.8510504e2, -5.2742887e1, 9.9160804e0, -1.2965303e0, 1.119587e-1,
        -6.0625199e-3, 1.8661696e-4, -2.4878585e-6,
      ],
    },
  ],
};

const TYPE_E: ThermocoupleInfo = {
  id: "E",
  name: "Nickel-chromium alloy vs. copper-nickel alloy",
  minC: -270,
  maxC: 1000,
  minMv: -8.825,
  maxMv: 76.373,
  inverseMinC: -200,
  inverseMaxC: 1000,
  source: "NIST Monograph 175 §5.3 (table 5.3.1); inverse: appendix A5.1",
  direct: [
    {
      minC: -270,
      maxC: 0,
      coefficients: [
        0.0e0, 0.58665508708e-1, 0.4541097712e-4, -0.77998048686e-6, -0.25800160843e-7,
        -0.59452583057e-9, -0.9321405867e-11, -0.10287605534e-12, -0.80370123621e-15,
        -0.43979497391e-17, -0.16414776355e-19, -0.39673619516e-22, -0.55827328721e-25,
        -0.34657842013e-28,
      ],
    },
    {
      minC: 0,
      maxC: 1000,
      coefficients: [
        0.0e0, 0.5866550871e-1, 0.45032275582e-4, 0.28908407212e-7, -0.33056896652e-9,
        0.6502440327e-12, -0.19197495504e-15, -0.12536600497e-17, 0.21489217569e-20,
        -0.14388041782e-23, 0.35960899481e-27,
      ],
    },
  ],
  inverse: [
    {
      minMv: -8.825,
      maxMv: 0,
      minC: -200,
      maxC: 0,
      errorMinC: -0.01,
      errorMaxC: 0.03,
      coefficients: [
        0.0e0, 1.6977288e1, -4.351497e-1, -1.5859697e-1, -9.2502871e-2, -2.6084314e-2,
        -4.1360199e-3, -3.403403e-4, -1.156489e-5, 0.0e0,
      ],
    },
    {
      minMv: 0,
      maxMv: 76.373,
      minC: 0,
      maxC: 1000,
      errorMinC: -0.02,
      errorMaxC: 0.02,
      coefficients: [
        0.0e0, 1.7057035e1, -2.3301759e-1, 6.5435585e-3, -7.3562749e-5, -1.7896001e-6,
        8.4036165e-8, -1.3735879e-9, 1.0629823e-11, -3.2447087e-14,
      ],
    },
  ],
};

const TYPE_J: ThermocoupleInfo = {
  id: "J",
  name: "Iron vs. copper-nickel alloy",
  minC: -210,
  maxC: 1200,
  minMv: -8.095,
  maxMv: 69.553,
  inverseMinC: -210,
  inverseMaxC: 1200,
  source: "NIST Monograph 175 §6.3 (table 6.3.1); inverse: appendix A6.1",
  direct: [
    {
      minC: -210,
      maxC: 760,
      coefficients: [
        0.0e0, 0.50381187815e-1, 0.3047583693e-4, -0.856810657200e-7, 0.13228195295e-9,
        -0.17052958337e-12, 0.20948090697e-15, -0.12538395336e-18, 0.15631725697e-22,
      ],
    },
    {
      minC: 760,
      maxC: 1200,
      coefficients: [
        0.29645625681e3, -0.14976127786e1, 0.31787103924e-2, -0.31847686701e-5,
        0.15720819004e-8, -0.30691369056e-12,
      ],
    },
  ],
  inverse: [
    {
      minMv: -8.095,
      maxMv: 0,
      minC: -210,
      maxC: 0,
      errorMinC: -0.05,
      errorMaxC: 0.03,
      coefficients: [
        0.0e0, 1.9528268e1, -1.2286185e0, -1.0752178e0, -5.9086933e-1, -1.7256713e-1,
        -2.8131513e-2, -2.396337e-3, -8.3823321e-5,
      ],
    },
    {
      minMv: 0,
      maxMv: 42.919,
      minC: 0,
      maxC: 760,
      errorMinC: -0.04,
      errorMaxC: 0.04,
      coefficients: [
        0.0e0, 1.978425e1, -2.001204e-1, 1.036969e-2, -2.549687e-4, 3.585153e-6,
        -5.344285e-8, 5.09989e-10, 0.0e0,
      ],
    },
    {
      minMv: 42.919,
      maxMv: 69.553,
      minC: 760,
      maxC: 1200,
      errorMinC: -0.04,
      errorMaxC: 0.03,
      coefficients: [
        -3.11358187e3, 3.00543684e2, -9.9477323e0, 1.7027663e-1, -1.43033468e-3,
        4.73886084e-6, 0.0e0, 0.0e0, 0.0e0,
      ],
    },
  ],
};

const TYPE_K: ThermocoupleInfo = {
  id: "K",
  name: "Nickel-chromium alloy vs. nickel-aluminum alloy",
  minC: -270,
  maxC: 1372,
  minMv: -5.891,
  maxMv: 54.886,
  inverseMinC: -200,
  inverseMaxC: 1372,
  source: "NIST Monograph 175 §7.3 (table 7.3.1); inverse: appendix A7.1",
  direct: [
    {
      minC: -270,
      maxC: 0,
      coefficients: [
        0.0e0, 0.39450128025e-1, 0.2362237359800e-4, -0.32858906784e-6, -0.49904828777e-8,
        -0.67509059173e-10, -0.57410327428e-12, -0.31088872894e-14, -0.10451609365e-16,
        -0.19889266878e-19, -0.16322697486e-22,
      ],
    },
    {
      // The exponential term applies to this piece only — above 0 °C.
      minC: 0,
      maxC: 1372,
      coefficients: [
        -0.17600413686e-1, 0.38921204975e-1, 0.1855877003200e-4, -0.9945759287400e-7,
        0.3184094571900e-9, -0.5607284488900e-12, 0.5607505905900e-15,
        -0.3202072000300e-18, 0.9715114715200e-22, -0.1210472127500e-25,
      ],
      exponential: K_EXPONENTIAL,
    },
  ],
  inverse: [
    {
      minMv: -5.891,
      maxMv: 0,
      minC: -200,
      maxC: 0,
      errorMinC: -0.02,
      errorMaxC: 0.04,
      coefficients: [
        0.0e0, 2.5173462e1, -1.1662878e0, -1.0833638e0, -8.977354e-1, -3.7342377e-1,
        -8.6632643e-2, -1.0450598e-2, -5.1920577e-4, 0.0e0,
      ],
    },
    {
      minMv: 0,
      maxMv: 20.644,
      minC: 0,
      maxC: 500,
      errorMinC: -0.05,
      errorMaxC: 0.04,
      coefficients: [
        0.0e0, 2.508355e1, 7.860106e-2, -2.503131e-1, 8.31527e-2, -1.228034e-2, 9.804036e-4,
        -4.41303e-5, 1.057734e-6, -1.052755e-8,
      ],
    },
    {
      minMv: 20.644,
      maxMv: 54.886,
      minC: 500,
      maxC: 1372,
      errorMinC: -0.05,
      errorMaxC: 0.06,
      coefficients: [
        -1.318058e2, 4.830222e1, -1.646031e0, 5.464731e-2, -9.650715e-4, 8.802193e-6,
        -3.11081e-8, 0.0e0, 0.0e0, 0.0e0,
      ],
    },
  ],
};

const TYPE_N: ThermocoupleInfo = {
  id: "N",
  name: "Nickel-chromium-silicon alloy vs. nickel-silicon-magnesium alloy",
  minC: -270,
  maxC: 1300,
  minMv: -3.99,
  maxMv: 47.513,
  inverseMinC: -200,
  inverseMaxC: 1300,
  source: "NIST Monograph 175 §8.3 (table 8.3.1); inverse: appendix A8.1",
  direct: [
    {
      minC: -270,
      maxC: 0,
      coefficients: [
        0.0e0, 0.2615910596200e-1, 0.1095748422800e-4, -0.9384111155400e-7,
        -0.4641203975900e-10, -0.2630335771600e-11, -0.2265343800300e-13,
        -0.7608930079100e-16, -0.9341966783500e-19,
      ],
    },
    {
      minC: 0,
      maxC: 1300,
      coefficients: [
        0.0e0, 0.2592939460100e-1, 0.157101418800e-4, 0.4382562723700e-7,
        -0.2526116979400e-9, 0.6431181933900e-12, -0.1006347151900e-14,
        0.9974533899200e-18, -0.6086324560700e-21, 0.2084922933900e-24,
        -0.3068219615100e-28,
      ],
    },
  ],
  inverse: [
    {
      minMv: -3.99,
      maxMv: 0,
      minC: -200,
      maxC: 0,
      errorMinC: -0.02,
      errorMaxC: 0.03,
      coefficients: [
        0.0e0, 3.8436847e1, 1.1010485e0, 5.2229312e0, 7.2060525e0, 5.8488586e0, 2.7754916e0,
        7.7075166e-1, 1.1582665e-1, 7.3138868e-3,
      ],
    },
    {
      minMv: 0,
      maxMv: 20.613,
      minC: 0,
      maxC: 600,
      errorMinC: -0.02,
      errorMaxC: 0.03,
      coefficients: [
        0.0e0, 3.86896e1, -1.08267e0, 4.70205e-2, -2.12169e-6, -1.17272e-4, 5.3928e-6,
        -7.98156e-8, 0.0e0, 0.0e0,
      ],
    },
    {
      minMv: 20.613,
      maxMv: 47.513,
      minC: 600,
      maxC: 1300,
      errorMinC: -0.04,
      errorMaxC: 0.02,
      coefficients: [
        1.972485e1, 3.300943e1, -3.915159e-1, 9.855391e-3, -1.274371e-4, 7.767022e-7, 0.0e0,
        0.0e0, 0.0e0, 0.0e0,
      ],
    },
  ],
};

const TYPE_R: ThermocoupleInfo = {
  id: "R",
  name: "Platinum-13% rhodium alloy vs. platinum",
  minC: -50,
  maxC: 1768.1,
  minMv: -0.226,
  maxMv: 21.103,
  inverseMinC: -50,
  inverseMaxC: 1768.1,
  source: "NIST Monograph 175 §3.3 (table 3.3.1); inverse: appendix A3.1",
  direct: [
    {
      minC: -50,
      maxC: 1064.18,
      coefficients: [
        0.0e0, 0.528961729765e-2, 0.139166589782e-4, -0.238855693017e-7, 0.356916001063e-10,
        -0.462347666298e-13, 0.500777441034e-16, -0.373105886191e-19, 0.157716482367e-22,
        -0.281038625251e-26,
      ],
    },
    {
      minC: 1064.18,
      maxC: 1664.5,
      coefficients: [
        0.295157925316e1, -0.252061251332e-2, 0.159564501865e-4, -0.764085947576e-8,
        0.205305291024e-11, -0.293359668173e-15,
      ],
    },
    {
      minC: 1664.5,
      maxC: 1768.1,
      coefficients: [
        0.152232118209e3, -0.268819888545e0, 0.171280280471e-3, -0.345895706453e-7,
        -0.934633971046e-14,
      ],
    },
  ],
  inverse: [
    {
      minMv: -0.226,
      maxMv: 1.923,
      minC: -50,
      maxC: 250,
      errorMinC: -0.02,
      errorMaxC: 0.02,
      coefficients: [
        0.0e0, 1.889138e2, -9.383529e1, 1.3068619e2, -2.270358e2, 3.5145659e2, -3.89539e2,
        2.8239471e2, -1.2607281e2, 3.1353611e1, -3.3187769e0,
      ],
    },
    {
      minMv: 1.923,
      maxMv: 13.228,
      minC: 250,
      maxC: 1200,
      errorMinC: -0.005,
      errorMaxC: 0.005,
      coefficients: [
        1.334584505e1, 1.472644573e2, -1.844024844e1, 4.031129726e0, -6.24942836e-1,
        6.468412046e-2, -4.458750426e-3, 1.994710149e-4, -5.31340179e-6, 6.481976217e-8,
        0.0e0,
      ],
    },
    {
      minMv: 11.361,
      maxMv: 19.739,
      minC: 1064,
      maxC: 1664.5,
      errorMinC: -0.0005,
      errorMaxC: 0.001,
      coefficients: [
        -8.199599416e1, 1.553962042e2, -8.342197663e0, 4.279433549e-1, -1.19157791e-2,
        1.492290091e-4, 0.0e0, 0.0e0, 0.0e0, 0.0e0, 0.0e0,
      ],
    },
    {
      minMv: 19.739,
      maxMv: 21.103,
      minC: 1664.5,
      maxC: 1768.1,
      errorMinC: -0.001,
      errorMaxC: 0.002,
      coefficients: [
        3.406177836e4, -7.023729171e3, 5.582903813e2, -1.952394635e1, 2.560740231e-1, 0.0e0,
        0.0e0, 0.0e0, 0.0e0, 0.0e0, 0.0e0,
      ],
    },
  ],
};

const TYPE_S: ThermocoupleInfo = {
  id: "S",
  name: "Platinum-10% rhodium alloy vs. platinum",
  minC: -50,
  maxC: 1768.1,
  minMv: -0.235,
  maxMv: 18.693,
  inverseMinC: -50,
  inverseMaxC: 1768.1,
  source: "NIST Monograph 175 §4.3 (table 4.3.1); inverse: appendix A4.1",
  direct: [
    {
      minC: -50,
      maxC: 1064.18,
      coefficients: [
        0.0e0, 0.540313308631e-2, 0.12593428974e-4, -0.232477968689e-7, 0.322028823036e-10,
        -0.331465196389e-13, 0.255744251786e-16, -0.125068871393e-19, 0.271443176145e-23,
      ],
    },
    {
      minC: 1064.18,
      maxC: 1664.5,
      coefficients: [
        0.132900444085e1, 0.334509311344e-2, 0.654805192818e-5, -0.164856259209e-8,
        0.129989605174e-13,
      ],
    },
    {
      minC: 1664.5,
      maxC: 1768.1,
      coefficients: [
        0.146628232636e3, -0.258430516752e0, 0.163693574641e-3, -0.330439046987e-7,
        -0.943223690612e-14,
      ],
    },
  ],
  inverse: [
    {
      minMv: -0.235,
      maxMv: 1.874,
      minC: -50,
      maxC: 250,
      errorMinC: -0.02,
      errorMaxC: 0.02,
      coefficients: [
        0.0e0, 1.8494946e2, -8.00504062e1, 1.0223743e2, -1.52248592e2, 1.88821343e2,
        -1.59085941e2, 8.2302788e1, -2.34181944e1, 2.7978626e0,
      ],
    },
    {
      minMv: 1.874,
      maxMv: 11.95,
      minC: 250,
      maxC: 1200,
      errorMinC: -0.01,
      errorMaxC: 0.01,
      coefficients: [
        1.291507177e1, 1.466298863e2, -1.534713402e1, 3.145945973e0, -4.163257839e-1,
        3.187963771e-2, -1.2916375e-3, 2.183475087e-5, -1.447379511e-7, 8.211272125e-9,
      ],
    },
    {
      minMv: 10.332,
      maxMv: 17.536,
      minC: 1064,
      maxC: 1664.5,
      errorMinC: -0.0002,
      errorMaxC: 0.0002,
      coefficients: [
        -8.087801117e1, 1.621573104e2, -8.536869453e0, 4.719686976e-1, -1.441693666e-2,
        2.08161889e-4, 0.0e0, 0.0e0, 0.0e0, 0.0e0,
      ],
    },
    {
      minMv: 17.536,
      maxMv: 18.693,
      minC: 1664.5,
      maxC: 1768.1,
      errorMinC: -0.002,
      errorMaxC: 0.002,
      coefficients: [
        5.333875126e4, -1.235892298e4, 1.092657613e3, -4.265693686e1, 6.24720542e-1, 0.0e0,
        0.0e0, 0.0e0, 0.0e0, 0.0e0,
      ],
    },
  ],
};

const TYPE_T: ThermocoupleInfo = {
  id: "T",
  name: "Copper vs. copper-nickel alloy",
  minC: -270,
  maxC: 400,
  minMv: -5.603,
  maxMv: 20.872,
  inverseMinC: -200,
  inverseMaxC: 400,
  source: "NIST Monograph 175 §9.3 (table 9.3.1); inverse: appendix A9.1",
  direct: [
    {
      minC: -270,
      maxC: 0,
      coefficients: [
        0.0e0, 0.38748106364e-1, 0.441944343470e-4, 0.118443231050e-6, 0.200329735540e-7,
        0.901380195590e-9, 0.226511565930e-10, 0.360711542050e-12, 0.384939398830e-14,
        0.282135219250e-16, 0.142515947790e-18, 0.487686622860e-21, 0.107955392700e-23,
        0.139450270620e-26, 0.797951539270e-30,
      ],
    },
    {
      minC: 0,
      maxC: 400,
      coefficients: [
        0.0e0, 0.38748106364e-1, 0.3329222788e-4, 0.20618243404e-6, -0.21882256846e-8,
        0.10996880928e-10, -0.30815758772e-13, 0.4547913529e-16, -0.27512901673e-19,
      ],
    },
  ],
  inverse: [
    {
      minMv: -5.603,
      maxMv: 0,
      minC: -200,
      maxC: 0,
      errorMinC: -0.02,
      errorMaxC: 0.04,
      coefficients: [
        0.0e0, 2.5949192e1, -2.1316967e-1, 7.9018692e-1, 4.2527777e-1, 1.3304473e-1,
        2.0241446e-2, 1.2668171e-3,
      ],
    },
    {
      minMv: 0,
      maxMv: 20.872,
      minC: 0,
      maxC: 400,
      errorMinC: -0.03,
      errorMaxC: 0.03,
      coefficients: [
        0.0e0, 2.5928e1, -7.602961e-1, 4.637791e-2, -2.165394e-3, 6.048144e-5, -7.293422e-7,
        0.0e0,
      ],
    },
  ],
};

/** Every implemented type, in the order Monograph 175 presents them. */
export const THERMOCOUPLE_TYPES: readonly ThermocoupleInfo[] = [
  TYPE_B,
  TYPE_R,
  TYPE_S,
  TYPE_E,
  TYPE_J,
  TYPE_K,
  TYPE_N,
  TYPE_T,
];

const BY_ID: Record<ThermocoupleType, ThermocoupleInfo> = {
  B: TYPE_B,
  E: TYPE_E,
  J: TYPE_J,
  K: TYPE_K,
  N: TYPE_N,
  R: TYPE_R,
  S: TYPE_S,
  T: TYPE_T,
};

/** Type ids in the order most engineers scan for them (base metal first). */
export const THERMOCOUPLE_TYPE_IDS: readonly ThermocoupleType[] = [
  "K",
  "J",
  "T",
  "E",
  "N",
  "R",
  "S",
  "B",
];

/** Metadata for a type, or null if the id is not one of the eight. */
export function thermocoupleInfo(type: string): ThermocoupleInfo | null {
  return BY_ID[type as ThermocoupleType] ?? null;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** Horner evaluation of c_0 + c_1·x + … + c_n·x^n. */
function polynomial(coefficients: readonly number[], x: number): number {
  let acc = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) acc = acc * x + coefficients[i]!;
  return acc;
}

export type TcVoltageResult =
  | { ok: true; millivolts: number; subrange: TcDirectSubrange }
  | { ok: false; error: string };

/**
 * Voltage windows used to pick an inverse subrange.
 *
 * NIST prints each subrange's voltage bounds rounded to 0.001 mV. At the outer
 * edge of a type that rounding can land a fraction of a microvolt inside the
 * reference function's own value at the same temperature — type K at its rated
 * 1372 °C produces 54.8864 mV against a printed ceiling of 54.886, and a
 * strict reading of the printed bound would refuse a thermocouple at its
 * limit. The printed bounds stay on the subrange for display; selection uses
 * the exact endpoint voltage where it is the wider of the two. That recovers
 * NIST's own rounding, it does not reach past the fitted temperature span.
 */
const SELECTION_WINDOWS = new Map<ThermocoupleType, { lo: number; hi: number }[]>();

function selectionWindows(info: ThermocoupleInfo): { lo: number; hi: number }[] {
  const cached = SELECTION_WINDOWS.get(info.id);
  if (cached) return cached;
  const windows = info.inverse.map((sub) => {
    let { minMv: lo, maxMv: hi } = sub;
    if (sub.minC === info.inverseMinC) lo = Math.min(lo, exactMv(info, sub.minC));
    if (sub.maxC === info.inverseMaxC) hi = Math.max(hi, exactMv(info, sub.maxC));
    return { lo, hi };
  });
  SELECTION_WINDOWS.set(info.id, windows);
  return windows;
}

function exactMv(info: ThermocoupleInfo, celsius: number): number {
  const r = tcVoltage(info.id, celsius);
  return r.ok ? r.millivolts : Number.NaN;
}

export type TcTemperatureResult =
  | {
      ok: true;
      celsius: number;
      subrange: TcInverseSubrange;
      /** NIST's residual band for the subrange used, in °C. */
      errorMinC: number;
      errorMaxC: number;
    }
  | { ok: false; error: string };

export type TcColdJunctionResult =
  | {
      ok: true;
      /** Hot-junction temperature in °C. */
      celsius: number;
      /** Emf the cold junction contributes, in mV. */
      coldJunctionMv: number;
      /** Voltage the inverse was evaluated at, in mV. */
      totalMv: number;
      subrange: TcInverseSubrange;
      errorMinC: number;
      errorMaxC: number;
    }
  | { ok: false; error: string };

/**
 * Thermoelectric voltage in mV for a temperature in °C, cold junction at 0 °C.
 * Exact — this is the ITS-90 reference function, not a fit.
 */
export function tcVoltage(type: string, celsius: number): TcVoltageResult {
  const info = thermocoupleInfo(type);
  if (!info) return { ok: false, error: `Unknown thermocouple type "${type}"` };
  if (!Number.isFinite(celsius)) return { ok: false, error: "Enter a temperature in °C" };
  if (celsius < info.minC || celsius > info.maxC) {
    return {
      ok: false,
      error: `Type ${info.id} is defined from ${info.minC} °C to ${info.maxC} °C — ${celsius} °C is outside it`,
    };
  }
  // Boundaries belong to the lower subrange, matching how NIST lists them.
  const subrange = info.direct.find((r) => celsius >= r.minC && celsius <= r.maxC)!;
  let mv = polynomial(subrange.coefficients, celsius);
  if (subrange.exponential) {
    const { a0, a1, a2 } = subrange.exponential;
    mv += a0 * Math.exp(a1 * (celsius - a2) * (celsius - a2));
  }
  return { ok: true, millivolts: mv, subrange };
}

/**
 * Temperature in °C for a voltage in mV, cold junction at 0 °C.
 *
 * Approximate: the returned temperature is only as good as NIST's inverse fit,
 * so `errorMinC`/`errorMaxC` come back with it. Do not treat the value as an
 * exact inverse of `tcVoltage` — round-tripping drifts by up to the band.
 */
export function tcTemperature(type: string, millivolts: number): TcTemperatureResult {
  const info = thermocoupleInfo(type);
  if (!info) return { ok: false, error: `Unknown thermocouple type "${type}"` };
  if (!Number.isFinite(millivolts)) return { ok: false, error: "Enter a voltage in mV" };
  // Types R and S have overlapping inverse subranges around 1064 °C; NIST's
  // listed order decides, so the first match wins.
  const windows = selectionWindows(info);
  const index = windows.findIndex((w) => millivolts >= w.lo && millivolts <= w.hi);
  const subrange = index < 0 ? undefined : info.inverse[index]!;
  if (!subrange) {
    return {
      ok: false,
      error: `Type ${info.id} inverse functions cover ${info.minMv} mV to ${info.maxMv} mV (${info.inverseMinC} °C to ${info.inverseMaxC} °C) — ${millivolts} mV is outside them`,
    };
  }
  return {
    ok: true,
    celsius: polynomial(subrange.coefficients, millivolts),
    subrange,
    errorMinC: subrange.errorMinC,
    errorMaxC: subrange.errorMaxC,
  };
}

/**
 * Hot-junction temperature from a voltage measured against a cold junction
 * that is *not* at 0 °C — the normal case with a real instrument.
 *
 * A thermocouple only ever produces the difference between its junctions, so
 * the emf the cold junction would have produced against 0 °C is added back
 * before inverting:  V_total = V_measured + V(T_cold).
 *
 * Adding temperatures instead of voltages is the classic error, and it stays
 * within a degree or so near room temperature — which is exactly why it
 * survives review and then shows up as a calibration offset at 600 °C.
 */
export function tcWithColdJunction(
  type: string,
  measuredMv: number,
  coldJunctionC: number,
): TcColdJunctionResult {
  const info = thermocoupleInfo(type);
  if (!info) return { ok: false, error: `Unknown thermocouple type "${type}"` };
  if (!Number.isFinite(measuredMv)) return { ok: false, error: "Enter a measured voltage in mV" };

  const cold = tcVoltage(type, coldJunctionC);
  if (!cold.ok) {
    return { ok: false, error: `Cold junction: ${cold.error}` };
  }
  const totalMv = measuredMv + cold.millivolts;
  const hot = tcTemperature(type, totalMv);
  if (!hot.ok) {
    return { ok: false, error: `Compensated voltage ${totalMv.toFixed(3)} mV: ${hot.error}` };
  }
  return {
    ok: true,
    celsius: hot.celsius,
    coldJunctionMv: cold.millivolts,
    totalMv,
    subrange: hot.subrange,
    errorMinC: hot.errorMinC,
    errorMaxC: hot.errorMaxC,
  };
}
