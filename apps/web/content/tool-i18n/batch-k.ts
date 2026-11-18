import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

/**
 * Batch K — PLC scan-order pitfalls. Instruction names (OTE, OTL, OTU, OSR,
 * SR, RS, XIC, XIO) and the signal names in the rung listing stay as written.
 */
export const BATCH_K: Record<SiteLocale, ToolDict> = {
  en: {},
  ko: {
    "Pitfall": "함정",
    "Double coil — one bit, two OTE rungs": "이중 코일 — 한 비트, OTE 렁 두 개",
    "One-shot bit read above and below the OSR": "OSR 위·아래 렁에서 읽는 원샷 비트",
    "Set and reset at the same time — five latches": "세트와 리셋이 동시에 — 래치 다섯 가지",
    "A toggles at (ms) — starts FALSE": "A가 바뀌는 시각 (ms) — FALSE에서 시작",
    "B toggles at (ms) — starts FALSE": "B가 바뀌는 시각 (ms) — FALSE에서 시작",
    "A (set / start) toggles at (ms) — starts FALSE": "A (세트 / 시작)가 바뀌는 시각 (ms) — FALSE에서 시작",
    "B (reset / stop) toggles at (ms) — starts FALSE": "B (리셋 / 정지)가 바뀌는 시각 (ms) — FALSE에서 시작",
    "Z (rung 2) is TRUE at {a} — it reads the value rung 1 wrote. The output Y is TRUE at {b} — only rung 3's write survives to the end of the scan, so A never reaches the output.":
      "Z(렁 2)는 {a}에 TRUE입니다 — 렁 1이 쓴 값을 읽습니다. 출력 Y는 {b}에 TRUE입니다 — 스캔 끝까지 남는 것은 렁 3의 쓰기뿐이라 A는 출력에 닿지 못합니다.",
    "P pulses at {p}. The rung below the OSR sees it in the same scan ({below}); the rung above sees it one scan later ({above}). Both see it exactly once.":
      "P는 {p}에 펄스입니다. OSR 아래 렁은 같은 스캔에({below}), 위 렁은 한 스캔 뒤에({above}) 봅니다. 둘 다 정확히 한 번 봅니다.",
    "Set and reset are both TRUE at {a}. SR and the latch-last pair keep the bit on; RS, the unlatch-last pair and the seal-in turn it off.":
      "{a}에 세트와 리셋이 모두 TRUE입니다. SR과 래치를 나중에 둔 쌍은 비트를 켜 두고, RS와 언래치를 나중에 둔 쌍, 자기유지는 끕니다.",
    "Set and reset are never TRUE in the same scan here, so all five latches agree. Overlap A and B to see them split.":
      "여기서는 세트와 리셋이 같은 스캔에 함께 TRUE가 되지 않아 다섯 래치가 모두 같습니다. A와 B를 겹치게 하면 갈라집니다.",
    "Each row is the value after that rung ran, sampled once per scan": "각 행은 해당 렁이 실행된 직후 값이며, 스캔마다 한 번 기록합니다",
    "Rungs run top to bottom once per scan; A and B are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "렁은 스캔마다 위에서 아래로 한 번 실행되고, A와 B는 스캔 시작에 읽습니다. 전환 시각은 그 시각이거나 그 뒤의 첫 스캔에 반영됩니다.",
  },
  ja: {
    "Pitfall": "落とし穴",
    "Double coil — one bit, two OTE rungs": "二重コイル — 1ビットに2つのOTEラング",
    "One-shot bit read above and below the OSR": "OSRの上下のラングで読むワンショットビット",
    "Set and reset at the same time — five latches": "セットとリセットが同時 — 5種類のラッチ",
    "A toggles at (ms) — starts FALSE": "Aの切替時刻 (ms) — FALSEから開始",
    "B toggles at (ms) — starts FALSE": "Bの切替時刻 (ms) — FALSEから開始",
    "A (set / start) toggles at (ms) — starts FALSE": "A（セット / 起動）の切替時刻 (ms) — FALSEから開始",
    "B (reset / stop) toggles at (ms) — starts FALSE": "B（リセット / 停止）の切替時刻 (ms) — FALSEから開始",
    "Z (rung 2) is TRUE at {a} — it reads the value rung 1 wrote. The output Y is TRUE at {b} — only rung 3's write survives to the end of the scan, so A never reaches the output.":
      "Z（ラング2）は{a}でTRUEです — ラング1が書いた値を読みます。出力Yは{b}でTRUEです — スキャン終了まで残るのはラング3の書き込みだけなので、Aは出力に届きません。",
    "P pulses at {p}. The rung below the OSR sees it in the same scan ({below}); the rung above sees it one scan later ({above}). Both see it exactly once.":
      "Pは{p}でパルスになります。OSRの下のラングは同じスキャンで（{below}）、上のラングは1スキャン後に（{above}）見ます。どちらもちょうど1回です。",
    "Set and reset are both TRUE at {a}. SR and the latch-last pair keep the bit on; RS, the unlatch-last pair and the seal-in turn it off.":
      "{a}でセットとリセットが両方TRUEです。SRとラッチを後に置いた組はビットをONに保ち、RS、アンラッチを後に置いた組、自己保持はOFFにします。",
    "Set and reset are never TRUE in the same scan here, so all five latches agree. Overlap A and B to see them split.":
      "ここではセットとリセットが同じスキャンで同時にTRUEにならないため、5つのラッチはすべて一致します。AとBを重ねると分かれます。",
    "Each row is the value after that rung ran, sampled once per scan": "各行はそのラングの実行直後の値で、1スキャンに1回記録します",
    "Rungs run top to bottom once per scan; A and B are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "ラングは1スキャンに1回、上から下へ実行され、AとBはスキャン開始時に読み込まれます。切替時刻はその時刻以降の最初のスキャンに反映されます。",
  },
  de: {
    "Pitfall": "Falle",
    "Double coil — one bit, two OTE rungs": "Doppelspule — ein Bit, zwei OTE-Strompfade",
    "One-shot bit read above and below the OSR": "One-Shot-Bit über und unter dem OSR gelesen",
    "Set and reset at the same time — five latches": "Setzen und Rücksetzen gleichzeitig — fünf Speicher",
    "A toggles at (ms) — starts FALSE": "A wechselt bei (ms) — beginnt mit FALSE",
    "B toggles at (ms) — starts FALSE": "B wechselt bei (ms) — beginnt mit FALSE",
    "A (set / start) toggles at (ms) — starts FALSE": "A (Setzen / Start) wechselt bei (ms) — beginnt mit FALSE",
    "B (reset / stop) toggles at (ms) — starts FALSE": "B (Rücksetzen / Stopp) wechselt bei (ms) — beginnt mit FALSE",
    "Z (rung 2) is TRUE at {a} — it reads the value rung 1 wrote. The output Y is TRUE at {b} — only rung 3's write survives to the end of the scan, so A never reaches the output.":
      "Z (Strompfad 2) ist bei {a} TRUE — es liest den Wert, den Strompfad 1 geschrieben hat. Der Ausgang Y ist bei {b} TRUE — nur der Schreibzugriff von Strompfad 3 überlebt bis zum Zyklusende, A erreicht den Ausgang also nie.",
    "P pulses at {p}. The rung below the OSR sees it in the same scan ({below}); the rung above sees it one scan later ({above}). Both see it exactly once.":
      "P pulst bei {p}. Der Strompfad unter dem OSR sieht es im selben Zyklus ({below}), der darüber einen Zyklus später ({above}). Beide sehen es genau einmal.",
    "Set and reset are both TRUE at {a}. SR and the latch-last pair keep the bit on; RS, the unlatch-last pair and the seal-in turn it off.":
      "Bei {a} sind Setzen und Rücksetzen beide TRUE. SR und das Paar mit dem Latch zuletzt halten das Bit an; RS, das Paar mit dem Unlatch zuletzt und die Selbsthaltung schalten es ab.",
    "Set and reset are never TRUE in the same scan here, so all five latches agree. Overlap A and B to see them split.":
      "Hier sind Setzen und Rücksetzen nie im selben Zyklus TRUE, also stimmen alle fünf Speicher überein. Überlappen Sie A und B, um sie auseinanderlaufen zu sehen.",
    "Each row is the value after that rung ran, sampled once per scan": "Jede Zeile ist der Wert nach dem jeweiligen Strompfad, einmal pro Zyklus erfasst",
    "Rungs run top to bottom once per scan; A and B are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Strompfade laufen einmal pro Zyklus von oben nach unten; A und B werden zu Zyklusbeginn gelesen. Wechselzeiten wirken im ersten Zyklus zu oder nach diesem Zeitpunkt.",
  },
  zh: {
    "Pitfall": "陷阱",
    "Double coil — one bit, two OTE rungs": "双线圈 — 同一位、两个 OTE 梯级",
    "One-shot bit read above and below the OSR": "在 OSR 上方和下方梯级读取单次脉冲位",
    "Set and reset at the same time — five latches": "置位与复位同时出现 — 五种锁存",
    "A toggles at (ms) — starts FALSE": "A 切换时刻 (ms) — 初始为 FALSE",
    "B toggles at (ms) — starts FALSE": "B 切换时刻 (ms) — 初始为 FALSE",
    "A (set / start) toggles at (ms) — starts FALSE": "A（置位 / 启动）切换时刻 (ms) — 初始为 FALSE",
    "B (reset / stop) toggles at (ms) — starts FALSE": "B（复位 / 停止）切换时刻 (ms) — 初始为 FALSE",
    "Z (rung 2) is TRUE at {a} — it reads the value rung 1 wrote. The output Y is TRUE at {b} — only rung 3's write survives to the end of the scan, so A never reaches the output.":
      "Z（梯级 2）在 {a} 为 TRUE — 它读取的是梯级 1 写入的值。输出 Y 在 {b} 为 TRUE — 只有梯级 3 的写入保留到扫描结束，因此 A 永远到不了输出。",
    "P pulses at {p}. The rung below the OSR sees it in the same scan ({below}); the rung above sees it one scan later ({above}). Both see it exactly once.":
      "P 在 {p} 产生脉冲。OSR 下方的梯级在同一扫描看到（{below}），上方的梯级晚一个扫描看到（{above}）。两者都恰好看到一次。",
    "Set and reset are both TRUE at {a}. SR and the latch-last pair keep the bit on; RS, the unlatch-last pair and the seal-in turn it off.":
      "{a} 时置位和复位同时为 TRUE。SR 和锁存在后的组合保持该位为 ON；RS、解锁在后的组合以及自锁电路将其关断。",
    "Set and reset are never TRUE in the same scan here, so all five latches agree. Overlap A and B to see them split.":
      "这里置位和复位从未在同一扫描同时为 TRUE，因此五种锁存结果一致。让 A 和 B 重叠即可看到差异。",
    "Each row is the value after that rung ran, sampled once per scan": "每一行是该梯级执行后的值，每个扫描记录一次",
    "Rungs run top to bottom once per scan; A and B are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "梯级每个扫描从上到下执行一次；A 和 B 在扫描开始时读取。切换时刻在该时刻或其后的第一个扫描生效。",
  },
};
