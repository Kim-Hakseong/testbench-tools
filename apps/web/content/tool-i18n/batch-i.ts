import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

/**
 * Batch I — PLC timer comparison. Instruction and bit names (TON, TOF, TP,
 * TONR, RTO, RES, .EN, .TT, .DN, .ACC, .PRE, Q, ET, PT, IN) stay as written in
 * the vendor manuals: they are what an engineer types into the editor.
 */
export const BATCH_I: Record<SiteLocale, ToolDict> = {
  en: {},
  ko: {
    "Compare": "비교",
    "On-delay — TON vs TON": "온딜레이 — TON vs TON",
    "Off-delay — TOF vs TOF": "오프딜레이 — TOF vs TOF",
    "Retentive — Siemens TONR vs RTO + RES": "보존형 — Siemens TONR vs RTO + RES",
    "Pulse — IEC TP (no Logix instruction)": "펄스 — IEC TP (Logix에는 없음)",
    "Scan time": "스캔 시간",
    "Duration": "구간",
    "IN / rung toggles at (ms) — starts FALSE": "IN / 렁 조건이 바뀌는 시각 (ms) — FALSE에서 시작",
    "R / RES toggles at (ms) — starts FALSE": "R / RES가 바뀌는 시각 (ms) — FALSE에서 시작",
    "Preset, scan time and duration must be whole milliseconds": "프리셋·스캔 시간·구간은 정수 ms여야 합니다",
    "Preset must be a whole number of milliseconds, 0 or more": "프리셋은 0 이상의 정수 ms여야 합니다",
    "Scan time must be a whole number of milliseconds, 1 or more": "스캔 시간은 1 이상의 정수 ms여야 합니다",
    "Duration must be at least one scan": "구간은 최소 한 스캔 이상이어야 합니다",
    "Too many scans — keep duration ÷ scan time under 20000": "스캔이 너무 많습니다 — 구간 ÷ 스캔 시간을 20000 미만으로 하세요",
    "Toggle times must be 0 ms or later": "전환 시각은 0 ms 이후여야 합니다",
    "Output on — IEC Q: {a} · Logix .DN: {b}": "출력 ON — IEC Q: {a} · Logix .DN: {b}",
    "Output off — IEC Q: {a} · Logix .DN: {b}": "출력 OFF — IEC Q: {a} · Logix .DN: {b}",
    "Logix .ACC reached {acc} ms against a {pre} ms preset — {over} ms past it, because .ACC is not clamped and the scan time does not divide the preset. IEC ET stops at {pre}.":
      "Logix .ACC가 프리셋 {pre} ms를 {over} ms 넘어 {acc} ms까지 갔습니다. .ACC는 프리셋에서 잘리지 않고, 스캔 시간이 프리셋을 나누어떨어지게 하지 않기 때문입니다. IEC ET는 {pre}에서 멈춥니다.",
    "Here the scan time divides the preset, so .ACC lands exactly on {pre}. Change the scan time to see the overshoot.":
      "지금은 스캔 시간이 프리셋을 나누어떨어지게 해서 .ACC가 정확히 {pre}에 멈춥니다. 스캔 시간을 바꾸면 초과분이 보입니다.",
    "At power-up the Logix TOF reads .ACC = {acc} with .DN FALSE — the prescan leaves it in the expired state. The IEC TOF starts with Q FALSE and ET 0 until IN has been TRUE once.":
      "기동 직후 Logix TOF는 .ACC = {acc}, .DN FALSE입니다 — 프리스캔이 이미 끝난 상태로 둡니다. IEC TOF는 IN이 한 번 TRUE가 되기 전까지 Q FALSE, ET 0으로 시작합니다.",
    "Logix 5000 has no pulse timer: the timers in its instruction reference are TON, TOF and RTO (plus TONR, TOFR and RTOR in function blocks). The IEC TP keeps Q TRUE for the full PT whatever IN does.":
      "Logix 5000에는 펄스 타이머가 없습니다. 명령어 레퍼런스의 타이머는 TON, TOF, RTO(펑션 블록용 TONR, TOFR, RTOR)뿐입니다. IEC TP는 IN이 어떻게 바뀌든 PT 동안 Q를 TRUE로 유지합니다.",
    "Pulses started at: {a}": "펄스 시작: {a}",
    "Siemens TONR (IEC-style, S7-1200)": "Siemens TONR (IEC 방식, S7-1200)",
    "IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)": "IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)",
    "Allen-Bradley Logix 5000 {ins}": "Allen-Bradley Logix 5000 {ins}",
    "Each instruction runs once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "각 명령은 스캔마다 한 번 실행되고, 입력은 스캔 시작에 읽습니다. 전환 시각은 그 시각이거나 그 뒤의 첫 스캔에 반영됩니다.",
  },
  ja: {
    "Compare": "比較",
    "On-delay — TON vs TON": "オンディレイ — TON vs TON",
    "Off-delay — TOF vs TOF": "オフディレイ — TOF vs TOF",
    "Retentive — Siemens TONR vs RTO + RES": "積算 — Siemens TONR vs RTO + RES",
    "Pulse — IEC TP (no Logix instruction)": "パルス — IEC TP（Logixには命令なし）",
    "Scan time": "スキャンタイム",
    "Duration": "表示区間",
    "IN / rung toggles at (ms) — starts FALSE": "IN / ラング条件の切替時刻 (ms) — FALSEから開始",
    "R / RES toggles at (ms) — starts FALSE": "R / RES の切替時刻 (ms) — FALSEから開始",
    "Preset, scan time and duration must be whole milliseconds": "プリセット・スキャンタイム・表示区間は整数のmsで入力してください",
    "Preset must be a whole number of milliseconds, 0 or more": "プリセットは0以上の整数msです",
    "Scan time must be a whole number of milliseconds, 1 or more": "スキャンタイムは1以上の整数msです",
    "Duration must be at least one scan": "表示区間は1スキャン以上必要です",
    "Too many scans — keep duration ÷ scan time under 20000": "スキャン数が多すぎます — 表示区間 ÷ スキャンタイムを20000未満にしてください",
    "Toggle times must be 0 ms or later": "切替時刻は0 ms以降にしてください",
    "Output on — IEC Q: {a} · Logix .DN: {b}": "出力ON — IEC Q: {a} · Logix .DN: {b}",
    "Output off — IEC Q: {a} · Logix .DN: {b}": "出力OFF — IEC Q: {a} · Logix .DN: {b}",
    "Logix .ACC reached {acc} ms against a {pre} ms preset — {over} ms past it, because .ACC is not clamped and the scan time does not divide the preset. IEC ET stops at {pre}.":
      "Logix .ACC はプリセット {pre} ms を {over} ms 超えて {acc} ms に達しました。.ACC はプリセットで頭打ちにならず、スキャンタイムがプリセットを割り切らないためです。IEC の ET は {pre} で止まります。",
    "Here the scan time divides the preset, so .ACC lands exactly on {pre}. Change the scan time to see the overshoot.":
      "この設定ではスキャンタイムがプリセットを割り切るため、.ACC はちょうど {pre} で止まります。スキャンタイムを変えると超過が見えます。",
    "At power-up the Logix TOF reads .ACC = {acc} with .DN FALSE — the prescan leaves it in the expired state. The IEC TOF starts with Q FALSE and ET 0 until IN has been TRUE once.":
      "起動直後の Logix TOF は .ACC = {acc}、.DN FALSE です — プリスキャンがタイムアップ済みの状態にします。IEC TOF は IN が一度 TRUE になるまで Q FALSE、ET 0 で始まります。",
    "Logix 5000 has no pulse timer: the timers in its instruction reference are TON, TOF and RTO (plus TONR, TOFR and RTOR in function blocks). The IEC TP keeps Q TRUE for the full PT whatever IN does.":
      "Logix 5000 にはパルスタイマがありません。命令リファレンスのタイマは TON、TOF、RTO（ファンクションブロック用に TONR、TOFR、RTOR）です。IEC TP は IN に関係なく PT の間 Q を TRUE に保ちます。",
    "Pulses started at: {a}": "パルス開始: {a}",
    "Siemens TONR (IEC-style, S7-1200)": "Siemens TONR（IEC形式、S7-1200）",
    "IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)": "IEC 61131-3 {fb}（Beckhoff、CODESYS、Siemens）",
    "Allen-Bradley Logix 5000 {ins}": "Allen-Bradley Logix 5000 {ins}",
    "Each instruction runs once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "各命令は1スキャンに1回実行され、入力はスキャン開始時に読み込まれます。切替時刻はその時刻以降の最初のスキャンに反映されます。",
  },
  de: {
    "Compare": "Vergleich",
    "On-delay — TON vs TON": "Einschaltverzögerung — TON vs TON",
    "Off-delay — TOF vs TOF": "Ausschaltverzögerung — TOF vs TOF",
    "Retentive — Siemens TONR vs RTO + RES": "Speichernd — Siemens TONR vs RTO + RES",
    "Pulse — IEC TP (no Logix instruction)": "Impuls — IEC TP (keine Logix-Anweisung)",
    "Scan time": "Zykluszeit",
    "Duration": "Zeitraum",
    "IN / rung toggles at (ms) — starts FALSE": "IN / Strompfad wechselt bei (ms) — beginnt mit FALSE",
    "R / RES toggles at (ms) — starts FALSE": "R / RES wechselt bei (ms) — beginnt mit FALSE",
    "Preset, scan time and duration must be whole milliseconds": "Vorgabe, Zykluszeit und Zeitraum müssen ganze Millisekunden sein",
    "Preset must be a whole number of milliseconds, 0 or more": "Die Vorgabe muss eine ganze Zahl Millisekunden ab 0 sein",
    "Scan time must be a whole number of milliseconds, 1 or more": "Die Zykluszeit muss eine ganze Zahl Millisekunden ab 1 sein",
    "Duration must be at least one scan": "Der Zeitraum muss mindestens einen Zyklus umfassen",
    "Too many scans — keep duration ÷ scan time under 20000": "Zu viele Zyklen — Zeitraum ÷ Zykluszeit unter 20000 halten",
    "Toggle times must be 0 ms or later": "Wechselzeiten müssen bei 0 ms oder später liegen",
    "Output on — IEC Q: {a} · Logix .DN: {b}": "Ausgang ein — IEC Q: {a} · Logix .DN: {b}",
    "Output off — IEC Q: {a} · Logix .DN: {b}": "Ausgang aus — IEC Q: {a} · Logix .DN: {b}",
    "Logix .ACC reached {acc} ms against a {pre} ms preset — {over} ms past it, because .ACC is not clamped and the scan time does not divide the preset. IEC ET stops at {pre}.":
      "Logix .ACC erreichte {acc} ms bei einer Vorgabe von {pre} ms — {over} ms darüber, weil .ACC nicht begrenzt wird und die Zykluszeit die Vorgabe nicht teilt. IEC ET bleibt bei {pre} stehen.",
    "Here the scan time divides the preset, so .ACC lands exactly on {pre}. Change the scan time to see the overshoot.":
      "Hier teilt die Zykluszeit die Vorgabe, also endet .ACC genau bei {pre}. Ändern Sie die Zykluszeit, um das Überschießen zu sehen.",
    "At power-up the Logix TOF reads .ACC = {acc} with .DN FALSE — the prescan leaves it in the expired state. The IEC TOF starts with Q FALSE and ET 0 until IN has been TRUE once.":
      "Nach dem Anlauf zeigt der Logix-TOF .ACC = {acc} bei .DN FALSE — der Prescan hinterlässt ihn im abgelaufenen Zustand. Der IEC-TOF beginnt mit Q FALSE und ET 0, bis IN einmal TRUE war.",
    "Logix 5000 has no pulse timer: the timers in its instruction reference are TON, TOF and RTO (plus TONR, TOFR and RTOR in function blocks). The IEC TP keeps Q TRUE for the full PT whatever IN does.":
      "Logix 5000 hat keinen Impulszeitgeber: Die Timer in der Anweisungsreferenz sind TON, TOF und RTO (dazu TONR, TOFR und RTOR in Funktionsbausteinen). Der IEC-TP hält Q für die volle PT auf TRUE, egal was IN tut.",
    "Pulses started at: {a}": "Impulse gestartet bei: {a}",
    "Siemens TONR (IEC-style, S7-1200)": "Siemens TONR (IEC-Art, S7-1200)",
    "IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)": "IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)",
    "Allen-Bradley Logix 5000 {ins}": "Allen-Bradley Logix 5000 {ins}",
    "Each instruction runs once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Jede Anweisung läuft einmal pro Zyklus; Eingänge werden zu Zyklusbeginn gelesen. Wechselzeiten wirken im ersten Zyklus zu oder nach diesem Zeitpunkt.",
  },
  zh: {
    "Compare": "对比",
    "On-delay — TON vs TON": "接通延时 — TON vs TON",
    "Off-delay — TOF vs TOF": "断开延时 — TOF vs TOF",
    "Retentive — Siemens TONR vs RTO + RES": "保持型 — Siemens TONR vs RTO + RES",
    "Pulse — IEC TP (no Logix instruction)": "脉冲 — IEC TP（Logix 无此指令）",
    "Scan time": "扫描时间",
    "Duration": "时长",
    "IN / rung toggles at (ms) — starts FALSE": "IN / 梯级条件切换时刻 (ms) — 初始为 FALSE",
    "R / RES toggles at (ms) — starts FALSE": "R / RES 切换时刻 (ms) — 初始为 FALSE",
    "Preset, scan time and duration must be whole milliseconds": "预设值、扫描时间和时长必须是整数毫秒",
    "Preset must be a whole number of milliseconds, 0 or more": "预设值必须是不小于 0 的整数毫秒",
    "Scan time must be a whole number of milliseconds, 1 or more": "扫描时间必须是不小于 1 的整数毫秒",
    "Duration must be at least one scan": "时长至少要覆盖一个扫描周期",
    "Too many scans — keep duration ÷ scan time under 20000": "扫描次数过多 — 请让时长 ÷ 扫描时间小于 20000",
    "Toggle times must be 0 ms or later": "切换时刻必须在 0 ms 或之后",
    "Output on — IEC Q: {a} · Logix .DN: {b}": "输出接通 — IEC Q: {a} · Logix .DN: {b}",
    "Output off — IEC Q: {a} · Logix .DN: {b}": "输出断开 — IEC Q: {a} · Logix .DN: {b}",
    "Logix .ACC reached {acc} ms against a {pre} ms preset — {over} ms past it, because .ACC is not clamped and the scan time does not divide the preset. IEC ET stops at {pre}.":
      "Logix .ACC 达到 {acc} ms，比预设 {pre} ms 多出 {over} ms：.ACC 不会被限制在预设值，而扫描时间不能整除预设值。IEC 的 ET 停在 {pre}。",
    "Here the scan time divides the preset, so .ACC lands exactly on {pre}. Change the scan time to see the overshoot.":
      "此处扫描时间能整除预设值，所以 .ACC 恰好停在 {pre}。改变扫描时间即可看到超出。",
    "At power-up the Logix TOF reads .ACC = {acc} with .DN FALSE — the prescan leaves it in the expired state. The IEC TOF starts with Q FALSE and ET 0 until IN has been TRUE once.":
      "上电后 Logix TOF 的 .ACC = {acc}，.DN 为 FALSE — 预扫描使其处于已计时完成状态。IEC TOF 在 IN 首次为 TRUE 之前，Q 为 FALSE、ET 为 0。",
    "Logix 5000 has no pulse timer: the timers in its instruction reference are TON, TOF and RTO (plus TONR, TOFR and RTOR in function blocks). The IEC TP keeps Q TRUE for the full PT whatever IN does.":
      "Logix 5000 没有脉冲定时器：其指令参考中的定时器为 TON、TOF 和 RTO（功能块中另有 TONR、TOFR、RTOR）。IEC TP 无论 IN 如何变化，都会在整个 PT 内保持 Q 为 TRUE。",
    "Pulses started at: {a}": "脉冲开始于: {a}",
    "Siemens TONR (IEC-style, S7-1200)": "Siemens TONR（IEC 风格，S7-1200）",
    "IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)": "IEC 61131-3 {fb}（Beckhoff、CODESYS、Siemens）",
    "Allen-Bradley Logix 5000 {ins}": "Allen-Bradley Logix 5000 {ins}",
    "Each instruction runs once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "每条指令每个扫描周期执行一次，输入在扫描开始时读取。切换时刻在该时刻或其后的第一个扫描周期生效。",
  },
};
