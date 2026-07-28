// Catalog source of truth for the hub grid and (later) tool pages.
// Scope is fixed by PRD §3 — do not add tools outside this list.

export type Locale = "en" | "ko" | "both";
export type ToolStatus = "live" | "soon";

export interface ToolMeta {
  slug: string;
  name: string;
  description: string;
  /** Korean page title/description — present for locale "both" (ko-only tools use name/description directly). */
  koName?: string;
  koDescription?: string;
  category: CategoryId;
  p0: boolean;
  locale: Locale;
  status: ToolStatus;
  tags: string[];
  /** Secondary URL of another tool (e.g. ascii-to-hex): has a page but no hub card. */
  hubHidden?: boolean;
}

export type CategoryId =
  | "checksum-crc"
  | "protocol-decoders"
  | "data-converters"
  | "plc-industrial"
  | "sensor-signal"
  | "embedded-mcu"
  | "avionics-databus"
  | "file-tools";

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  koName: string;
}

// Order = PRD §3 order, with the avionics bus tools raised to sit next to the
// other protocol work rather than trailing the list.
export const CATEGORIES: CategoryMeta[] = [
  { id: "checksum-crc", name: "Checksum & CRC", koName: "체크섬 & CRC" },
  { id: "protocol-decoders", name: "Protocol Decoders", koName: "프로토콜 디코더" },
  { id: "avionics-databus", name: "Avionics & Data Bus", koName: "항공전자 & 데이터 버스" },
  { id: "data-converters", name: "Data Converters", koName: "데이터 변환" },
  { id: "plc-industrial", name: "PLC & Industrial", koName: "PLC & 산업" },
  { id: "sensor-signal", name: "Sensor & Signal", koName: "센서 & 신호" },
  { id: "embedded-mcu", name: "Embedded & MCU", koName: "임베디드 & MCU" },
  { id: "file-tools", name: "File Tools", koName: "파일 툴" },
];

export const TOOLS: ToolMeta[] = [
  // 1) Checksum & CRC
  { slug: "crc-16-modbus", name: "CRC-16 Modbus Calculator", description: "Compute CRC-16/MODBUS over hex or ASCII input, with LE/BE byte order.", category: "checksum-crc", p0: true, locale: "en", status: "live", tags: ["crc", "modbus", "checksum", "rtu"] },
  { slug: "crc-32", name: "CRC-32 Calculator", description: "Standard CRC-32 (ISO-HDLC) checksum for hex bytes or text.", category: "checksum-crc", p0: true, locale: "en", status: "live", tags: ["crc", "crc32", "checksum"] },
  { slug: "crc-16-ccitt", name: "CRC-16 CCITT Calculator", description: "CRC-16/CCITT-FALSE and related variants, selectable parameters.", category: "checksum-crc", p0: true, locale: "en", status: "live", tags: ["crc", "ccitt", "xmodem", "checksum"] },
  { slug: "crc-8", name: "CRC-8 Calculator", description: "CRC-8 with selectable polynomial and init variants.", category: "checksum-crc", p0: false, locale: "en", status: "live", tags: ["crc", "crc8", "checksum"] },
  { slug: "custom-crc", name: "Custom CRC Calculator", description: "Fully parameterized CRC: width, poly, init, reflect, xorout.", category: "checksum-crc", p0: true, locale: "en", status: "live", tags: ["crc", "custom", "polynomial"] },
  { slug: "crc-identifier", name: "CRC Identifier", description: "Reverse-search which CRC algorithm produced your checksum.", category: "checksum-crc", p0: true, locale: "en", status: "live", tags: ["crc", "identify", "reverse", "unknown"] },
  { slug: "nmea-checksum", name: "NMEA Checksum Calculator", description: "XOR checksum for NMEA 0183 sentences, validate or generate.", category: "checksum-crc", p0: false, locale: "en", status: "live", tags: ["nmea", "gps", "checksum", "xor"] },

  // 2) Protocol Decoders
  { slug: "modbus-frame-decoder", name: "Modbus Frame Decoder", description: "Decode Modbus RTU/TCP frames: unit, function, registers, CRC check.", category: "protocol-decoders", p0: true, locale: "en", status: "live", tags: ["modbus", "rtu", "tcp", "decoder", "frame"] },
  { slug: "nmea-0183-decoder", name: "NMEA 0183 Decoder", description: "Parse NMEA 0183 sentences into labeled fields with checksum check.", category: "protocol-decoders", p0: false, locale: "en", status: "live", tags: ["nmea", "gps", "decoder"] },
  { slug: "can-frame-decoder", name: "CAN Frame Decoder", description: "Break down CAN 2.0 frames: ID, DLC, data bytes, flags.", category: "protocol-decoders", p0: false, locale: "en", status: "live", tags: ["can", "canbus", "decoder", "frame"] },
  { slug: "mc-protocol-decoder", name: "Mitsubishi MC Protocol Decoder", description: "Decode Mitsubishi MC protocol frames into command and device fields.", category: "protocol-decoders", p0: false, locale: "en", status: "soon", tags: ["mitsubishi", "mc", "plc", "decoder"] },

  // 3) Data Converters
  { slug: "ieee-754-float", name: "IEEE 754 Float Converter", description: "Float ↔ hex/registers with Modbus word orders ABCD/CDAB/BADC/DCBA.", category: "data-converters", p0: true, locale: "en", status: "live", tags: ["float", "ieee754", "modbus", "register", "word order"] },
  { slug: "hex-to-ascii", name: "Hex to ASCII Converter", description: "Convert hex byte strings to readable ASCII text.", category: "data-converters", p0: true, locale: "en", status: "live", tags: ["hex", "ascii", "text", "bytes"] },
  { slug: "ascii-to-hex", name: "ASCII to Hex Converter", description: "Convert ASCII text to hex byte strings.", category: "data-converters", p0: true, locale: "en", status: "live", tags: ["ascii", "hex", "text", "bytes"], hubHidden: true },
  { slug: "number-base-converter", name: "Number Base Converter", description: "Convert between binary, octal, decimal and hexadecimal.", category: "data-converters", p0: true, locale: "en", status: "live", tags: ["binary", "hex", "decimal", "base"] },
  { slug: "twos-complement", name: "Two's Complement Converter", description: "Signed integer ↔ raw hex at 8/16/32-bit widths.", category: "data-converters", p0: false, locale: "en", status: "live", tags: ["twos complement", "signed", "hex"] },
  { slug: "endianness-converter", name: "Endianness Converter", description: "Swap byte order of hex values: 16/32/64-bit, word swap.", category: "data-converters", p0: false, locale: "en", status: "live", tags: ["endian", "byte order", "swap", "hex"] },
  { slug: "q-format", name: "Fixed-Point Q-Format Converter", description: "Convert real numbers ↔ fixed-point Qm.n representation.", category: "data-converters", p0: false, locale: "en", status: "live", tags: ["fixed point", "q format", "dsp"] },

  // 4) PLC & Industrial
  { slug: "plc-analog-scaling", name: "PLC Analog Scaling Calculator", koName: "PLC 아날로그 스케일링 계산기", koDescription: "Raw 카운트 ↔ 공학 단위 변환. 검증된 벤더 프리셋(S7) 지원.", description: "Raw counts ↔ engineering units with verified vendor presets.", category: "plc-industrial", p0: true, locale: "both", status: "live", tags: ["plc", "analog", "scaling", "raw", "s7"] },
  { slug: "4-20ma-scaling", name: "4-20mA Scaling Calculator", koName: "4-20mA 스케일링 계산기", koDescription: "전류 루프 ↔ 공정값 변환. 단선(open loop)·범위 이탈 판정 포함.", description: "Current loop ↔ process value with open-loop and range warnings.", category: "plc-industrial", p0: true, locale: "both", status: "live", tags: ["4-20ma", "current loop", "scaling", "plc"] },
  { slug: "two-point-calibration", name: "2-Point Calibration Calculator", description: "Derive slope and offset from two measured reference points.", category: "plc-industrial", p0: false, locale: "en", status: "live", tags: ["calibration", "slope", "offset"] },
  { slug: "signal-converter", name: "Signal Converter", description: "Convert between mA, V and psi process signal ranges.", category: "plc-industrial", p0: false, locale: "en", status: "live", tags: ["ma", "voltage", "psi", "signal"] },
  { slug: "bcd-converter", name: "BCD Converter", koName: "BCD 변환기", koDescription: "BCD ↔ 10진수 변환. 니블 단위 검증과 오류 위치 표시.", description: "BCD ↔ decimal with per-nibble validation and error position.", category: "plc-industrial", p0: true, locale: "both", status: "live", tags: ["bcd", "plc", "decimal", "nibble"] },
  { slug: "loop-burden", name: "Loop Burden Calculator", description: "Check 4-20mA loop voltage budget against device burdens.", category: "plc-industrial", p0: false, locale: "en", status: "live", tags: ["loop", "burden", "4-20ma", "voltage"] },
  { slug: "modbus-address-converter", name: "Modbus Address Converter", description: "Translate 0-based, 1-based and 4xxxx Modbus register notations.", category: "plc-industrial", p0: false, locale: "en", status: "live", tags: ["modbus", "address", "register", "40001"] },
  { slug: "s7-address-converter", name: "Siemens S7 Address Converter", description: "Decode %MW/%M/DB addresses, the bytes they cover, and overlaps.", category: "plc-industrial", p0: false, locale: "en", status: "live", tags: ["s7", "siemens", "plc", "address", "db", "overlap"] },
  { slug: "mitsubishi-address-converter", name: "Mitsubishi MELSEC Address Converter", description: "MELSEC device numbers with the right radix — octal X/Y on FX5, hex on iQ-R.", category: "plc-industrial", p0: false, locale: "en", status: "live", tags: ["mitsubishi", "melsec", "plc", "address", "octal", "fx5", "iq-r"] },
  { slug: "xgt-cnet-decoder", name: "LS XGT Cnet 프레임 디코더", description: "LS XGT Cnet 프레임을 필드 단위로 해석하고 BCC를 검증합니다.", category: "plc-industrial", p0: true, locale: "ko", status: "soon", tags: ["xgt", "cnet", "ls", "plc", "decoder"] },
  { slug: "xgt-cnet-builder", name: "LS XGT Cnet 프레임 빌더", description: "국번·명령·디바이스를 입력해 XGT Cnet 프레임을 생성합니다.", category: "plc-industrial", p0: true, locale: "ko", status: "soon", tags: ["xgt", "cnet", "ls", "plc", "builder"] },

  // 5) Sensor & Signal
  { slug: "pt100-calculator", name: "PT100 / PT1000 Calculator", koName: "PT100 / PT1000 계산기", koDescription: "IEC 60751(Callendar-Van Dusen) 기준 저항 ↔ 온도 변환.", description: "RTD resistance ↔ temperature per IEC 60751 (Callendar-Van Dusen).", category: "sensor-signal", p0: true, locale: "both", status: "live", tags: ["pt100", "pt1000", "rtd", "temperature", "resistance"] },
  { slug: "thermocouple-calculator", name: "Thermocouple Calculator", description: "Voltage ↔ temperature for K/J/T/E thermocouple types.", category: "sensor-signal", p0: false, locale: "en", status: "soon", tags: ["thermocouple", "type k", "temperature", "mv"] },
  { slug: "adc-calculator", name: "ADC Calculator", koName: "ADC 계산기", koDescription: "N비트 ADC 카운트 ↔ 전압 변환, LSB 크기 계산.", description: "Counts ↔ voltage for N-bit ADCs, with LSB size.", category: "sensor-signal", p0: true, locale: "both", status: "live", tags: ["adc", "counts", "voltage", "resolution", "lsb"] },
  { slug: "voltage-divider", name: "Voltage Divider Calculator", description: "Solve divider ratios with nearest E24/E96 resistor values.", category: "sensor-signal", p0: false, locale: "en", status: "live", tags: ["voltage divider", "resistor", "e24", "e96"] },
  { slug: "rms-peak", name: "RMS ↔ Peak Converter", description: "Convert RMS, peak and peak-to-peak for sine waveforms.", category: "sensor-signal", p0: false, locale: "en", status: "live", tags: ["rms", "peak", "sine", "amplitude"] },
  { slug: "db-dbm", name: "dB · dBm Calculator", description: "Convert power ratios, dB, dBm and voltage levels.", category: "sensor-signal", p0: false, locale: "en", status: "live", tags: ["db", "dbm", "power", "ratio"] },

  // 6) Embedded & MCU
  { slug: "can-bit-timing", name: "CAN Bit Timing Calculator", description: "Derive prescaler and segment values for a target CAN bitrate.", category: "embedded-mcu", p0: false, locale: "en", status: "live", tags: ["can", "bit timing", "prescaler", "sample point"] },
  { slug: "i2c-pullup", name: "I2C Pull-up Calculator", description: "Pull-up resistor bounds from bus capacitance and speed mode.", category: "embedded-mcu", p0: false, locale: "en", status: "live", tags: ["i2c", "pullup", "resistor", "bus"] },
  { slug: "stm32-timer", name: "STM32 Timer Calculator", description: "Prescaler/period combinations for a target timer frequency.", category: "embedded-mcu", p0: false, locale: "en", status: "live", tags: ["stm32", "timer", "prescaler", "pwm"] },
  { slug: "uart-baud-error", name: "UART Baud Rate Error Calculator", description: "Actual baud and error % from clock and divider settings.", category: "embedded-mcu", p0: false, locale: "en", status: "live", tags: ["uart", "baud", "error", "clock"] },
  { slug: "struct-padding", name: "Struct Padding Visualizer", description: "Visualize C struct member offsets, padding and total size.", category: "embedded-mcu", p0: false, locale: "en", status: "live", tags: ["struct", "padding", "alignment", "c"] },
  { slug: "bit-field-extractor", name: "Bit Field Extractor", description: "Extract and label bit fields from register values.", category: "embedded-mcu", p0: false, locale: "en", status: "live", tags: ["bit field", "register", "mask", "shift"] },

  // 7) Avionics & Data Bus (MIL-STD-1553B — public standard)
  { slug: "mil-1553-command-word", name: "MIL-STD-1553B Command Word Decoder", description: "Decode and build 1553B command words: RT address, T/R, subaddress, word count, mode codes.", category: "avionics-databus", p0: false, locale: "en", status: "live", tags: ["1553", "milstd1553", "avionics", "command word", "military bus"] },
  { slug: "mil-1553-status-word", name: "MIL-STD-1553B Status Word Decoder", description: "Decode 1553B status words: RT address and every status flag bit.", category: "avionics-databus", p0: false, locale: "en", status: "live", tags: ["1553", "milstd1553", "avionics", "status word", "military bus"] },
  { slug: "mil-1553-mode-codes", name: "MIL-STD-1553B Mode Code Reference", description: "Look up 1553B mode codes by T/R bit and code, with data-word rules.", category: "avionics-databus", p0: false, locale: "en", status: "live", tags: ["1553", "milstd1553", "avionics", "mode code", "reference"] },
  { slug: "mil-1553-message-decoder", name: "MIL-STD-1553B Message Decoder", description: "Lay out a full 1553B transaction: command, data words and status, with parity checks.", category: "avionics-databus", p0: false, locale: "en", status: "live", tags: ["1553", "milstd1553", "avionics", "message", "transaction"] },

  // 8) File Tools
  { slug: "tdms-to-csv", name: "TDMS to CSV Converter", description: "Convert NI TDMS files to CSV in your browser — no upload.", category: "file-tools", p0: true, locale: "en", status: "live", tags: ["tdms", "csv", "labview", "ni", "convert"] },
  { slug: "tdms-viewer", name: "TDMS Viewer", description: "Inspect TDMS group/channel tree and properties in the browser.", category: "file-tools", p0: false, locale: "en", status: "live", tags: ["tdms", "viewer", "labview", "ni"] },
  { slug: "csv-waveform-plotter", name: "CSV Waveform Plotter", description: "Plot waveform columns from CSV files, fully client-side.", category: "file-tools", p0: false, locale: "en", status: "live", tags: ["csv", "plot", "waveform", "chart"] },
  { slug: "hex-file-viewer", name: "Hex File Viewer", description: "View any file as a hex dump with ASCII column.", category: "file-tools", p0: false, locale: "en", status: "live", tags: ["hex", "viewer", "dump", "binary"] },
  { slug: "hex-srec-bin", name: "Intel HEX · S-Record ↔ BIN Converter", description: "Convert firmware images between Intel HEX, S-Record and raw binary.", category: "file-tools", p0: false, locale: "en", status: "live", tags: ["intel hex", "srec", "bin", "firmware"] },
];

// 41 public tools = all except the two ko-only XGT tools and secondary URLs.
export const PUBLIC_TOOL_COUNT = TOOLS.filter((t) => t.locale !== "ko" && !t.hubHidden).length;

export function toolsByCategory(id: CategoryId): ToolMeta[] {
  return TOOLS.filter((t) => t.category === id && !t.hubHidden);
}
