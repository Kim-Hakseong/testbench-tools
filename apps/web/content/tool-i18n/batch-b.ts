// Batch b tool strings. Keys are the English source text exactly as it appears
// at the call site; a missing key falls back to that English text.
//
// A key may carry {placeholders}; the call site fills them with String.replace
// so translations can put the numbers where the language needs them.

import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

export const BATCH_B: Record<SiteLocale, ToolDict> = {
  en: {},

  ko: {
    // 엔디안 변환기
    "Value (hex bytes)": "값 (16진 바이트)",
    bytes: "바이트",
    "Byte-reversed (full endianness flip)": "바이트 역순 (엔디안 완전 반전)",
    "Byte swap within 16-bit words (AB CD → BA DC)": "16비트 워드 내 바이트 스왑 (AB CD → BA DC)",
    "16-bit word swap within 32-bit (AB CD EF GH → EF GH AB CD)":
      "32비트 내 16비트 워드 스왑 (AB CD EF GH → EF GH AB CD)",
    Original: "원본",

    // float32 ↔ 레지스터
    "Float → Registers": "Float → 레지스터",
    "Registers → Float": "레지스터 → Float",
    "Float value": "Float 값",
    "Enter a decimal number.": "10진수를 입력하세요.",
    "stored float32": "저장된 float32",
    "(nearest representable)": "(표현 가능한 최근접값)",
    "Two 16-bit registers (hex)": "16비트 레지스터 2개 (16진)",
    "Enter two hex words, e.g. “4049 0FDB”.": "16진 워드 2개를 입력하세요. 예: “4049 0FDB”.",
    "big-endian (high word first)": "빅엔디안 (상위 워드 먼저)",
    "word-swapped": "워드 스왑",
    "byte-swapped within words": "워드 내 바이트 스왑",
    "little-endian": "리틀엔디안",

    // 4–20 mA 스케일링
    "OPEN LOOP — check wiring / transmitter": "루프 단선 — 배선/트랜스미터 확인",
    "Under-range (3.8–4 mA)": "언더레인지 (3.8–4 mA)",
    "In range": "정상 범위",
    "Over-range (> 20.5 mA)": "오버레인지 (> 20.5 mA)",
    "mA → Value": "mA → 값",
    "Value → mA": "값 → mA",
    "Loop current (mA)": "루프 전류 (mA)",
    "Process value": "공정값",
    unit: "단위",
    "Range low (= 4 mA)": "레인지 하한 (= 4 mA)",
    "Range high (= 20 mA)": "레인지 상한 (= 20 mA)",
    "Unit label": "단위 표기",
    "Fix the highlighted inputs to see results.": "표시된 입력을 수정하면 결과가 표시됩니다.",
    "Loop current": "루프 전류",

    // Hex ↔ ASCII, 공용 입력 컨트롤
    "Hex bytes": "16진 바이트",
    "ASCII text": "ASCII 텍스트",
    "Invalid character “{char}” at position {index}": "잘못된 문자 “{char}” — 위치 {index}",
    "Non-printable bytes are shown as “.”": "출력 불가 바이트는 “.” 으로 표시됩니다",
    "Input mode": "입력 모드",

    // HEX / SREC / BIN 변환기
    Line: "행",
    "Paste Intel HEX / S-Record text — or load a file":
      "Intel HEX / S-Record 텍스트 붙여넣기 — 또는 파일 열기",
    "Open file…": "파일 열기…",
    Segment: "세그먼트",
    Start: "시작",
    End: "끝",
    "Download .bin": ".bin 내려받기",
    "base address": "시작 주소",
    "entry point": "엔트리",
    "gaps filled with 0xFF": "빈 구간은 0xFF로 채움",
    "Binary file": "바이너리 파일",
    "Choose .bin file…": ".bin 파일 선택…",
    "Base address (hex)": "시작 주소 (16진)",
    "Download .hex": ".hex 내려받기",
    "Download .srec": ".srec 내려받기",
    "Your file never leaves your browser.": "파일은 브라우저 밖으로 나가지 않습니다.",

    // Hex 뷰어
    "Drop any file here": "여기에 파일을 드롭하세요",
    or: "또는",
    "Choose file": "파일 선택",
    "showing {n}": "{n} 표시 중",
    "Load next 16 KB": "다음 16 KB 불러오기",
    "{n} bytes remaining": "{n} 바이트 남음",

    // I²C 풀업 저항
    "Bus capacitance (pF)": "버스 정전용량 (pF)",
    "Valid pull-up range": "유효 풀업 저항 범위",
    "Suggested (geometric mid, nearest E24)": "권장값 (기하 중앙, 가장 가까운 E24)",
    "R min (sink current limit)": "R min (싱크 전류 한계)",
    "R max (rise time limit)": "R max (상승 시간 한계)",
    "No valid resistor: rise-time limit ({rmax}) is below the sink-current limit ({rmin}). Reduce bus capacitance, lower the speed mode, or use a bus accelerator.":
      "유효한 저항값 없음: 상승 시간 한계 ({rmax})가 싱크 전류 한계 ({rmin})보다 작습니다. 버스 정전용량을 줄이거나, 속도 모드를 낮추거나, 버스 액셀러레이터를 사용하세요.",

    // 4–20 mA 루프 전압 배분
    "Loop supply (V)": "루프 공급 전압 (V)",
    "Transmitter min V (datasheet)": "트랜스미터 최소 전압 (데이터시트)",
    "Sense resistor (Ω)": "센스 저항 (Ω)",
    "Wire resistance (Ω)": "배선 저항 (Ω)",
    "Other series drops as resistance (Ω) — barriers, indicators":
      "기타 직렬 전압 강하의 저항 환산 (Ω) — 안전 배리어, 지시계",
    "evaluated at 20 mA full scale": "20 mA 풀스케일 기준",
    "OK — {margin} V margin at full scale": "정상 — 풀스케일에서 여유 {margin} V",
    "INSUFFICIENT — {short} V short at full scale": "전압 부족 — 풀스케일에서 {short} V 모자람",
    "Voltage at transmitter @ 20 mA": "20 mA에서 트랜스미터 전압",
    "Drop across loop resistance": "루프 저항 전압 강하",
    "Max loop resistance for this budget": "이 조건의 최대 루프 저항",

    // 진법 변환기
    "Invalid digit for base {base} at position {index}": "{base}진수에 없는 숫자 — 위치 {index}",
  },

  ja: {
    "Value (hex bytes)": "値 (16進バイト)",
    bytes: "バイト",
    "Byte-reversed (full endianness flip)": "バイト逆順 (エンディアン完全反転)",
    "Byte swap within 16-bit words (AB CD → BA DC)": "16ビットワード内バイトスワップ (AB CD → BA DC)",
    "16-bit word swap within 32-bit (AB CD EF GH → EF GH AB CD)":
      "32ビット内の16ビットワードスワップ (AB CD EF GH → EF GH AB CD)",
    Original: "元の値",

    "Float → Registers": "Float → レジスタ",
    "Registers → Float": "レジスタ → Float",
    "Float value": "Float 値",
    "Enter a decimal number.": "10進数を入力してください。",
    "stored float32": "格納された float32",
    "(nearest representable)": "(表現可能な最近値)",
    "Two 16-bit registers (hex)": "16ビットレジスタ 2 個 (16進)",
    "Enter two hex words, e.g. “4049 0FDB”.": "16進ワードを 2 個入力してください。例: “4049 0FDB”",
    "big-endian (high word first)": "ビッグエンディアン (上位ワード先)",
    "word-swapped": "ワードスワップ",
    "byte-swapped within words": "ワード内バイトスワップ",
    "little-endian": "リトルエンディアン",

    "OPEN LOOP — check wiring / transmitter": "ループ断線 — 配線/伝送器を確認",
    "Under-range (3.8–4 mA)": "アンダーレンジ (3.8–4 mA)",
    "In range": "正常範囲",
    "Over-range (> 20.5 mA)": "オーバーレンジ (> 20.5 mA)",
    "mA → Value": "mA → 値",
    "Value → mA": "値 → mA",
    "Loop current (mA)": "ループ電流 (mA)",
    "Process value": "プロセス値",
    unit: "単位",
    "Range low (= 4 mA)": "レンジ下限 (= 4 mA)",
    "Range high (= 20 mA)": "レンジ上限 (= 20 mA)",
    "Unit label": "単位ラベル",
    "Fix the highlighted inputs to see results.": "強調された入力を修正すると結果が表示されます。",
    "Loop current": "ループ電流",

    "Hex bytes": "16進バイト",
    "ASCII text": "ASCII テキスト",
    "Invalid character “{char}” at position {index}": "不正な文字 “{char}” — 位置 {index}",
    "Non-printable bytes are shown as “.”": "表示できないバイトは “.” で表示されます",
    "Input mode": "入力モード",

    Line: "行",
    "Paste Intel HEX / S-Record text — or load a file":
      "Intel HEX / S-Record テキストを貼り付け — またはファイルを読み込み",
    "Open file…": "ファイルを開く…",
    Segment: "セグメント",
    Start: "開始",
    End: "終了",
    "Download .bin": ".bin をダウンロード",
    "base address": "ベースアドレス",
    "entry point": "エントリ",
    "gaps filled with 0xFF": "空き領域は 0xFF で埋める",
    "Binary file": "バイナリファイル",
    "Choose .bin file…": ".bin ファイルを選択…",
    "Base address (hex)": "ベースアドレス (16進)",
    "Download .hex": ".hex をダウンロード",
    "Download .srec": ".srec をダウンロード",
    "Your file never leaves your browser.": "ファイルがブラウザーの外に出ることはありません。",

    "Drop any file here": "ここにファイルをドロップ",
    or: "または",
    "Choose file": "ファイルを選択",
    "showing {n}": "{n} を表示中",
    "Load next 16 KB": "次の 16 KB を読み込む",
    "{n} bytes remaining": "残り {n} バイト",

    "Bus capacitance (pF)": "バス容量 (pF)",
    "Valid pull-up range": "有効なプルアップ範囲",
    "Suggested (geometric mid, nearest E24)": "推奨値 (幾何中央・最寄り E24)",
    "R min (sink current limit)": "R min (シンク電流の制限)",
    "R max (rise time limit)": "R max (立ち上がり時間の制限)",
    "No valid resistor: rise-time limit ({rmax}) is below the sink-current limit ({rmin}). Reduce bus capacitance, lower the speed mode, or use a bus accelerator.":
      "有効な抵抗値がありません: 立ち上がり時間の上限 ({rmax}) がシンク電流の下限 ({rmin}) を下回っています。バス容量を減らす、速度モードを下げる、またはバスアクセラレータを使用してください。",

    "Loop supply (V)": "ループ電源 (V)",
    "Transmitter min V (datasheet)": "伝送器の最小電圧 (データシート)",
    "Sense resistor (Ω)": "センス抵抗 (Ω)",
    "Wire resistance (Ω)": "配線抵抗 (Ω)",
    "Other series drops as resistance (Ω) — barriers, indicators":
      "その他の直列電圧降下を抵抗換算 (Ω) — バリア・指示計",
    "evaluated at 20 mA full scale": "20 mA フルスケールで評価",
    "OK — {margin} V margin at full scale": "OK — フルスケールで余裕 {margin} V",
    "INSUFFICIENT — {short} V short at full scale": "電圧不足 — フルスケールで {short} V 不足",
    "Voltage at transmitter @ 20 mA": "20 mA 時の伝送器電圧",
    "Drop across loop resistance": "ループ抵抗での電圧降下",
    "Max loop resistance for this budget": "この条件での最大ループ抵抗",

    "Invalid digit for base {base} at position {index}": "{base} 進数に使えない文字 — 位置 {index}",
  },

  de: {
    "Value (hex bytes)": "Wert (Hex-Bytes)",
    bytes: "Bytes",
    "Byte-reversed (full endianness flip)": "Bytes umgekehrt (voller Endian-Wechsel)",
    "Byte swap within 16-bit words (AB CD → BA DC)": "Byte-Tausch im 16-Bit-Wort (AB CD → BA DC)",
    "16-bit word swap within 32-bit (AB CD EF GH → EF GH AB CD)":
      "16-Bit-Wort-Tausch in 32 Bit (AB CD EF GH → EF GH AB CD)",
    Original: "Original",

    "Float → Registers": "Float → Register",
    "Registers → Float": "Register → Float",
    "Float value": "Float-Wert",
    "Enter a decimal number.": "Dezimalzahl eingeben.",
    "stored float32": "gespeichertes float32",
    "(nearest representable)": "(nächster darstellbarer Wert)",
    "Two 16-bit registers (hex)": "Zwei 16-Bit-Register (hex)",
    "Enter two hex words, e.g. “4049 0FDB”.": "Zwei Hex-Wörter eingeben, z. B. „4049 0FDB“.",
    "big-endian (high word first)": "Big-Endian (High-Word zuerst)",
    "word-swapped": "Wörter getauscht",
    "byte-swapped within words": "Bytes im Wort getauscht",
    "little-endian": "Little-Endian",

    "OPEN LOOP — check wiring / transmitter": "Schleife offen — Verdrahtung/Messumformer prüfen",
    "Under-range (3.8–4 mA)": "Unterbereich (3,8–4 mA)",
    "In range": "Im Bereich",
    "Over-range (> 20.5 mA)": "Überbereich (> 20,5 mA)",
    "mA → Value": "mA → Wert",
    "Value → mA": "Wert → mA",
    "Loop current (mA)": "Schleifenstrom (mA)",
    "Process value": "Prozesswert",
    unit: "Einheit",
    "Range low (= 4 mA)": "Messanfang (= 4 mA)",
    "Range high (= 20 mA)": "Messende (= 20 mA)",
    "Unit label": "Einheitenbezeichnung",
    "Fix the highlighted inputs to see results.":
      "Korrigieren Sie die markierten Eingaben, um Ergebnisse zu sehen.",
    "Loop current": "Schleifenstrom",

    "Hex bytes": "Hex-Bytes",
    "ASCII text": "ASCII-Text",
    "Invalid character “{char}” at position {index}": "Ungültiges Zeichen „{char}“ an Position {index}",
    "Non-printable bytes are shown as “.”": "Nicht druckbare Bytes werden als „.“ angezeigt",
    "Input mode": "Eingabemodus",

    Line: "Zeile",
    "Paste Intel HEX / S-Record text — or load a file":
      "Intel HEX / S-Record einfügen — oder Datei laden",
    "Open file…": "Datei öffnen…",
    Segment: "Segment",
    Start: "Start",
    End: "Ende",
    "Download .bin": ".bin herunterladen",
    "base address": "Basisadresse",
    "entry point": "Einsprungadresse",
    "gaps filled with 0xFF": "Lücken mit 0xFF gefüllt",
    "Binary file": "Binärdatei",
    "Choose .bin file…": ".bin-Datei wählen…",
    "Base address (hex)": "Basisadresse (hex)",
    "Download .hex": ".hex herunterladen",
    "Download .srec": ".srec herunterladen",
    "Your file never leaves your browser.": "Ihre Datei verlässt den Browser nie.",

    "Drop any file here": "Datei hier ablegen",
    or: "oder",
    "Choose file": "Datei wählen",
    "showing {n}": "{n} angezeigt",
    "Load next 16 KB": "Nächste 16 KB laden",
    "{n} bytes remaining": "noch {n} Bytes",

    "Bus capacitance (pF)": "Buskapazität (pF)",
    "Valid pull-up range": "Gültiger Pull-up-Bereich",
    "Suggested (geometric mid, nearest E24)": "Empfehlung (geometrische Mitte, nächster E24)",
    "R min (sink current limit)": "R min (Grenze Senkenstrom)",
    "R max (rise time limit)": "R max (Grenze Anstiegszeit)",
    "No valid resistor: rise-time limit ({rmax}) is below the sink-current limit ({rmin}). Reduce bus capacitance, lower the speed mode, or use a bus accelerator.":
      "Kein gültiger Widerstand: Die Anstiegszeit-Grenze ({rmax}) liegt unter der Senkenstrom-Grenze ({rmin}). Buskapazität verringern, Geschwindigkeitsmodus senken oder einen Bus-Beschleuniger einsetzen.",

    "Loop supply (V)": "Schleifenspeisung (V)",
    "Transmitter min V (datasheet)": "Mindestspannung Messumformer (Datenblatt)",
    "Sense resistor (Ω)": "Messwiderstand (Ω)",
    "Wire resistance (Ω)": "Leitungswiderstand (Ω)",
    "Other series drops as resistance (Ω) — barriers, indicators":
      "Weitere Serienabfälle als Widerstand (Ω) — Barrieren, Anzeiger",
    "evaluated at 20 mA full scale": "bewertet bei 20 mA Vollausschlag",
    "OK — {margin} V margin at full scale": "OK — {margin} V Reserve bei Vollausschlag",
    "INSUFFICIENT — {short} V short at full scale":
      "UNZUREICHEND — {short} V zu wenig bei Vollausschlag",
    "Voltage at transmitter @ 20 mA": "Spannung am Messumformer bei 20 mA",
    "Drop across loop resistance": "Abfall am Schleifenwiderstand",
    "Max loop resistance for this budget": "Max. Schleifenwiderstand für dieses Budget",

    "Invalid digit for base {base} at position {index}":
      "Ungültige Ziffer für Basis {base} an Position {index}",
  },

  zh: {
    "Value (hex bytes)": "值 (十六进制字节)",
    bytes: "字节",
    "Byte-reversed (full endianness flip)": "字节倒序 (完全端序翻转)",
    "Byte swap within 16-bit words (AB CD → BA DC)": "16 位字内字节交换 (AB CD → BA DC)",
    "16-bit word swap within 32-bit (AB CD EF GH → EF GH AB CD)":
      "32 位内 16 位字交换 (AB CD EF GH → EF GH AB CD)",
    Original: "原始值",

    "Float → Registers": "浮点 → 寄存器",
    "Registers → Float": "寄存器 → 浮点",
    "Float value": "浮点值",
    "Enter a decimal number.": "请输入十进制数。",
    "stored float32": "存储的 float32",
    "(nearest representable)": "(最接近的可表示值)",
    "Two 16-bit registers (hex)": "两个 16 位寄存器 (十六进制)",
    "Enter two hex words, e.g. “4049 0FDB”.": "请输入两个十六进制字，例如 “4049 0FDB”。",
    "big-endian (high word first)": "大端 (高字在前)",
    "word-swapped": "字交换",
    "byte-swapped within words": "字内字节交换",
    "little-endian": "小端",

    "OPEN LOOP — check wiring / transmitter": "回路断路 — 检查接线/变送器",
    "Under-range (3.8–4 mA)": "欠量程 (3.8–4 mA)",
    "In range": "量程内",
    "Over-range (> 20.5 mA)": "超量程 (> 20.5 mA)",
    "mA → Value": "mA → 值",
    "Value → mA": "值 → mA",
    "Loop current (mA)": "回路电流 (mA)",
    "Process value": "过程值",
    unit: "单位",
    "Range low (= 4 mA)": "量程下限 (= 4 mA)",
    "Range high (= 20 mA)": "量程上限 (= 20 mA)",
    "Unit label": "单位标签",
    "Fix the highlighted inputs to see results.": "修正标红的输入后即可看到结果。",
    "Loop current": "回路电流",

    "Hex bytes": "十六进制字节",
    "ASCII text": "ASCII 文本",
    "Invalid character “{char}” at position {index}": "无效字符 “{char}” — 位置 {index}",
    "Non-printable bytes are shown as “.”": "不可打印字节显示为 “.”",
    "Input mode": "输入模式",

    Line: "行",
    "Paste Intel HEX / S-Record text — or load a file":
      "粘贴 Intel HEX / S-Record 文本 — 或载入文件",
    "Open file…": "打开文件…",
    Segment: "段",
    Start: "起始",
    End: "结束",
    "Download .bin": "下载 .bin",
    "base address": "基址",
    "entry point": "入口地址",
    "gaps filled with 0xFF": "空隙以 0xFF 填充",
    "Binary file": "二进制文件",
    "Choose .bin file…": "选择 .bin 文件…",
    "Base address (hex)": "基址 (十六进制)",
    "Download .hex": "下载 .hex",
    "Download .srec": "下载 .srec",
    "Your file never leaves your browser.": "文件不会离开您的浏览器。",

    "Drop any file here": "将文件拖放到此处",
    or: "或",
    "Choose file": "选择文件",
    "showing {n}": "已显示 {n}",
    "Load next 16 KB": "载入下一个 16 KB",
    "{n} bytes remaining": "剩余 {n} 字节",

    "Bus capacitance (pF)": "总线电容 (pF)",
    "Valid pull-up range": "有效上拉阻值范围",
    "Suggested (geometric mid, nearest E24)": "推荐值 (几何中值, 最接近 E24)",
    "R min (sink current limit)": "R min (灌电流限制)",
    "R max (rise time limit)": "R max (上升时间限制)",
    "No valid resistor: rise-time limit ({rmax}) is below the sink-current limit ({rmin}). Reduce bus capacitance, lower the speed mode, or use a bus accelerator.":
      "无有效阻值：上升时间上限 ({rmax}) 低于灌电流下限 ({rmin})。请降低总线电容、降低速度模式，或使用总线加速器。",

    "Loop supply (V)": "回路供电 (V)",
    "Transmitter min V (datasheet)": "变送器最小电压 (数据手册)",
    "Sense resistor (Ω)": "取样电阻 (Ω)",
    "Wire resistance (Ω)": "线路电阻 (Ω)",
    "Other series drops as resistance (Ω) — barriers, indicators":
      "其他串联压降折算电阻 (Ω) — 安全栅、指示仪表",
    "evaluated at 20 mA full scale": "按 20 mA 满量程计算",
    "OK — {margin} V margin at full scale": "正常 — 满量程时余量 {margin} V",
    "INSUFFICIENT — {short} V short at full scale": "电压不足 — 满量程时缺 {short} V",
    "Voltage at transmitter @ 20 mA": "20 mA 时变送器电压",
    "Drop across loop resistance": "回路电阻上的压降",
    "Max loop resistance for this budget": "该电压预算下的最大回路电阻",

    "Invalid digit for base {base} at position {index}": "位置 {index} 处含 {base} 进制无效数字",
  },
};
