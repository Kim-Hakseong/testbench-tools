import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

/**
 * Batch M — Mitsubishi and LS pulse instructions. Mnemonics (LDP, LDF, PLS,
 * PLF, LOADP, LOADN, OUTP, OUTN, CJ, JMP), device names and the {placeholders}
 * stay as written.
 */
export const BATCH_M: Record<SiteLocale, ToolDict> = {
  en: {},
  ko: {
    "Vendor": "제조사",
    "Pulse contact vs pulse coil": "펄스 접점 vs 펄스 코일",
    "Pulse coil skipped by a jump": "점프로 건너뛴 펄스 코일",
    "X toggles at (ms) — starts FALSE": "X가 바뀌는 시각 (ms) — FALSE에서 시작",
    "J (jump) toggles at (ms) — starts FALSE": "J (점프)가 바뀌는 시각 (ms) — FALSE에서 시작",
    "Edge memory on the first scan (not documented — assumption E2)": "첫 스캔의 엣지 기억값 (매뉴얼에 없음 — 가정 E2)",
    "OFF — an input already ON fires a rising pulse on scan 0": "OFF — 이미 ON인 입력이 스캔 0에 상승 펄스를 냄",
    "ON — an input already OFF fires a falling pulse on scan 0": "ON — 이미 OFF인 입력이 스캔 0에 하강 펄스를 냄",
    "{contact} (M1) and {coil} (M0) both pulse at {t} — the same single scan, as Mitsubishi documents. The rung above the {coil} reads M0 at {above}, one scan late; the rung below reads it at {below}.":
      "{contact}(M1)와 {coil}(M0)은 둘 다 {t}에 펄스를 냅니다 — Mitsubishi 매뉴얼대로 같은 한 스캔입니다. {coil} 위 렁은 M0를 {above}에 한 스캔 늦게 읽고, 아래 렁은 {below}에 읽습니다.",
    "X never rises at a scan here, so no rising pulse fires.": "여기서는 X가 어느 스캔에서도 상승하지 않아 상승 펄스가 나오지 않습니다.",
    "X changes at {t} and changes back before the next scan starts, so no pulse instruction sees it.":
      "X는 {t}에 바뀌었다가 다음 스캔이 시작되기 전에 되돌아가므로, 어떤 펄스 명령도 보지 못합니다.",
    "M0 is ON at {t} — up to {n} scans in a row instead of one: the {jump} skipped the {coil} that would have turned it off. Mitsubishi warns the device \"sometimes turns ON for one scan or more\".":
      "M0는 {t}에 ON입니다 — 한 스캔이 아니라 최대 {n}스캔 연속입니다: {jump}가 M0를 꺼야 할 {coil}을 건너뛰었습니다. Mitsubishi는 디바이스가 \"sometimes turns ON for one scan or more\"라고 경고합니다.",
    "M0 pulses for single scans at {t}. Start the jump right after X rises to see it stick.":
      "M0는 {t}에 한 스캔씩만 펄스를 냅니다. X가 상승한 직후에 점프를 시작하면 M0가 붙어 있는 것이 보입니다.",
    "X rises at {t} but the {coil} never fires for it: when it runs again X is still ON and its memory still says ON from before the jump.":
      "X는 {t}에 상승하지만 {coil}은 그에 대해 펄스를 내지 않습니다: 다시 실행될 때 X는 여전히 ON이고, 기억값도 점프 전의 ON 그대로입니다.",
    "Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "렁은 스캔마다 위에서 아래로 한 번 실행되고, 입력은 스캔 시작에 읽습니다. 전환 시각은 그 시각이거나 그 뒤의 첫 스캔에 반영됩니다.",
  },
  ja: {
    "Vendor": "メーカー",
    "Pulse contact vs pulse coil": "パルス接点とパルスコイル",
    "Pulse coil skipped by a jump": "ジャンプで飛ばされたパルスコイル",
    "X toggles at (ms) — starts FALSE": "Xの切替時刻 (ms) — FALSEから開始",
    "J (jump) toggles at (ms) — starts FALSE": "J（ジャンプ）の切替時刻 (ms) — FALSEから開始",
    "Edge memory on the first scan (not documented — assumption E2)": "初回スキャンのエッジ記憶値（マニュアルに記載なし — 仮定E2）",
    "OFF — an input already ON fires a rising pulse on scan 0": "OFF — すでにONの入力がスキャン0で立上りパルスを出す",
    "ON — an input already OFF fires a falling pulse on scan 0": "ON — すでにOFFの入力がスキャン0で立下りパルスを出す",
    "{contact} (M1) and {coil} (M0) both pulse at {t} — the same single scan, as Mitsubishi documents. The rung above the {coil} reads M0 at {above}, one scan late; the rung below reads it at {below}.":
      "{contact}（M1）と{coil}（M0）はどちらも{t}でパルスを出します — 三菱のマニュアルどおり同じ1スキャンです。{coil}より上のラングは{above}で1スキャン遅れてM0を読み、下のラングは{below}で読みます。",
    "X never rises at a scan here, so no rising pulse fires.": "ここではXがどのスキャンでも立ち上がらないため、立上りパルスは出ません。",
    "X changes at {t} and changes back before the next scan starts, so no pulse instruction sees it.":
      "Xは{t}で変化し、次のスキャン開始前に元に戻るため、どのパルス命令も検出できません。",
    "M0 is ON at {t} — up to {n} scans in a row instead of one: the {jump} skipped the {coil} that would have turned it off. Mitsubishi warns the device \"sometimes turns ON for one scan or more\".":
      "M0は{t}でONです — 1スキャンではなく最大{n}スキャン連続です：{jump}がM0をOFFにするはずの{coil}を飛ばしました。三菱はデバイスが\"sometimes turns ON for one scan or more\"と注意しています。",
    "M0 pulses for single scans at {t}. Start the jump right after X rises to see it stick.":
      "M0は{t}で1スキャンずつパルスを出します。Xの立上り直後にジャンプを始めると、M0がONのまま残る様子が見えます。",
    "X rises at {t} but the {coil} never fires for it: when it runs again X is still ON and its memory still says ON from before the jump.":
      "Xは{t}で立ち上がりますが、{coil}はそれに対してパルスを出しません：再実行時にXはまだONで、記憶値もジャンプ前のONのままです。",
    "Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "ラングは1スキャンに1回、上から下へ実行され、入力はスキャン開始時に読み込まれます。切替時刻はその時刻以降の最初のスキャンに反映されます。",
  },
  de: {
    "Vendor": "Hersteller",
    "Pulse contact vs pulse coil": "Impulskontakt gegen Impulsspule",
    "Pulse coil skipped by a jump": "Von einem Sprung übersprungene Impulsspule",
    "X toggles at (ms) — starts FALSE": "X wechselt bei (ms) — beginnt mit FALSE",
    "J (jump) toggles at (ms) — starts FALSE": "J (Sprung) wechselt bei (ms) — beginnt mit FALSE",
    "Edge memory on the first scan (not documented — assumption E2)": "Flankenspeicher im ersten Zyklus (nicht dokumentiert — Annahme E2)",
    "OFF — an input already ON fires a rising pulse on scan 0": "OFF — ein bereits eingeschalteter Eingang löst in Zyklus 0 einen steigenden Impuls aus",
    "ON — an input already OFF fires a falling pulse on scan 0": "ON — ein bereits ausgeschalteter Eingang löst in Zyklus 0 einen fallenden Impuls aus",
    "{contact} (M1) and {coil} (M0) both pulse at {t} — the same single scan, as Mitsubishi documents. The rung above the {coil} reads M0 at {above}, one scan late; the rung below reads it at {below}.":
      "{contact} (M1) und {coil} (M0) pulsen beide bei {t} — derselbe einzelne Zyklus, wie Mitsubishi es dokumentiert. Der Strompfad über dem {coil} liest M0 bei {above}, einen Zyklus später; der darunter bei {below}.",
    "X never rises at a scan here, so no rising pulse fires.": "X steigt hier in keinem Zyklus, also kommt kein steigender Impuls.",
    "X changes at {t} and changes back before the next scan starts, so no pulse instruction sees it.":
      "X wechselt bei {t} und wechselt vor dem nächsten Zyklusbeginn zurück, also sieht es keine Impulsanweisung.",
    "M0 is ON at {t} — up to {n} scans in a row instead of one: the {jump} skipped the {coil} that would have turned it off. Mitsubishi warns the device \"sometimes turns ON for one scan or more\".":
      "M0 ist bei {t} ON — bis zu {n} Zyklen in Folge statt einem: Der {jump} hat den {coil} übersprungen, der es abgeschaltet hätte. Mitsubishi warnt, der Operand \"sometimes turns ON for one scan or more\".",
    "M0 pulses for single scans at {t}. Start the jump right after X rises to see it stick.":
      "M0 pulst bei {t} jeweils einen Zyklus. Starten Sie den Sprung direkt nach dem Anstieg von X, um es hängen zu sehen.",
    "X rises at {t} but the {coil} never fires for it: when it runs again X is still ON and its memory still says ON from before the jump.":
      "X steigt bei {t}, aber der {coil} löst dafür nie aus: Wenn er wieder läuft, ist X noch ON und sein Speicher steht noch auf ON von vor dem Sprung.",
    "Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Strompfade laufen einmal pro Zyklus von oben nach unten; Eingänge werden zu Zyklusbeginn gelesen. Wechselzeiten wirken im ersten Zyklus zu oder nach diesem Zeitpunkt.",
  },
  zh: {
    "Vendor": "厂商",
    "Pulse contact vs pulse coil": "脉冲触点与脉冲线圈",
    "Pulse coil skipped by a jump": "被跳转跳过的脉冲线圈",
    "X toggles at (ms) — starts FALSE": "X 切换时刻 (ms) — 初始为 FALSE",
    "J (jump) toggles at (ms) — starts FALSE": "J（跳转）切换时刻 (ms) — 初始为 FALSE",
    "Edge memory on the first scan (not documented — assumption E2)": "首个扫描的边沿记忆值（手册未记载 — 假设 E2）",
    "OFF — an input already ON fires a rising pulse on scan 0": "OFF — 已为 ON 的输入在扫描 0 产生上升沿脉冲",
    "ON — an input already OFF fires a falling pulse on scan 0": "ON — 已为 OFF 的输入在扫描 0 产生下降沿脉冲",
    "{contact} (M1) and {coil} (M0) both pulse at {t} — the same single scan, as Mitsubishi documents. The rung above the {coil} reads M0 at {above}, one scan late; the rung below reads it at {below}.":
      "{contact}（M1）和 {coil}（M0）都在 {t} 产生脉冲 — 正如三菱手册所述，是同一个扫描。{coil} 上方的梯级在 {above} 晚一个扫描读到 M0，下方的梯级在 {below} 读到。",
    "X never rises at a scan here, so no rising pulse fires.": "这里 X 在任何扫描都没有上升，因此不会产生上升沿脉冲。",
    "X changes at {t} and changes back before the next scan starts, so no pulse instruction sees it.":
      "X 在 {t} 变化，并在下一个扫描开始前恢复，因此任何脉冲指令都检测不到。",
    "M0 is ON at {t} — up to {n} scans in a row instead of one: the {jump} skipped the {coil} that would have turned it off. Mitsubishi warns the device \"sometimes turns ON for one scan or more\".":
      "M0 在 {t} 为 ON — 不是一个扫描，而是最多连续 {n} 个扫描：{jump} 跳过了本应将其关断的 {coil}。三菱提醒该软元件 \"sometimes turns ON for one scan or more\"。",
    "M0 pulses for single scans at {t}. Start the jump right after X rises to see it stick.":
      "M0 在 {t} 每次只产生一个扫描的脉冲。在 X 上升后立即开始跳转，即可看到它保持 ON。",
    "X rises at {t} but the {coil} never fires for it: when it runs again X is still ON and its memory still says ON from before the jump.":
      "X 在 {t} 上升，但 {coil} 没有为此产生脉冲：再次执行时 X 仍为 ON，其记忆值也仍是跳转前的 ON。",
    "Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "梯级每个扫描从上到下执行一次；输入在扫描开始时读取。切换时刻在该时刻或其后的第一个扫描生效。",
  },
};
