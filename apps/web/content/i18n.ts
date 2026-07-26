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
    badge: "무료 · 100% 브라우저 내",
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
      "41 free tools for test & measurement, embedded and industrial engineers — CRC, Modbus frames, PLC scaling, sensor math, file converters. No sign-up, nothing leaves your browser.",
    searchPlaceholder: "Search 41 tools — try “crc”, “modbus”, “pt100”…",
    popular: "Popular:",
    stats: "100% free · 41 tools · 8 categories · in-browser",
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
    title: "엔지니어의 계산, 브라우저에서 바로 끝",
    subtitle:
      "계측·임베디드·산업자동화 엔지니어용 무료 툴 41종 — CRC, Modbus 프레임, PLC 스케일링, 센서 계산, 파일 변환. 가입 없이, 데이터는 브라우저 밖으로 나가지 않습니다.",
    searchPlaceholder: "41개 툴 검색 — “crc”, “modbus”, “pt100”…",
    popular: "인기:",
    stats: "100% 무료 · 툴 41종 · 8개 카테고리 · 브라우저 내 계산",
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
      "計測・組み込み・産業オートメーションエンジニアのための無料ツール41種 — CRC、Modbusフレーム、PLCスケーリング、センサー計算、ファイル変換。登録不要、データはブラウザの外に出ません。",
    searchPlaceholder: "41個のツールを検索 — 「crc」「modbus」「pt100」…",
    popular: "人気:",
    stats: "100%無料 · ツール41種 · 8カテゴリ · ブラウザ内",
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
      "41 kostenlose Tools für Mess-, Embedded- und Automatisierungstechnik — CRC, Modbus-Frames, SPS-Skalierung, Sensor-Mathematik, Dateikonverter. Ohne Anmeldung, nichts verlässt Ihren Browser.",
    searchPlaceholder: "41 Tools durchsuchen — z. B. „crc“, „modbus“, „pt100“ …",
    popular: "Beliebt:",
    stats: "100 % kostenlos · 41 Tools · 8 Kategorien · im Browser",
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
      "面向测试测量、嵌入式与工业自动化工程师的 41 个免费工具 — CRC、Modbus 报文、PLC 换算、传感器计算、文件转换。无需注册，数据不离开浏览器。",
    searchPlaceholder: "搜索 41 个工具 — 试试 “crc”、“modbus”、“pt100”…",
    popular: "热门:",
    stats: "100% 免费 · 41 个工具 · 8 个分类 · 浏览器本地",
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
    "file-tools": "File Tools",
  },
  ko: {
    "checksum-crc": "체크섬 & CRC",
    "protocol-decoders": "프로토콜 디코더",
    "data-converters": "데이터 변환",
    "plc-industrial": "PLC & 산업",
    "sensor-signal": "센서 & 신호",
    "embedded-mcu": "임베디드 & MCU",
    "file-tools": "파일 툴",
  },
  ja: {
    "checksum-crc": "チェックサム & CRC",
    "protocol-decoders": "プロトコルデコーダ",
    "data-converters": "データ変換",
    "plc-industrial": "PLC & 産業",
    "sensor-signal": "センサー & 信号",
    "embedded-mcu": "組み込み & MCU",
    "file-tools": "ファイルツール",
  },
  de: {
    "checksum-crc": "Prüfsummen & CRC",
    "protocol-decoders": "Protokoll-Decoder",
    "data-converters": "Datenkonverter",
    "plc-industrial": "SPS & Industrie",
    "sensor-signal": "Sensorik & Signal",
    "embedded-mcu": "Embedded & MCU",
    "file-tools": "Datei-Tools",
  },
  zh: {
    "checksum-crc": "校验和 & CRC",
    "protocol-decoders": "协议解码",
    "data-converters": "数据转换",
    "plc-industrial": "PLC & 工业",
    "sensor-signal": "传感器 & 信号",
    "embedded-mcu": "嵌入式 & MCU",
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
    "tdms-converter": "Batch-convert NI TDMS measurement files to CSV on your desktop.",
    frameterm: "Serial terminal built for frame-level protocol work.",
  },
  ko: {
    "tdms-converter": "NI TDMS 측정 파일을 데스크톱에서 일괄 CSV 변환.",
    frameterm: "프레임 단위 프로토콜 작업용 시리얼 터미널.",
  },
  ja: {
    "tdms-converter": "NI TDMS計測ファイルをデスクトップで一括CSV変換。",
    frameterm: "フレームレベルのプロトコル作業向けシリアルターミナル。",
  },
  de: {
    "tdms-converter": "NI-TDMS-Messdateien am Desktop stapelweise nach CSV konvertieren.",
    frameterm: "Serielles Terminal für Protokollarbeit auf Frame-Ebene.",
  },
  zh: {
    "tdms-converter": "在桌面批量将 NI TDMS 测量文件转换为 CSV。",
    frameterm: "面向帧级协议调试的串口终端。",
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
