// Noctra — the sister brand of offline, installable desktop instruments for
// air-gapped test benches. The web tools solve one frame or one value at a
// time; Noctra products are the same problems at full size, without a network.
//
// Brand spelling is "Noctra" everywhere; product names are Noctra Bus /
// Noctra View / Noctra OneShot (confirmed in RUN-TB2). The three waitlist
// pages describe products in preparation; their copy is only the one-line
// definitions given in RUN-TB1 — no feature list is claimed beyond that.
// Pages exist in English and Korean only (RUN-TB2).

export interface NoctraWaitlist {
  slug: "bus" | "view" | "oneshot";
  name: string;
  /** One-line definition. */
  line: string;
  lineKo: string;
  /** What it is the larger version of, on this site. */
  fromHere: string;
  fromHereKo: string;
  /** Screenshot under /public, once a real one exists. Empty = no image is rendered (CLAUDE.md §5.4: no placeholders). */
  screenshot: string;
}

export const NOCTRA_WAITLIST: NoctraWaitlist[] = [
  {
    slug: "bus",
    name: "Noctra Bus",
    line: "Watch hundreds of messages on a live MIL-STD-1553 or ARINC 429 bus.",
    lineKo: "실물 MIL-STD-1553·ARINC 429 버스의 메시지 수백 개를 실시간으로 봅니다.",
    fromHere: "The 1553 and 429 decoders here read one word at a time.",
    fromHereKo: "이 사이트의 1553·429 디코더는 한 번에 워드 하나를 읽습니다.",
    screenshot: "",
  },
  {
    slug: "view",
    name: "Noctra View",
    line: "Explore multi-gigabyte measurement files the way DIAdem does.",
    lineKo: "수 GB 측정 파일을 DIAdem처럼 탐색합니다.",
    fromHere: "The TDMS, CSV and HEX tools here open one file in a browser tab.",
    fromHereKo: "이 사이트의 TDMS·CSV·HEX 툴은 브라우저 탭에서 파일 하나를 엽니다.",
    screenshot: "",
  },
  {
    slug: "oneshot",
    name: "Noctra OneShot",
    line: "From the drawing to an XG5000 ladder program, generated automatically.",
    lineKo: "도면에서 XG5000 래더 프로그램까지 자동으로 생성합니다.",
    fromHere: "The LS XGT tools here convert one address or one frame.",
    fromHereKo: "이 사이트의 LS XGT 툴은 주소 하나, 프레임 하나를 변환합니다.",
    screenshot: "",
  },
];

/** Shipping Noctra products, described as on their own sites (en and ko copy carried over from the old banner links file). */
export const NOCTRA_PRODUCTS = [
  { name: "ICD Refinery", line: "Turns messy interface control documents into a validated spec, then generates the codec — fully offline.", lineKo: "제각각인 ICD를 검증된 스펙으로 정제하고 코덱까지 생성합니다 — 완전 오프라인." },
  { name: "Protocol Bridge", line: "Unattended channel mapping across Modbus, UDP, serial and MQTT — configure once, keep running.", lineKo: "Modbus·UDP·시리얼·MQTT를 잇는 무인 채널 매핑 — 한 번 설정하고 계속 돌립니다." },
  { name: "Telemetry Scope", line: "Live strip charts from one channel-definition file, with recording and timed replay.", lineKo: "채널 정의 파일 하나로 라이브 스트립 차트, 기록과 정시 리플레이까지." },
  { name: "Ch10 Viewer", line: "Opens IRIG 106 Chapter 10 flight-test recordings on a disconnected bench — no server, no conversion.", lineKo: "IRIG 106 Chapter 10 비행시험 기록을 분리된 벤치에서 바로 엽니다 — 서버도 변환도 없이." },
];

export const NOCTRA_TRAITS = ["Air-gapped", "Installed", "Offline"];
export const NOCTRA_TRAITS_KO = ["폐쇄망", "설치형", "오프라인"];

export type NoctraLocale = "en" | "ko";

export const noctraPath = (locale: NoctraLocale, slug?: string) =>
  `${locale === "ko" ? "/ko" : ""}/noctra/${slug ? `${slug}/` : ""}`;

export const CONTACT_EMAIL = "contact@testbench.tools";

/** Waitlist = an email to the existing contact address, product name in the subject. No new service. */
export function waitlistHref(name: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${name} — waitlist`)}`;
}

/** hreflang pair for a Noctra page: English and Korean only. */
export function noctraAlternates(locale: NoctraLocale, slug?: string) {
  return {
    canonical: noctraPath(locale, slug),
    languages: { en: noctraPath("en", slug), ko: noctraPath("ko", slug), "x-default": noctraPath("en", slug) },
  };
}
