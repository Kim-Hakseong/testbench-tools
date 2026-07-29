// Site-wide locale dictionaries. English is the root; ko/ja/de/zh get fully
// translated hubs. Tool pages exist in en (all) and ko (PLC/sensor set) —
// other locales link to the English tool pages for now.
import type { CategoryId } from "@/content/tools-meta";

export type SiteLocale = "en" | "ko" | "ja" | "de" | "zh";

export const SITE_LOCALES: SiteLocale[] = ["en", "ko", "ja", "de", "zh"];

export const LOCALE_PREFIX: Record<SiteLocale, string> = {
  en: "/",
  ko: "/ko/",
  ja: "/ja/",
  de: "/de/",
  zh: "/zh/",
};

export const LOCALE_LABEL: Record<SiteLocale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  de: "Deutsch",
  zh: "简体中文",
};

/**
 * Which language the chrome should speak.
 *
 * A localized route always wins — its body really is in that language. English
 * routes are the fallback most tool pages live on, so a visitor who chose
 * another language would otherwise lose it, and every nav link with it. There,
 * and only there, the stored choice takes over.
 */
export function chromeLang(routeLang: SiteLocale, stored: string | null): SiteLocale {
  if (routeLang !== "en") return routeLang;
  if (!stored || stored === "en") return "en";
  return (SITE_LOCALES as string[]).includes(stored) ? (stored as SiteLocale) : "en";
}

export const HTML_LANG: Record<SiteLocale, string> = {
  en: "en",
  ko: "ko",
  ja: "ja",
  de: "de",
  zh: "zh-CN",
};

// ---------------------------------------------------------------------------
// Header / footer chrome
// ---------------------------------------------------------------------------
export interface ChromeStrings {
  badge: string;
  footer: string;
  navApps: string;
  navAbout: string;
}

export const CHROME: Record<SiteLocale, ChromeStrings> = {
  en: {
    badge: "Free · 100% in-browser",
    footer: "All calculations run 100% in your browser. No uploads, no accounts.",
    navApps: "Desktop Apps",
    navAbout: "About",
  },
  ko: {
    badge: "무료 · 100% 브라우저",
    footer: "모든 계산은 브라우저 안에서 실행됩니다. 업로드도, 계정도 없습니다.",
    navApps: "데스크톱 앱",
    navAbout: "소개",
  },
  ja: {
    badge: "無料 · 100%ブラウザ内",
    footer: "すべての計算はブラウザ内で実行されます。アップロードもアカウントも不要です。",
    navApps: "デスクトップアプリ",
    navAbout: "概要",
  },
  de: {
    badge: "Kostenlos · 100 % im Browser",
    footer: "Alle Berechnungen laufen vollständig in Ihrem Browser. Keine Uploads, keine Konten.",
    navApps: "Desktop-Apps",
    navAbout: "Über",
  },
  zh: {
    badge: "免费 · 100% 本地运行",
    footer: "所有计算都在您的浏览器中完成。无上传，无需账号。",
    navApps: "桌面应用",
    navAbout: "关于",
  },
};

// ---------------------------------------------------------------------------
// Hub strings
// ---------------------------------------------------------------------------
export interface HubStrings {
  /** Pill badge above the headline — the free/no-signup promise. */
  badge: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  popular: string;
  stats: string;
  noMatch: string; // {q} placeholder
  soon: string;
  enChip: string; // chip shown when the tool page is English
  appsTitle: string;
  appsSubtitle: string;
  comingSoon: string;
  download: string;
}

export const HUB: Record<SiteLocale, HubStrings> = {
  en: {
    badge: "100% free · no sign-up · in-browser",
    title: "Every bench calculation, one tab away",
    subtitle:
      "53 free tools for test & measurement, embedded and industrial engineers — CRC, Modbus frames, PLC scaling, sensor math, file converters. No sign-up, nothing leaves your browser.",
    searchPlaceholder: "Search 53 tools — try “crc”, “modbus”, “pt100”…",
    popular: "Popular:",
    stats: "100% free · 53 tools · 8 categories · in-browser",
    noMatch: "No tools match",
    soon: "Soon",
    enChip: "EN",
    appsTitle: "Desktop Apps",
    appsSubtitle: "Free desktop companions for heavier, offline workloads.",
    comingSoon: "Coming soon",
    download: "Download",
  },
  ko: {
    badge: "100% 무료 · 가입 없음 · 브라우저에서 바로",
    title: "엔지니어의 계산, 브라우저에서 바로",
    subtitle:
      "계측·임베디드·산업자동화 엔지니어용 무료 툴 53종 — CRC, Modbus 프레임, PLC 스케일링, 센서 계산, 파일 변환. 가입 없이, 데이터는 브라우저 밖으로 나가지 않습니다.",
    searchPlaceholder: "53개 툴 검색 — “crc”, “modbus”, “pt100”…",
    popular: "인기:",
    stats: "100% 무료 · 툴 53종 · 8개 카테고리 · 브라우저 내 계산",
    noMatch: "일치하는 툴이 없습니다:",
    soon: "준비 중",
    enChip: "EN",
    appsTitle: "데스크톱 앱",
    appsSubtitle: "대용량·오프라인 작업을 위한 무료 데스크톱 동반 앱.",
    comingSoon: "출시 예정",
    download: "다운로드",
  },
  ja: {
    badge: "100%無料 · 登録不要 · ブラウザ内で完結",
    title: "ベンチの計算は、このタブひとつで",
    subtitle:
      "計測・組み込み・産業オートメーションエンジニアのための無料ツール53種 — CRC、Modbusフレーム、PLCスケーリング、センサー計算、ファイル変換。登録不要、データはブラウザの外に出ません。",
    searchPlaceholder: "53個のツールを検索 — 「crc」「modbus」「pt100」…",
    popular: "人気:",
    stats: "100%無料 · ツール53種 · 8カテゴリ · ブラウザ内",
    noMatch: "一致するツールがありません:",
    soon: "近日公開",
    enChip: "EN",
    appsTitle: "デスクトップアプリ",
    appsSubtitle: "大容量・オフライン作業向けの無料デスクトップアプリ。",
    comingSoon: "近日公開",
    download: "ダウンロード",
  },
  de: {
    badge: "100 % kostenlos · ohne Anmeldung · im Browser",
    title: "Jede Bench-Berechnung, einen Tab entfernt",
    subtitle:
      "53 kostenlose Tools für Mess-, Embedded- und Automatisierungstechnik — CRC, Modbus-Frames, SPS-Skalierung, Sensor-Mathematik, Dateikonverter. Ohne Anmeldung, nichts verlässt Ihren Browser.",
    searchPlaceholder: "53 Tools durchsuchen — z. B. „crc“, „modbus“, „pt100“ …",
    popular: "Beliebt:",
    stats: "100 % kostenlos · 53 Tools · 8 Kategorien · im Browser",
    noMatch: "Keine Tools gefunden für",
    soon: "Bald",
    enChip: "EN",
    appsTitle: "Desktop-Apps",
    appsSubtitle: "Kostenlose Desktop-Begleiter für größere Offline-Aufgaben.",
    comingSoon: "Demnächst",
    download: "Herunterladen",
  },
  zh: {
    badge: "100% 免费 · 无需注册 · 浏览器本地运行",
    title: "工程计算，一个标签页搞定",
    subtitle:
      "面向测试测量、嵌入式与工业自动化工程师的 49 个免费工具 — CRC、Modbus 报文、PLC 换算、传感器计算、文件转换。无需注册，数据不离开浏览器。",
    searchPlaceholder: "搜索 49 个工具 — 试试 “crc”、“modbus”、“pt100”…",
    popular: "热门:",
    stats: "100% 免费 · 49 个工具 · 8 个分类 · 浏览器本地",
    noMatch: "没有匹配的工具:",
    soon: "即将上线",
    enChip: "EN",
    appsTitle: "桌面应用",
    appsSubtitle: "面向大文件与离线工作的免费桌面应用。",
    comingSoon: "即将推出",
    download: "下载",
  },
};

// ---------------------------------------------------------------------------
// Category names
// ---------------------------------------------------------------------------
export const CATEGORY_NAMES: Record<SiteLocale, Record<CategoryId, string>> = {
  en: {
    "checksum-crc": "Checksum & CRC",
    "protocol-decoders": "Protocol Decoders",
    "data-converters": "Data Converters",
    "plc-industrial": "PLC & Industrial",
    "sensor-signal": "Sensor & Signal",
    "embedded-mcu": "Embedded & MCU",
    "avionics-databus": "Avionics & Data Bus",
    "file-tools": "File Tools",
  },
  ko: {
    "checksum-crc": "체크섬 & CRC",
    "protocol-decoders": "프로토콜 디코더",
    "data-converters": "데이터 변환",
    "plc-industrial": "PLC & 산업",
    "sensor-signal": "센서 & 신호",
    "embedded-mcu": "임베디드 & MCU",
    "avionics-databus": "항공전자 & 데이터 버스",
    "file-tools": "파일 툴",
  },
  ja: {
    "checksum-crc": "チェックサム & CRC",
    "protocol-decoders": "プロトコルデコーダ",
    "data-converters": "データ変換",
    "plc-industrial": "PLC & 産業",
    "sensor-signal": "センサー & 信号",
    "embedded-mcu": "組み込み & MCU",
    "avionics-databus": "アビオニクス & データバス",
    "file-tools": "ファイルツール",
  },
  de: {
    "checksum-crc": "Prüfsummen & CRC",
    "protocol-decoders": "Protokoll-Decoder",
    "data-converters": "Datenkonverter",
    "plc-industrial": "SPS & Industrie",
    "sensor-signal": "Sensorik & Signal",
    "embedded-mcu": "Embedded & MCU",
    "avionics-databus": "Avionik & Datenbus",
    "file-tools": "Datei-Tools",
  },
  zh: {
    "checksum-crc": "校验和 & CRC",
    "protocol-decoders": "协议解码",
    "data-converters": "数据转换",
    "plc-industrial": "PLC & 工业",
    "sensor-signal": "传感器 & 信号",
    "embedded-mcu": "嵌入式 & MCU",
    "avionics-databus": "航空电子 & 数据总线",
    "file-tools": "文件工具",
  },
};

// ---------------------------------------------------------------------------
// Tool card descriptions (hub cards). Tool names stay in English — they are
// the searchable technical terms. English descriptions live in tools-meta.
// ---------------------------------------------------------------------------
export const CARD_DESC: Partial<Record<SiteLocale, Record<string, string>>> = {
  ko: {
    "crc-16-modbus": "HEX·ASCII 입력의 CRC-16/MODBUS 계산, LE/BE 바이트 순서 표시.",
    "crc-32": "표준 CRC-32(ISO-HDLC) 체크섬 계산.",
    "crc-16-ccitt": "CRC-16/CCITT-FALSE 및 관련 변형 선택 계산.",
    "crc-8": "다항식·초기값 변형을 선택하는 CRC-8 계산.",
    "custom-crc": "width·poly·init·reflect·xorout 완전 파라미터 CRC.",
    "crc-identifier": "체크섬을 만든 CRC 알고리즘 역추적.",
    "nmea-checksum": "NMEA 0183 문장 XOR 체크섬 검증·생성.",
    "modbus-frame-decoder": "Modbus RTU/TCP 프레임 디코딩: 유닛·펑션·레지스터·CRC 검증.",
    "nmea-0183-decoder": "NMEA 0183 문장을 필드별로 파싱, 체크섬 확인.",
    "can-frame-decoder": "CAN 2.0 프레임 분해: ID·DLC·데이터·플래그.",
    "mc-protocol-decoder": "미쓰비시 MC 프로토콜 프레임 해석.",
    "ieee-754-float": "float ↔ 레지스터 변환, 워드오더 ABCD/CDAB/BADC/DCBA.",
    "hex-to-ascii": "HEX 바이트 문자열을 ASCII 텍스트로 변환.",
    "ascii-to-hex": "ASCII 텍스트를 HEX 바이트로 변환.",
    "number-base-converter": "2·8·10·16진수 상호 변환.",
    "twos-complement": "부호 있는 정수 ↔ 2의 보수 HEX (8/16/32비트).",
    "endianness-converter": "HEX 값 바이트 순서 스왑: 16/32/64비트, 워드 스왑.",
    "q-format": "실수 ↔ 고정소수점 Qm.n 표현 변환.",
    "plc-analog-scaling": "Raw 카운트 ↔ 공학 단위 변환. 검증된 벤더 프리셋(S7) 지원.",
    "4-20ma-scaling": "전류 루프 ↔ 공정값 변환. 단선(open loop)·범위 이탈 판정.",
    "two-point-calibration": "두 기준점으로 기울기·오프셋 산출.",
    "signal-converter": "mA·V·psi 공정 신호 범위 상호 변환.",
    "bcd-converter": "BCD ↔ 10진수 변환. 니블 단위 검증과 오류 위치 표시.",
    "loop-burden": "4-20mA 루프 전압 여유 점검.",
    "modbus-address-converter": "0기준·1기준·4xxxx Modbus 주소 표기 변환.",
    "pt100-calculator": "IEC 60751 기준 저항 ↔ 온도 변환 (PT100/PT1000).",
    "thermocouple-calculator": "K/J/T/E 열전대 전압 ↔ 온도 변환.",
    "adc-calculator": "N비트 ADC 카운트 ↔ 전압 변환, LSB 크기 계산.",
    "voltage-divider": "전압 분배비 계산, E24/E96 근사 저항.",
    "rms-peak": "사인파 RMS·피크·피크투피크 변환.",
    "db-dbm": "전력비·dB·dBm·전압 레벨 변환.",
    "can-bit-timing": "목표 CAN 비트레이트의 프리스케일러·세그먼트 계산.",
    "i2c-pullup": "버스 용량·속도 모드 기반 풀업 저항 범위.",
    "stm32-timer": "목표 주파수의 프리스케일러/주기 조합 계산.",
    "uart-baud-error": "클럭·분주 설정의 실제 보레이트와 오차율.",
    "struct-padding": "C 구조체 오프셋·패딩·크기 시각화.",
    "bit-field-extractor": "레지스터 값에서 비트 필드 추출·라벨링.",
    "mil-1553-command-word": "MIL-STD-1553B 커맨드 워드 디코드·생성: RT 주소·T/R·서브주소·워드카운트·모드코드.",
    "mil-1553-status-word": "MIL-STD-1553B 스테이터스 워드 디코드: RT 주소와 모든 상태 플래그 비트.",
    "mil-1553-mode-codes": "T/R 비트와 코드로 1553B 모드코드 조회, 데이터워드 규칙 포함.",
    "mil-1553-message-decoder": "1553B 트랜잭션 전체 배치: 커맨드·데이터·스테이터스 + 패리티 검증.",
    "tdms-to-csv": "NI TDMS 파일을 브라우저에서 CSV로 변환 — 업로드 없음.",
    "tdms-viewer": "TDMS 그룹/채널 트리와 속성 확인.",
    "csv-waveform-plotter": "CSV 파형 컬럼 플로팅, 전부 클라이언트 사이드.",
    "hex-file-viewer": "파일을 HEX 덤프로 보기 (ASCII 컬럼 포함).",
    "hex-srec-bin": "Intel HEX·S-Record ↔ BIN 펌웨어 이미지 변환.",
  },
  ja: {
    "crc-16-modbus": "HEX・ASCII入力のCRC-16/MODBUS計算、LE/BEバイト順を表示。",
    "crc-32": "標準CRC-32（ISO-HDLC）チェックサム計算。",
    "crc-16-ccitt": "CRC-16/CCITT-FALSEと関連バリアントの選択計算。",
    "crc-8": "多項式・初期値を選べるCRC-8計算。",
    "custom-crc": "width・poly・init・reflect・xoroutの完全パラメータCRC。",
    "crc-identifier": "チェックサムを生成したCRCアルゴリズムを逆探索。",
    "nmea-checksum": "NMEA 0183センテンスのXORチェックサム検証・生成。",
    "modbus-frame-decoder": "Modbus RTU/TCPフレーム解析: ユニット・機能・レジスタ・CRC検証。",
    "nmea-0183-decoder": "NMEA 0183センテンスをフィールド別に解析。",
    "can-frame-decoder": "CAN 2.0フレーム分解: ID・DLC・データ・フラグ。",
    "mc-protocol-decoder": "三菱MCプロトコルフレームの解析。",
    "ieee-754-float": "float ↔ レジスタ変換、ワード順ABCD/CDAB/BADC/DCBA。",
    "hex-to-ascii": "HEXバイト列をASCIIテキストへ変換。",
    "ascii-to-hex": "ASCIIテキストをHEXバイト列へ変換。",
    "number-base-converter": "2・8・10・16進数の相互変換。",
    "twos-complement": "符号付き整数 ↔ 2の補数HEX（8/16/32ビット）。",
    "endianness-converter": "HEX値のバイト順入れ替え: 16/32/64ビット、ワードスワップ。",
    "q-format": "実数 ↔ 固定小数点Qm.n表現の変換。",
    "plc-analog-scaling": "生カウント ↔ 工学単位の変換。検証済みベンダープリセット（S7）。",
    "4-20ma-scaling": "電流ループ ↔ プロセス値変換。断線・レンジ外判定つき。",
    "two-point-calibration": "2つの基準点から傾きとオフセットを算出。",
    "signal-converter": "mA・V・psiプロセス信号レンジの相互変換。",
    "bcd-converter": "BCD ↔ 10進変換。ニブル単位の検証とエラー位置表示。",
    "loop-burden": "4-20mAループの電圧マージン確認。",
    "modbus-address-converter": "0基準・1基準・4xxxxのModbusアドレス表記変換。",
    "pt100-calculator": "IEC 60751準拠の抵抗 ↔ 温度変換（PT100/PT1000）。",
    "thermocouple-calculator": "K/J/T/E熱電対の電圧 ↔ 温度変換。",
    "adc-calculator": "NビットADCカウント ↔ 電圧変換、LSBサイズ計算。",
    "voltage-divider": "分圧比の計算、E24/E96近似抵抗。",
    "rms-peak": "正弦波のRMS・ピーク・ピークトゥピーク変換。",
    "db-dbm": "電力比・dB・dBm・電圧レベルの変換。",
    "can-bit-timing": "目標CANビットレートのプリスケーラ・セグメント計算。",
    "i2c-pullup": "バス容量と速度モードからプルアップ抵抗範囲を算出。",
    "stm32-timer": "目標周波数のプリスケーラ/周期の組み合わせ計算。",
    "uart-baud-error": "クロック・分周設定の実ボーレートと誤差率。",
    "struct-padding": "C構造体のオフセット・パディング・サイズを可視化。",
    "bit-field-extractor": "レジスタ値からビットフィールドを抽出・ラベル付け。",
    "mil-1553-command-word": "MIL-STD-1553Bコマンドワードのデコード・生成: RTアドレス・T/R・サブアドレス・ワードカウント・モードコード。",
    "mil-1553-status-word": "MIL-STD-1553Bステータスワードのデコード: RTアドレスと全ステータスフラグビット。",
    "mil-1553-mode-codes": "T/RビットとコードでMode Codeを参照、データワード規則つき。",
    "mil-1553-message-decoder": "1553Bトランザクション全体を配置: コマンド・データ・ステータス + パリティ検証。",
    "tdms-to-csv": "NI TDMSファイルをブラウザ内でCSVへ変換 — アップロードなし。",
    "tdms-viewer": "TDMSグループ/チャンネルツリーとプロパティの確認。",
    "csv-waveform-plotter": "CSV波形カラムのプロット、完全クライアントサイド。",
    "hex-file-viewer": "任意のファイルをHEXダンプ表示（ASCII列つき）。",
    "hex-srec-bin": "Intel HEX・S-Record ↔ BINファームウェア変換。",
  },
  de: {
    "crc-16-modbus": "CRC-16/MODBUS über Hex- oder ASCII-Eingabe, mit LE/BE-Bytereihenfolge.",
    "crc-32": "Standard-CRC-32 (ISO-HDLC) Prüfsumme.",
    "crc-16-ccitt": "CRC-16/CCITT-FALSE und verwandte Varianten, wählbar.",
    "crc-8": "CRC-8 mit wählbarem Polynom und Startwert.",
    "custom-crc": "Voll parametrierter CRC: Breite, Polynom, Init, Reflect, XorOut.",
    "crc-identifier": "Rückwärtssuche: Welcher CRC-Algorithmus erzeugte die Prüfsumme?",
    "nmea-checksum": "XOR-Prüfsumme für NMEA-0183-Sätze prüfen oder erzeugen.",
    "modbus-frame-decoder": "Modbus-RTU/TCP-Frames decodieren: Unit, Funktion, Register, CRC.",
    "nmea-0183-decoder": "NMEA-0183-Sätze feldweise parsen, mit Prüfsummen-Check.",
    "can-frame-decoder": "CAN-2.0-Frames zerlegen: ID, DLC, Datenbytes, Flags.",
    "mc-protocol-decoder": "Mitsubishi-MC-Protokoll-Frames decodieren.",
    "ieee-754-float": "Float ↔ Register mit Wortreihenfolgen ABCD/CDAB/BADC/DCBA.",
    "hex-to-ascii": "Hex-Bytefolgen in ASCII-Text umwandeln.",
    "ascii-to-hex": "ASCII-Text in Hex-Bytes umwandeln.",
    "number-base-converter": "Umrechnung zwischen Binär, Oktal, Dezimal und Hex.",
    "twos-complement": "Vorzeichenbehaftete Ganzzahl ↔ Zweierkomplement-Hex (8/16/32 Bit).",
    "endianness-converter": "Bytereihenfolge von Hex-Werten tauschen: 16/32/64 Bit.",
    "q-format": "Reelle Zahlen ↔ Festkomma-Qm.n-Darstellung.",
    "plc-analog-scaling": "Rohwerte ↔ physikalische Einheiten, mit verifiziertem S7-Preset.",
    "4-20ma-scaling": "Stromschleife ↔ Prozesswert, mit Drahtbruch- und Bereichswarnung.",
    "two-point-calibration": "Steigung und Offset aus zwei Referenzpunkten.",
    "signal-converter": "Umrechnung zwischen mA-, V- und psi-Signalbereichen.",
    "bcd-converter": "BCD ↔ Dezimal mit Nibble-Prüfung und Fehlerposition.",
    "loop-burden": "Spannungsbudget einer 4-20-mA-Schleife prüfen.",
    "modbus-address-converter": "0-basierte, 1-basierte und 4xxxx-Modbus-Adressen übersetzen.",
    "pt100-calculator": "RTD-Widerstand ↔ Temperatur nach IEC 60751 (PT100/PT1000).",
    "thermocouple-calculator": "Spannung ↔ Temperatur für Thermoelemente K/J/T/E.",
    "adc-calculator": "ADC-Counts ↔ Spannung für N-Bit-Wandler, mit LSB-Größe.",
    "voltage-divider": "Spannungsteiler lösen, mit E24/E96-Näherungswiderständen.",
    "rms-peak": "RMS, Spitze und Spitze-Spitze für Sinussignale umrechnen.",
    "db-dbm": "Leistungsverhältnisse, dB, dBm und Spannungspegel umrechnen.",
    "can-bit-timing": "Prescaler- und Segmentwerte für eine CAN-Bitrate berechnen.",
    "i2c-pullup": "Pull-up-Grenzen aus Buskapazität und Geschwindigkeitsmodus.",
    "stm32-timer": "Prescaler/Perioden-Kombinationen für eine Zielfrequenz.",
    "uart-baud-error": "Tatsächliche Baudrate und Fehler in % aus Takt und Teiler.",
    "struct-padding": "Offsets, Padding und Größe von C-Structs visualisieren.",
    "bit-field-extractor": "Bitfelder aus Registerwerten extrahieren und beschriften.",
    "mil-1553-command-word": "1553B-Command-Words decodieren und bauen: RT-Adresse, T/R, Subadresse, Wortzahl, Mode-Codes.",
    "mil-1553-status-word": "1553B-Status-Words decodieren: RT-Adresse und alle Status-Flag-Bits.",
    "mil-1553-mode-codes": "1553B-Mode-Codes nach T/R-Bit und Code nachschlagen, mit Datenwort-Regeln.",
    "mil-1553-message-decoder": "Vollständige 1553B-Transaktion darstellen: Command, Datenwörter und Status, mit Paritätsprüfung.",
    "tdms-to-csv": "NI-TDMS-Dateien im Browser nach CSV wandeln — ohne Upload.",
    "tdms-viewer": "TDMS-Gruppen/Kanal-Baum und Eigenschaften ansehen.",
    "csv-waveform-plotter": "Wellenform-Spalten aus CSV plotten, komplett clientseitig.",
    "hex-file-viewer": "Beliebige Dateien als Hexdump mit ASCII-Spalte ansehen.",
    "hex-srec-bin": "Firmware zwischen Intel HEX, S-Record und Binär konvertieren.",
  },
  zh: {
    "crc-16-modbus": "对 HEX/ASCII 输入计算 CRC-16/MODBUS，显示 LE/BE 字节序。",
    "crc-32": "标准 CRC-32（ISO-HDLC）校验和计算。",
    "crc-16-ccitt": "CRC-16/CCITT-FALSE 及相关变体可选计算。",
    "crc-8": "可选多项式与初始值的 CRC-8 计算。",
    "custom-crc": "完全参数化 CRC：宽度、多项式、初值、反射、异或输出。",
    "crc-identifier": "反向查找生成该校验和的 CRC 算法。",
    "nmea-checksum": "NMEA 0183 语句 XOR 校验和的验证与生成。",
    "modbus-frame-decoder": "解码 Modbus RTU/TCP 报文：单元、功能码、寄存器、CRC 校验。",
    "nmea-0183-decoder": "按字段解析 NMEA 0183 语句并校验。",
    "can-frame-decoder": "拆解 CAN 2.0 帧：ID、DLC、数据字节、标志位。",
    "mc-protocol-decoder": "解析三菱 MC 协议报文。",
    "ieee-754-float": "float ↔ 寄存器转换，字序 ABCD/CDAB/BADC/DCBA。",
    "hex-to-ascii": "HEX 字节串转 ASCII 文本。",
    "ascii-to-hex": "ASCII 文本转 HEX 字节串。",
    "number-base-converter": "二、八、十、十六进制互转。",
    "twos-complement": "有符号整数 ↔ 补码 HEX（8/16/32 位）。",
    "endianness-converter": "HEX 值字节序交换：16/32/64 位、字交换。",
    "q-format": "实数 ↔ 定点 Qm.n 表示转换。",
    "plc-analog-scaling": "原始计数 ↔ 工程单位换算，含已验证的 S7 预设。",
    "4-20ma-scaling": "电流回路 ↔ 过程值换算，含断线与超量程判断。",
    "two-point-calibration": "由两个基准点求斜率与偏移。",
    "signal-converter": "mA、V、psi 过程信号量程互换。",
    "bcd-converter": "BCD ↔ 十进制转换，逐半字节校验并标出错误位置。",
    "loop-burden": "核算 4-20mA 回路电压裕量。",
    "modbus-address-converter": "0 基、1 基与 4xxxx Modbus 地址表示互转。",
    "pt100-calculator": "按 IEC 60751 进行电阻 ↔ 温度换算（PT100/PT1000）。",
    "thermocouple-calculator": "K/J/T/E 热电偶电压 ↔ 温度换算。",
    "adc-calculator": "N 位 ADC 计数 ↔ 电压换算，含 LSB 大小。",
    "voltage-divider": "分压计算，含 E24/E96 近似电阻。",
    "rms-peak": "正弦波 RMS、峰值、峰峰值互换。",
    "db-dbm": "功率比、dB、dBm 与电压电平换算。",
    "can-bit-timing": "按目标 CAN 波特率求预分频与段参数。",
    "i2c-pullup": "由总线电容与速率模式求上拉电阻范围。",
    "stm32-timer": "按目标频率求预分频/周期组合。",
    "uart-baud-error": "由时钟与分频求实际波特率与误差率。",
    "struct-padding": "可视化 C 结构体偏移、填充与总大小。",
    "bit-field-extractor": "从寄存器值提取并标注位字段。",
    "mil-1553-command-word": "解码与构造 1553B 命令字：RT 地址、T/R、子地址、字数、方式码。",
    "mil-1553-status-word": "解码 1553B 状态字：RT 地址与全部状态标志位。",
    "mil-1553-mode-codes": "按 T/R 位与代码查 1553B 方式码，含数据字规则。",
    "mil-1553-message-decoder": "排布完整 1553B 事务：命令、数据字与状态，并校验奇偶。",
    "tdms-to-csv": "在浏览器内将 NI TDMS 文件转为 CSV — 无需上传。",
    "tdms-viewer": "查看 TDMS 组/通道树与属性。",
    "csv-waveform-plotter": "绘制 CSV 波形列，完全本地运行。",
    "hex-file-viewer": "以十六进制转储查看任意文件（含 ASCII 列）。",
    "hex-srec-bin": "Intel HEX、S-Record 与 BIN 固件镜像互转。",
  },
};

// Desktop app card descriptions
export const APP_DESC: Record<SiteLocale, Record<string, string>> = {
  en: {
    "tdms-converter": "Desktop viewer and CSV converter for NI TDMS measurement files.",
    frameterm: "Serial terminal built for frame-level protocol work.",
    "modbus-workbench": "Modbus RTU/TCP master with polling, writes and a built-in simulator.",
  },
  ko: {
    "tdms-converter": "NI TDMS 측정 파일용 데스크톱 뷰어 겸 CSV 변환기.",
    frameterm: "프레임 단위 프로토콜 작업용 시리얼 터미널.",
    "modbus-workbench": "폴링·쓰기·내장 시뮬레이터를 갖춘 Modbus RTU/TCP 마스터.",
  },
  ja: {
    "tdms-converter": "NI TDMS計測ファイル用のデスクトップビューア兼CSV変換ツール。",
    frameterm: "フレームレベルのプロトコル作業向けシリアルターミナル。",
    "modbus-workbench": "ポーリング・書き込み・内蔵シミュレータを備えた Modbus RTU/TCP マスター。",
  },
  de: {
    "tdms-converter": "Desktop-Viewer und CSV-Konverter für NI-TDMS-Messdateien.",
    frameterm: "Serielles Terminal für Protokollarbeit auf Frame-Ebene.",
    "modbus-workbench": "Modbus-RTU/TCP-Master mit Abfragen, Schreibzugriffen und internem Simulator.",
  },
  zh: {
    "tdms-converter": "面向 NI TDMS 测量文件的桌面查看器与 CSV 转换工具。",
    frameterm: "面向帧级协议调试的串口终端。",
    "modbus-workbench": "带轮询、写入与内置模拟器的 Modbus RTU/TCP 主站。",
  },
};

// ---------------------------------------------------------------------------
// Shared "chrome" pages (Apps, About, Contact, Privacy) — localized per locale
// so the top-nav tabs keep the user's language.
// ---------------------------------------------------------------------------

export interface AboutStrings {
  metaTitle: string;
  metaDesc: string;
  h1: string;
  intro: string;
  principlesLead: string;
  principles: { title: string; body: string }[];
  free: string;
  contactBefore: string;
  contactLink: string;
  contactAfter: string;
  /** Trademark notice — the site names other companies' products descriptively. */
  trademarks: string;
}

export const ABOUT: Record<SiteLocale, AboutStrings> = {
  en: {
    metaTitle: "About",
    metaDesc:
      "TestBench.tools is a free collection of browser-based micro-tools for test & measurement, embedded and industrial automation engineers.",
    h1: "About TestBench.tools",
    intro:
      "TestBench.tools is a collection of small, fast, free tools for the people who sit between hardware and software: test & measurement engineers, embedded developers and industrial automation folks. CRC calculators, protocol frame decoders, PLC scaling math, sensor equations, measurement file converters — the ten-minute annoyances of bench work, each turned into a page that answers instantly.",
    principlesLead: "Three principles drive every tool here:",
    principles: [
      { title: "Instant.", body: "No sign-up, no configuration ceremony. Each page loads with a worked example already computed and updates as you type." },
      { title: "Client-side.", body: "Every calculation and file conversion runs in your browser. Your frames, registers and measurement files never leave your machine — important when the data belongs to a customer or a lab." },
      { title: "Verified.", body: "The calculation engines are covered by an automated test suite pinned to published check values and golden vectors. If a tool page states a number, a test asserts it." },
    ],
    free: "The site is free and supported by minimal advertising. There are no accounts, no paywalls and no upload servers.",
    contactBefore: "Found a bug, a wrong constant, or a tool you wish existed? ",
    contactLink: "Get in touch",
    contactAfter: ".",
    trademarks:
      "TDMS, MELSEC, SIMATIC, Allen-Bradley, Modbus, XGT and other product names are trademarks of their respective owners, used here only to describe the formats and protocols these tools work with. TestBench.tools is independent and is not affiliated with, endorsed by or sponsored by any of them.",
  },
  ko: {
    metaTitle: "소개",
    metaDesc:
      "TestBench.tools는 계측·임베디드·산업자동화 엔지니어를 위한 무료 브라우저 마이크로툴 모음입니다.",
    h1: "TestBench.tools 소개",
    intro:
      "TestBench.tools는 하드웨어와 소프트웨어 사이에서 일하는 사람들 — 계측 엔지니어, 임베디드 개발자, 산업자동화 담당자 — 를 위한 작고 빠른 무료 툴 모음입니다. CRC 계산기, 프로토콜 프레임 디코더, PLC 스케일링, 센서 계산식, 측정 파일 변환기까지. 현장에서 10분씩 잡아먹던 성가신 계산들을 각각 즉시 답하는 페이지로 만들었습니다.",
    principlesLead: "모든 툴은 세 가지 원칙을 따릅니다:",
    principles: [
      { title: "즉시.", body: "가입도, 복잡한 설정도 없습니다. 각 페이지는 예제가 이미 계산된 상태로 열리고, 입력하는 대로 결과가 갱신됩니다." },
      { title: "클라이언트 사이드.", body: "모든 계산과 파일 변환은 브라우저 안에서 실행됩니다. 프레임·레지스터·측정 파일은 절대 기기 밖으로 나가지 않습니다 — 고객이나 연구소의 데이터일 때 특히 중요합니다." },
      { title: "검증됨.", body: "계산 엔진은 공표된 체크값과 골든 벡터에 고정된 자동 테스트로 검증됩니다. 툴 페이지에 적힌 숫자는 반드시 테스트가 보증합니다." },
    ],
    free: "이 사이트는 무료이며 최소한의 광고로 운영됩니다. 계정도, 유료 장벽도, 업로드 서버도 없습니다.",
    contactBefore: "버그, 잘못된 상수, 또는 있었으면 하는 툴이 있나요? ",
    contactLink: "알려주세요",
    contactAfter: ".",
    trademarks:
      "TDMS, MELSEC, SIMATIC, Allen-Bradley, Modbus, XGT 등 제품명은 각 소유자의 상표이며, 이 툴이 다루는 포맷·프로토콜을 설명하기 위해서만 사용합니다. TestBench.tools는 독립적으로 운영되며 이들 기업과 제휴·보증·후원 관계가 없습니다.",
  },
  ja: {
    metaTitle: "概要",
    metaDesc:
      "TestBench.toolsは、計測・組み込み・産業オートメーションエンジニアのための無料ブラウザツール集です。",
    h1: "TestBench.tools について",
    intro:
      "TestBench.toolsは、ハードとソフトの間で働く人たち — 計測エンジニア、組み込み開発者、産業オートメーション担当者 — のための小さく速い無料ツール集です。CRC計算、プロトコルフレームのデコード、PLCスケーリング、センサー計算式、計測ファイル変換まで。現場で10分かかっていた面倒な計算を、それぞれ即答するページにしました。",
    principlesLead: "すべてのツールは3つの原則に従います:",
    principles: [
      { title: "即時。", body: "登録も、面倒な設定もありません。各ページは計算済みの例とともに開き、入力するそばから結果が更新されます。" },
      { title: "クライアントサイド。", body: "すべての計算とファイル変換はブラウザ内で実行されます。フレーム・レジスタ・計測ファイルは端末の外に出ません — 顧客やラボのデータなら特に重要です。" },
      { title: "検証済み。", body: "計算エンジンは公表されたチェック値とゴールデンベクタに固定された自動テストで検証されています。ツールページに書かれた数値は必ずテストが保証します。" },
    ],
    free: "このサイトは無料で、最小限の広告で運営されています。アカウントも、有料の壁も、アップロードサーバーもありません。",
    contactBefore: "バグ、誤った定数、あるいは欲しいツールはありますか？ ",
    contactLink: "ご連絡ください",
    contactAfter: "。",
    trademarks:
      "TDMS、MELSEC、SIMATIC、Allen-Bradley、Modbus、XGT などの製品名は各所有者の商標であり、本ツールが扱うフォーマットやプロトコルを説明する目的でのみ使用しています。TestBench.tools は独立しており、これらの企業と提携・推奨・後援の関係はありません。",
  },
  de: {
    metaTitle: "Über",
    metaDesc:
      "TestBench.tools ist eine kostenlose Sammlung browserbasierter Mikro-Tools für Mess-, Embedded- und Automatisierungstechnik.",
    h1: "Über TestBench.tools",
    intro:
      "TestBench.tools ist eine Sammlung kleiner, schneller, kostenloser Tools für alle zwischen Hardware und Software: Messtechniker, Embedded-Entwickler und Automatisierer. CRC-Rechner, Protokoll-Decoder, SPS-Skalierung, Sensorgleichungen, Messdatei-Konverter — die Zehn-Minuten-Ärgernisse der Bench-Arbeit, jedes zu einer Seite gemacht, die sofort antwortet.",
    principlesLead: "Drei Prinzipien leiten jedes Tool hier:",
    principles: [
      { title: "Sofort.", body: "Keine Anmeldung, kein Konfigurationsaufwand. Jede Seite lädt mit einem bereits berechneten Beispiel und aktualisiert sich beim Tippen." },
      { title: "Clientseitig.", body: "Jede Berechnung und Dateikonvertierung läuft in Ihrem Browser. Frames, Register und Messdateien verlassen Ihr Gerät nie — wichtig, wenn die Daten einem Kunden oder Labor gehören." },
      { title: "Verifiziert.", body: "Die Rechen-Engines sind durch eine automatisierte Testsuite abgedeckt, die an veröffentlichte Prüfwerte und Golden Vectors gebunden ist. Steht eine Zahl auf einer Tool-Seite, sichert ein Test sie zu." },
    ],
    free: "Die Seite ist kostenlos und wird durch minimale Werbung finanziert. Es gibt keine Konten, keine Paywalls und keine Upload-Server.",
    contactBefore: "Einen Fehler, eine falsche Konstante oder ein fehlendes Tool gefunden? ",
    contactLink: "Melden Sie sich",
    contactAfter: ".",
    trademarks:
      "TDMS, MELSEC, SIMATIC, Allen-Bradley, Modbus, XGT und weitere Produktnamen sind Marken ihrer jeweiligen Inhaber und werden hier ausschließlich zur Beschreibung der Formate und Protokolle verwendet, mit denen diese Tools arbeiten. TestBench.tools ist unabhängig und steht in keiner Verbindung zu diesen Unternehmen, wird von ihnen weder unterstützt noch gesponsert.",
  },
  zh: {
    metaTitle: "关于",
    metaDesc:
      "TestBench.tools 是面向测试测量、嵌入式与工业自动化工程师的免费浏览器微工具合集。",
    h1: "关于 TestBench.tools",
    intro:
      "TestBench.tools 是为身处硬件与软件之间的人 —— 测试测量工程师、嵌入式开发者、工业自动化人员 —— 打造的小巧、快速、免费的工具合集。CRC 计算、协议报文解码、PLC 换算、传感器公式、测量文件转换：把现场那些耗上十分钟的琐碎计算，各自做成一个即时给出答案的页面。",
    principlesLead: "每个工具都遵循三条原则：",
    principles: [
      { title: "即时。", body: "无需注册，无需繁琐配置。每个页面打开时已算好一个示例，并随输入实时更新。" },
      { title: "本地运行。", body: "所有计算与文件转换都在你的浏览器中完成。报文、寄存器、测量文件绝不离开你的设备 —— 当数据属于客户或实验室时尤为重要。" },
      { title: "经过验证。", body: "计算引擎由自动化测试覆盖，并锁定到公开的校验值与黄金向量。工具页上写出的数字，都有测试为其背书。" },
    ],
    free: "本站免费，靠极少量广告维持。没有账号、没有付费墙、没有上传服务器。",
    contactBefore: "发现了 bug、错误的常数，或希望增加某个工具？ ",
    contactLink: "联系我们",
    contactAfter: "。",
    trademarks:
      "TDMS、MELSEC、SIMATIC、Allen-Bradley、Modbus、XGT 等产品名称均为各自所有者的商标，此处仅用于说明本站工具所处理的格式与协议。TestBench.tools 独立运营，与上述公司无隶属、认可或赞助关系。",
  },
};

export interface ContactStrings {
  metaTitle: string;
  metaDesc: string;
  h1: string;
  lead: string;
  priority: string;
}

export const CONTACT: Record<SiteLocale, ContactStrings> = {
  en: {
    metaTitle: "Contact",
    metaDesc: "Contact TestBench.tools — bug reports, corrections and tool requests.",
    h1: "Contact",
    lead: "Bug reports, incorrect constants, feature requests, or anything else — email works best:",
    priority:
      "Reports of wrong values get priority. If a calculator disagrees with your instrument or datasheet, include the input, the expected value and its source — the fix usually ships with a new regression test.",
  },
  ko: {
    metaTitle: "문의",
    metaDesc: "TestBench.tools 문의 — 버그 신고, 오류 수정, 툴 요청.",
    h1: "문의",
    lead: "버그 신고, 잘못된 상수, 기능 요청 등 무엇이든 — 이메일이 가장 좋습니다:",
    priority:
      "값이 틀렸다는 신고를 최우선으로 처리합니다. 계산기가 계측기나 데이터시트와 다르면 입력값·기대값·출처를 함께 보내주세요 — 대부분 새 회귀 테스트와 함께 수정됩니다.",
  },
  ja: {
    metaTitle: "お問い合わせ",
    metaDesc: "TestBench.tools へのお問い合わせ — バグ報告、修正、ツール要望。",
    h1: "お問い合わせ",
    lead: "バグ報告、誤った定数、機能要望など、何でも — メールが最適です:",
    priority:
      "値の誤りの報告を最優先で対応します。計算機が測定器やデータシートと合わない場合は、入力値・期待値・出典を添えてください — 多くは新しい回帰テストとともに修正されます。",
  },
  de: {
    metaTitle: "Kontakt",
    metaDesc: "Kontakt zu TestBench.tools — Fehlerberichte, Korrekturen und Tool-Wünsche.",
    h1: "Kontakt",
    lead: "Fehlerberichte, falsche Konstanten, Feature-Wünsche oder alles andere — E-Mail funktioniert am besten:",
    priority:
      "Meldungen falscher Werte haben Vorrang. Wenn ein Rechner Ihrem Gerät oder Datenblatt widerspricht, fügen Sie Eingabe, erwarteten Wert und Quelle bei — die Korrektur kommt meist mit einem neuen Regressionstest.",
  },
  zh: {
    metaTitle: "联系",
    metaDesc: "联系 TestBench.tools —— bug 反馈、勘误与工具需求。",
    h1: "联系",
    lead: "bug 反馈、错误常数、功能需求或其他任何事 —— 邮件最方便：",
    priority:
      "数值错误的反馈优先处理。若某个计算器与你的仪器或数据手册不一致，请附上输入值、期望值及其出处 —— 修复通常会连同一条新的回归测试一起发布。",
  },
};

export interface PrivacyStrings {
  metaTitle: string;
  metaDesc: string;
  h1: string;
  updated: string;
  sections: { heading: string; body: string }[];
  contactHeading: string;
  contactBefore: string;
}

const PRIVACY_UPDATED = "2026-07-25";

export const PRIVACY: Record<SiteLocale, PrivacyStrings> = {
  en: {
    metaTitle: "Privacy",
    metaDesc: "TestBench.tools privacy policy: client-side calculations, no accounts, no upload servers.",
    h1: "Privacy",
    updated: `Last updated: ${PRIVACY_UPDATED}`,
    sections: [
      { heading: "Your data stays with you", body: "Every calculator, decoder and file converter on this site runs entirely in your browser. Values you type and files you open are processed locally by JavaScript and are never transmitted to us or to any server. There are no upload endpoints, no accounts and no databases behind this site — it is served as static files." },
      { heading: "What is stored locally", body: "Two items of localStorage: your dark/light theme preference and your language choice. Both stay in your browser and are not readable by us. No other client-side storage is used by the site itself." },
      { heading: "Analytics", body: "We run no analytics and no tracking scripts of our own." },
      { heading: "Advertising", body: "The site is ad-supported. When advertising is active, we prefer EthicalAds, a network that serves contextual ads without cookies, tracking or personal-data collection. If Google AdSense units are ever enabled, a consent dialog compliant with Google's requirements will be shown first, and Google's own privacy policy applies. Ad scripts are the only third-party requests this site makes." },
    ],
    contactHeading: "Contact",
    contactBefore: "Privacy questions: ",
  },
  ko: {
    metaTitle: "개인정보",
    metaDesc: "TestBench.tools 개인정보 방침: 브라우저 내 계산, 계정 없음, 업로드 서버 없음.",
    h1: "개인정보",
    updated: `최종 수정: ${PRIVACY_UPDATED}`,
    sections: [
      { heading: "데이터는 당신에게 머뭅니다", body: "이 사이트의 모든 계산기·디코더·파일 변환기는 전적으로 브라우저 안에서 실행됩니다. 입력한 값과 연 파일은 JavaScript가 로컬에서 처리하며, 저희나 어떤 서버로도 전송되지 않습니다. 업로드 엔드포인트도, 계정도, 데이터베이스도 없습니다 — 정적 파일로 제공됩니다." },
      { heading: "로컬에 저장되는 것", body: "localStorage 두 항목: 다크/라이트 테마 설정과 언어 선택. 둘 다 브라우저에 남으며 저희는 읽을 수 없습니다. 사이트 자체는 그 외 어떤 클라이언트 저장소도 사용하지 않습니다." },
      { heading: "분석", body: "저희는 어떤 분석·추적 스크립트도 운영하지 않습니다." },
      { heading: "광고", body: "이 사이트는 광고로 운영됩니다. 광고가 활성화될 때는 쿠키·추적·개인정보 수집 없이 문맥 광고를 제공하는 EthicalAds를 우선합니다. Google AdSense를 사용하게 될 경우, Google 요건에 맞는 동의 창을 먼저 표시하며 Google의 개인정보 방침이 적용됩니다. 광고 스크립트가 이 사이트가 하는 유일한 서드파티 요청입니다." },
    ],
    contactHeading: "문의",
    contactBefore: "개인정보 관련 문의: ",
  },
  ja: {
    metaTitle: "プライバシー",
    metaDesc: "TestBench.tools プライバシーポリシー: ブラウザ内で計算、アカウントなし、アップロードサーバーなし。",
    h1: "プライバシー",
    updated: `最終更新: ${PRIVACY_UPDATED}`,
    sections: [
      { heading: "データはあなたの手元に", body: "本サイトのすべての計算機・デコーダ・ファイル変換はブラウザ内で完結します。入力した値や開いたファイルはJavaScriptがローカルで処理し、当方やいかなるサーバーにも送信されません。アップロード先も、アカウントも、データベースもありません — 静的ファイルとして配信されています。" },
      { heading: "ローカルに保存されるもの", body: "localStorageの2項目: ダーク/ライトのテーマ設定と言語の選択。どちらもブラウザ内に留まり、当方は読み取れません。サイト自体はそれ以外のクライアント側ストレージを使用しません。" },
      { heading: "アナリティクス", body: "当方独自のアナリティクスやトラッキングスクリプトは一切運用していません。" },
      { heading: "広告", body: "本サイトは広告で運営されています。広告が有効な場合は、Cookie・トラッキング・個人データ収集なしで文脈広告を配信するEthicalAdsを優先します。Google AdSenseを使用する場合は、Googleの要件に準拠した同意ダイアログを先に表示し、Googleのプライバシーポリシーが適用されます。広告スクリプトが本サイトの行う唯一の第三者リクエストです。" },
    ],
    contactHeading: "お問い合わせ",
    contactBefore: "プライバシーに関するお問い合わせ: ",
  },
  de: {
    metaTitle: "Datenschutz",
    metaDesc: "Datenschutz von TestBench.tools: clientseitige Berechnungen, keine Konten, keine Upload-Server.",
    h1: "Datenschutz",
    updated: `Zuletzt aktualisiert: ${PRIVACY_UPDATED}`,
    sections: [
      { heading: "Ihre Daten bleiben bei Ihnen", body: "Jeder Rechner, Decoder und Dateikonverter auf dieser Seite läuft vollständig in Ihrem Browser. Eingegebene Werte und geöffnete Dateien werden lokal von JavaScript verarbeitet und niemals an uns oder einen Server übertragen. Es gibt keine Upload-Endpunkte, keine Konten und keine Datenbanken — die Seite wird als statische Dateien ausgeliefert." },
      { heading: "Was lokal gespeichert wird", body: "Zwei localStorage-Einträge: Ihre Hell/Dunkel-Themenwahl und Ihre Sprachwahl. Beide bleiben in Ihrem Browser und sind für uns nicht lesbar. Weitere clientseitige Speicherung nutzt die Seite selbst nicht." },
      { heading: "Analyse", body: "Wir betreiben keine eigene Analyse und keine Tracking-Skripte." },
      { heading: "Werbung", body: "Die Seite ist werbefinanziert. Bei aktiver Werbung bevorzugen wir EthicalAds, ein Netzwerk, das kontextbezogene Anzeigen ohne Cookies, Tracking oder Erhebung personenbezogener Daten ausliefert. Falls Google-AdSense-Einheiten aktiviert werden, erscheint zuerst ein Google-konformer Einwilligungsdialog, und Googles eigene Datenschutzerklärung gilt. Werbeskripte sind die einzigen Drittanbieter-Anfragen dieser Seite." },
    ],
    contactHeading: "Kontakt",
    contactBefore: "Datenschutzfragen: ",
  },
  zh: {
    metaTitle: "隐私",
    metaDesc: "TestBench.tools 隐私政策：本地计算、无账号、无上传服务器。",
    h1: "隐私",
    updated: `最后更新：${PRIVACY_UPDATED}`,
    sections: [
      { heading: "数据始终在你手中", body: "本站的每一个计算器、解码器和文件转换器都完全在你的浏览器中运行。你输入的值和打开的文件由 JavaScript 在本地处理，绝不会传输给我们或任何服务器。本站没有上传端点、没有账号、没有数据库 —— 以静态文件形式提供。" },
      { heading: "本地存储的内容", body: "两项 localStorage：你的深/浅色主题偏好和语言选择。二者都保留在你的浏览器中，我们无法读取。站点本身不使用其他任何客户端存储。" },
      { heading: "分析统计", body: "我们不运行任何自有的分析或跟踪脚本。" },
      { heading: "广告", body: "本站依靠广告维持。启用广告时，我们优先选择 EthicalAds —— 一个不使用 Cookie、不跟踪、不收集个人数据的上下文广告网络。若启用 Google AdSense，会先显示符合 Google 要求的同意对话框，并适用 Google 自身的隐私政策。广告脚本是本站唯一的第三方请求。" },
    ],
    contactHeading: "联系",
    contactBefore: "隐私相关问题：",
  },
};

export interface AppsStrings {
  metaTitle: string;
  metaDesc: string;
  h1: string;
  intro: string;
  comingSoon: string;
  download: string;
  sourceLabel: string;
  freeSuffix: string;
  footerNote: string;
}

export const APPS_PAGE: Record<SiteLocale, AppsStrings> = {
  en: {
    metaTitle: "Desktop Apps — free companions for heavier workloads",
    metaDesc: "Free desktop applications from TestBench.tools: batch TDMS conversion and frame-level serial work, for jobs too heavy for a browser tab.",
    h1: "Desktop Apps",
    intro: "The web tools on this site handle everyday conversions instantly. For heavier, offline workloads — multi-gigabyte files, batch jobs, live serial ports — these free desktop companions take over.",
    comingSoon: "Coming soon",
    download: "Download",
    sourceLabel: "View source on GitHub",
    freeSuffix: "· free",
    footerNote: "Every app here is free, like everything else on this site. New releases are announced on this page.",
  },
  ko: {
    metaTitle: "데스크톱 앱 — 무거운 작업을 위한 무료 동반 앱",
    metaDesc: "TestBench.tools의 무료 데스크톱 앱: TDMS 일괄 변환, 프레임 단위 시리얼 작업 등 브라우저 탭에 버거운 작업을 위한 앱.",
    h1: "데스크톱 앱",
    intro: "이 사이트의 웹 툴은 일상적인 변환을 즉시 처리합니다. 수 기가바이트 파일, 일괄 작업, 실시간 시리얼 포트처럼 더 무겁고 오프라인이 필요한 작업은 이 무료 데스크톱 앱이 맡습니다.",
    comingSoon: "출시 예정",
    download: "다운로드",
    sourceLabel: "GitHub에서 소스 보기",
    freeSuffix: "· 무료",
    footerNote: "여기 있는 앱은 이 사이트의 모든 것과 마찬가지로 무료입니다. 새 릴리스는 이 페이지에서 안내합니다.",
  },
  ja: {
    metaTitle: "デスクトップアプリ — 重い作業向けの無料コンパニオン",
    metaDesc: "TestBench.toolsの無料デスクトップアプリ: TDMS一括変換やフレームレベルのシリアル作業など、ブラウザタブには重すぎる作業向け。",
    h1: "デスクトップアプリ",
    intro: "本サイトのウェブツールは日常的な変換を即座に処理します。数ギガバイトのファイル、バッチ処理、リアルタイムのシリアルポートといった重くオフラインが必要な作業は、この無料デスクトップアプリが引き受けます。",
    comingSoon: "近日公開",
    download: "ダウンロード",
    sourceLabel: "GitHubでソースを見る",
    freeSuffix: "· 無料",
    footerNote: "ここにあるアプリは、本サイトのすべてと同じく無料です。新しいリリースはこのページでお知らせします。",
  },
  de: {
    metaTitle: "Desktop-Apps — kostenlose Begleiter für größere Aufgaben",
    metaDesc: "Kostenlose Desktop-Apps von TestBench.tools: TDMS-Stapelkonvertierung und Serienarbeit auf Frame-Ebene, für Aufgaben zu groß für einen Browser-Tab.",
    h1: "Desktop-Apps",
    intro: "Die Web-Tools dieser Seite erledigen alltägliche Konvertierungen sofort. Für größere, Offline-Aufgaben — Multi-Gigabyte-Dateien, Batch-Jobs, Live-Schnittstellen — übernehmen diese kostenlosen Desktop-Begleiter.",
    comingSoon: "Demnächst",
    download: "Herunterladen",
    sourceLabel: "Quellcode auf GitHub",
    freeSuffix: "· kostenlos",
    footerNote: "Jede App hier ist kostenlos, wie alles auf dieser Seite. Neue Versionen werden auf dieser Seite angekündigt.",
  },
  zh: {
    metaTitle: "桌面应用 —— 面向大工作量的免费伴侣",
    metaDesc: "TestBench.tools 的免费桌面应用：TDMS 批量转换与帧级串口调试，处理浏览器标签页难以胜任的任务。",
    h1: "桌面应用",
    intro: "本站的网页工具可即时完成日常转换。对于更重、需要离线的工作 —— 数 GB 文件、批量任务、实时串口 —— 交给这些免费的桌面伴侣。",
    comingSoon: "即将推出",
    download: "下载",
    sourceLabel: "在 GitHub 查看源码",
    freeSuffix: "· 免费",
    footerNote: "这里的应用都免费，一如本站的一切。新版本会在本页公布。",
  },
};

export interface AppDetailStrings {
  breadcrumb: string;
  comingSoonPrefix: string;
  downloadPrefix: string;
  downloadSuffix: string;
  plannedScope: string;
  whatItDoes: string;
  needNow: string;
  apps: Record<string, { tagline: string; features: string[]; counterpartLabel: string }>;
}

export const APP_DETAIL: Record<SiteLocale, AppDetailStrings> = {
  en: {
    breadcrumb: "Desktop Apps",
    comingSoonPrefix: "Coming soon — ",
    downloadPrefix: "Download for ",
    downloadSuffix: " — free",
    plannedScope: "Planned scope",
    whatItDoes: "What it does",
    needNow: "Need it right now, in the browser? ",
    apps: {
      "tdms-converter": {
        tagline: "Open, inspect and convert NI TDMS measurement files on your desktop.",
        features: [
          "Browse groups, channels and the properties attached at every level",
          "Export CSV, or CSV that keeps the properties a plain export discards",
          "Streams segment by segment, so files larger than memory still open",
          "Reads a file killed mid-write, keeping everything before the broken tail",
          "Runs fully offline; five UI languages",
        ],
        counterpartLabel: "TDMS to CSV web tool",
      },
      frameterm: {
        tagline: "A serial terminal built for frame-level protocol work.",
        features: [
          "Hex-first send/receive view for binary protocols",
          "Frame delimiting and timestamping",
          "CRC checking on received frames",
          "Runs fully offline on your bench PC",
        ],
        counterpartLabel: "Modbus Frame Decoder web tool",
      },
      "modbus-workbench": {
        tagline: "A Modbus RTU/TCP master for polling, writing and diagnosing devices.",
        features: [
          "Poll FC01–04 on several tabs at once, each with its own interval",
          "Write FC05/06/15/16, prefilled straight from the grid",
          "Traffic log of raw TX/RX frames with timestamps, savable as .txt",
          "Built-in slave simulator — test with no hardware attached",
          "Runs fully offline; five UI languages",
        ],
        counterpartLabel: "Modbus Frame Decoder web tool",
      },
    },
  },
  ko: {
    breadcrumb: "데스크톱 앱",
    comingSoonPrefix: "출시 예정 — ",
    downloadPrefix: "다운로드: ",
    downloadSuffix: " — 무료",
    plannedScope: "계획된 범위",
    whatItDoes: "기능",
    needNow: "지금 브라우저에서 바로 필요하신가요? ",
    apps: {
      "tdms-converter": {
        tagline: "NI TDMS 측정 파일을 데스크톱에서 열고 살펴보고 변환.",
        features: [
          "그룹·채널과 각 계층에 붙은 속성을 트리로 탐색",
          "CSV 내보내기, 그리고 일반 CSV가 버리는 속성을 보존하는 변형",
          "세그먼트 단위 스트리밍 — 메모리보다 큰 파일도 열림",
          "쓰기 도중 종료된 파일도 손상된 꼬리 앞까지 읽어냄",
          "완전 오프라인 실행, UI 5개 언어",
        ],
        counterpartLabel: "TDMS to CSV 웹 툴",
      },
      frameterm: {
        tagline: "프레임 단위 프로토콜 작업을 위한 시리얼 터미널.",
        features: [
          "바이너리 프로토콜용 HEX 우선 송수신 뷰",
          "프레임 구분과 타임스탬프",
          "수신 프레임 CRC 검사",
          "벤치 PC에서 완전 오프라인 실행",
        ],
        counterpartLabel: "Modbus Frame Decoder 웹 툴",
      },
      "modbus-workbench": {
        tagline: "장비 폴링·쓰기·진단을 위한 Modbus RTU/TCP 마스터.",
        features: [
          "FC01~04를 여러 탭에서 동시 폴링, 탭마다 독립 주기",
          "FC05/06/15/16 쓰기 — 그리드에서 바로 프리필",
          "타임스탬프가 붙은 raw TX/RX 프레임 트래픽 로그, .txt 저장",
          "내장 슬레이브 시뮬레이터 — 장비 없이 테스트",
          "완전 오프라인 실행, UI 5개 언어 지원",
        ],
        counterpartLabel: "Modbus Frame Decoder 웹 툴",
      },
    },
  },
  ja: {
    breadcrumb: "デスクトップアプリ",
    comingSoonPrefix: "近日公開 — ",
    downloadPrefix: "ダウンロード: ",
    downloadSuffix: " — 無料",
    plannedScope: "予定している範囲",
    whatItDoes: "できること",
    needNow: "今すぐブラウザで使いたいですか？ ",
    apps: {
      "tdms-converter": {
        tagline: "NI TDMS計測ファイルをデスクトップで一括CSV変換。",
        features: [
          "複数のTDMSファイルを一度に変換（フォルダ一括）",
          "ブラウザのメモリ上限を超える大きなファイルにも対応",
          "チャンネル選択とCSV列レイアウトのオプション",
          "完全オフライン実行 — 計測データは端末外に出ません",
        ],
        counterpartLabel: "TDMS to CSV ウェブツール",
      },
      frameterm: {
        tagline: "フレームレベルのプロトコル作業向けシリアルターミナル。",
        features: [
          "バイナリプロトコル向けのHEX優先の送受信ビュー",
          "フレーム区切りとタイムスタンプ",
          "受信フレームのCRCチェック",
          "ベンチPCで完全オフライン実行",
        ],
        counterpartLabel: "Modbus Frame Decoder ウェブツール",
      },
      "modbus-workbench": {
        tagline: "機器のポーリング・書き込み・診断のための Modbus RTU/TCP マスター。",
        features: [
          "FC01〜04 を複数タブで同時ポーリング、タブごとに独立した周期",
          "FC05/06/15/16 の書き込み — グリッドから直接プリフィル",
          "タイムスタンプ付き raw TX/RX フレームの通信ログ、.txt 保存",
          "内蔵スレーブシミュレータ — 実機なしでテスト",
          "完全オフライン動作、UI は 5 言語",
        ],
        counterpartLabel: "Modbus Frame Decoder ウェブツール",
      },
    },
  },
  de: {
    breadcrumb: "Desktop-Apps",
    comingSoonPrefix: "Demnächst — ",
    downloadPrefix: "Herunterladen für ",
    downloadSuffix: " — kostenlos",
    plannedScope: "Geplanter Umfang",
    whatItDoes: "Was es tut",
    needNow: "Sofort im Browser gebraucht? ",
    apps: {
      "tdms-converter": {
        tagline: "NI-TDMS-Messdateien am Desktop stapelweise nach CSV konvertieren.",
        features: [
          "Viele TDMS-Dateien in einem Lauf konvertieren (Ordner-Batch)",
          "Verarbeitet Dateien größer als der Browser-Speicher erlaubt",
          "Kanalauswahl und CSV-Spaltenlayout-Optionen",
          "Läuft komplett offline — Messdaten verlassen das Gerät nie",
        ],
        counterpartLabel: "TDMS-zu-CSV Web-Tool",
      },
      frameterm: {
        tagline: "Ein serielles Terminal für Protokollarbeit auf Frame-Ebene.",
        features: [
          "Hex-orientierte Sende-/Empfangsansicht für Binärprotokolle",
          "Frame-Abgrenzung und Zeitstempel",
          "CRC-Prüfung empfangener Frames",
          "Läuft komplett offline auf Ihrem Bench-PC",
        ],
        counterpartLabel: "Modbus-Frame-Decoder Web-Tool",
      },
      "modbus-workbench": {
        tagline: "Ein Modbus-RTU/TCP-Master zum Abfragen, Schreiben und Diagnostizieren von Geräten.",
        features: [
          "FC01–04 in mehreren Registerkarten gleichzeitig, jede mit eigenem Intervall",
          "FC05/06/15/16 schreiben, direkt aus dem Grid vorausgefüllt",
          "Datenverkehr als rohe TX/RX-Frames mit Zeitstempel, als .txt speicherbar",
          "Interner Slave-Simulator — Testen ohne angeschlossene Hardware",
          "Läuft vollständig offline; fünf Oberflächensprachen",
        ],
        counterpartLabel: "Modbus-Frame-Decoder Web-Tool",
      },
    },
  },
  zh: {
    breadcrumb: "桌面应用",
    comingSoonPrefix: "即将推出 —— ",
    downloadPrefix: "下载（",
    downloadSuffix: "）—— 免费",
    plannedScope: "计划范围",
    whatItDoes: "功能",
    needNow: "现在就想在浏览器里用？ ",
    apps: {
      "tdms-converter": {
        tagline: "在桌面批量将 NI TDMS 测量文件转换为 CSV。",
        features: [
          "一次转换多个 TDMS 文件（文件夹批处理）",
          "可处理超出浏览器内存的大文件",
          "通道选择与 CSV 列布局选项",
          "完全离线运行 —— 测量数据绝不离开本机",
        ],
        counterpartLabel: "TDMS to CSV 网页工具",
      },
      frameterm: {
        tagline: "为帧级协议调试打造的串口终端。",
        features: [
          "面向二进制协议的十六进制优先收发视图",
          "帧分隔与时间戳",
          "接收帧的 CRC 校验",
          "在你的工作台 PC 上完全离线运行",
        ],
        counterpartLabel: "Modbus 报文解码 网页工具",
      },
      "modbus-workbench": {
        tagline: "用于轮询、写入与诊断设备的 Modbus RTU/TCP 主站。",
        features: [
          "FC01–04 多标签同时轮询，每个标签独立周期",
          "写入 FC05/06/15/16，可从表格直接预填",
          "带时间戳的 TX/RX 原始报文日志，可保存为 .txt",
          "内置从站模拟器 —— 无需硬件即可测试",
          "完全离线运行；界面支持五种语言",
        ],
        counterpartLabel: "Modbus 报文解码 网页工具",
      },
    },
  },
};

/** Paths that exist per locale (besides en, which has everything). */
export function localizedPath(locale: SiteLocale, basePath: string, koPaths: Set<string>): string {
  if (locale === "en") return basePath;
  if (locale === "ko" && (basePath === "/" || koPaths.has(basePath))) {
    return basePath === "/" ? "/ko/" : `/ko${basePath}`;
  }
  return LOCALE_PREFIX[locale];
}
