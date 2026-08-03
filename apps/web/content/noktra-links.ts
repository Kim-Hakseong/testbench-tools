// NOKTRA 퍼널 — 툴 슬러그 → 관련 NOKTRA 데스크톱 제품 매핑.
// 강한 연관만 싣는다(전 툴 도배 금지). 링크 베이스는 이 상수 하나로 관리:
// noktra.io 도메인 등록 시 아래 한 줄만 교체하면 된다.
export const NOKTRA_BASE = "https://kim-hakseong.github.io/noktra-website";

export interface NoktraProduct {
  slug: string;
  name: string;
  /** 배너 한 줄 — 각 제품 사이트 카피에서 발췌·축약 */
  en: string;
  ko: string;
}

const PRODUCTS: Record<string, NoktraProduct> = {
  "icd-refinery": {
    slug: "icd-refinery",
    name: "ICD Refinery",
    en: "turns messy interface control documents into a validated spec, then generates the codec — fully offline.",
    ko: "제각각인 ICD를 검증된 스펙으로 정제하고 코덱까지 생성합니다 — 완전 오프라인.",
  },
  "protocol-bridge": {
    slug: "protocol-bridge",
    name: "Protocol Bridge",
    en: "unattended channel mapping across Modbus, UDP, serial and MQTT — configure once, keep running.",
    ko: "Modbus·UDP·시리얼·MQTT를 잇는 무인 채널 매핑 — 한 번 설정하고 계속 돌립니다.",
  },
  "telemetry-scope": {
    slug: "telemetry-scope",
    name: "Telemetry Scope",
    en: "live strip charts from one channel-definition file, with recording and timed replay.",
    ko: "채널 정의 파일 하나로 라이브 스트립 차트, 기록과 정시 리플레이까지.",
  },
  "ch10-viewer": {
    slug: "ch10-viewer",
    name: "Ch10 Viewer",
    en: "opens IRIG 106 Chapter 10 flight-test recordings on a disconnected bench — no server, no conversion.",
    ko: "IRIG 106 Chapter 10 비행시험 기록을 분리된 벤치에서 바로 엽니다 — 서버도 변환도 없이.",
  },
};

/** 툴 슬러그 → NOKTRA 제품. 여기 없는 툴은 배너를 만들지 않는다. */
const TOOL_TO_PRODUCT: Record<string, string> = {
  // 비행시험 버스 데이터 → Ch10 Viewer
  "mil-1553-command-word": "ch10-viewer",
  "mil-1553-status-word": "ch10-viewer",
  "mil-1553-mode-codes": "ch10-viewer",
  "mil-1553-message-decoder": "ch10-viewer",
  "arinc-429-decoder": "ch10-viewer",
  "arinc-429-builder": "ch10-viewer",
  "hex-file-viewer": "ch10-viewer",
  // Modbus/시리얼 연동 → Protocol Bridge
  "modbus-frame-decoder": "protocol-bridge",
  "modbus-address-converter": "protocol-bridge",
  "crc-16-modbus": "protocol-bridge",
  "xgt-cnet-decoder": "protocol-bridge",
  "xgt-cnet-builder": "protocol-bridge",
  // 파형·스케일링·기록 → Telemetry Scope
  "tdms-to-csv": "telemetry-scope",
  "tdms-viewer": "telemetry-scope",
  "csv-waveform-plotter": "telemetry-scope",
  "plc-analog-scaling": "telemetry-scope",
  "signal-converter": "telemetry-scope",
  // 비트 레이아웃·워드오더 → ICD Refinery
  "ieee-754-float": "icd-refinery",
  "endianness-converter": "icd-refinery",
  "bit-field-extractor": "icd-refinery",
  "struct-padding": "icd-refinery",
};

export function noktraFor(toolSlug: string): NoktraProduct | undefined {
  const productSlug = TOOL_TO_PRODUCT[toolSlug];
  return productSlug ? PRODUCTS[productSlug] : undefined;
}

export function noktraUrl(product: NoktraProduct, locale: "en" | "ko"): string {
  const prefix = locale === "ko" ? "/ko" : "";
  return `${NOKTRA_BASE}${prefix}/products/${product.slug}/`;
}
