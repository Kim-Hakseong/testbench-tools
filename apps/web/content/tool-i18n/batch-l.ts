import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

/**
 * Batch L — PLC JMP vs MCR. Instruction names (JMP, LBL, MCR, OTE, TON, TOF,
 * RTO, XIC, XIO), member names (.ACC, .DN, .PRE) and signal names stay as written.
 */
export const BATCH_L: Record<SiteLocale, ToolDict> = {
  en: {},
  ko: {
    "Program": "프로그램",
    "JMP over four rungs (E FALSE skips them)": "렁 4개를 건너뛰는 JMP (E가 FALSE면 건너뜀)",
    "MCR zone around the same four rungs": "같은 렁 4개를 감싼 MCR 영역",
    "MCR zone ended by a conditional MCR": "조건부 MCR로 끝나는 MCR 영역",
    "JMP into the middle of an MCR zone": "MCR 영역 한가운데로 들어가는 JMP",
    "E (zone runs) toggles at (ms) — starts FALSE": "E (영역 실행)가 바뀌는 시각 (ms) — FALSE에서 시작",
    "X (end MCR condition) toggles at (ms) — starts FALSE": "X (종료 MCR 조건)가 바뀌는 시각 (ms) — FALSE에서 시작",
    "X (jump) toggles at (ms) — starts FALSE": "X (점프)가 바뀌는 시각 (ms) — FALSE에서 시작",
    "Scan time, preset and duration must be whole milliseconds": "스캔 시간, 프리셋, 기간은 정수 밀리초여야 합니다",
    "Rungs 2–5 are skipped at {s}. On those scans nothing inside the zone is written: Y keeps its last value whatever A does (Y is TRUE at {y}).":
      "렁 2–5는 {s}에 건너뜁니다. 그 스캔에서는 영역 안의 어떤 것도 쓰이지 않아, A가 어떻게 바뀌든 Y는 마지막 값을 유지합니다(Y는 {y}에 TRUE).",
    "{tag}.ACC jumps from {from} to {to} at {at} ms: the first scan back adds all the time since the timer last ran, whatever A did in between.":
      "{tag}.ACC가 {at} ms에 {from}에서 {to}로 뜁니다: 다시 실행되는 첫 스캔이 타이머가 마지막으로 실행된 뒤 흐른 시간 전체를 더합니다. 그사이 A가 어땠는지는 상관없습니다.",
    "E is TRUE on every scan, so nothing is skipped. Make E FALSE for a while to see the jump.":
      "E가 모든 스캔에서 TRUE라 건너뛰는 렁이 없습니다. E를 잠시 FALSE로 두면 점프가 보입니다.",
    "The zone is disabled at {s}. Its rungs still run, as false: Y is FALSE and T1 is cleared, but T2.DN is TRUE at {tof} (a false rung starts a TOF) and T3.ACC holds.":
      "영역은 {s}에 꺼집니다. 렁은 여전히 실행되지만 거짓으로 실행됩니다: Y는 FALSE, T1은 클리어되지만 T2.DN은 {tof}에 TRUE이고(거짓 렁이 TOF를 시작) T3.ACC는 유지됩니다.",
    "E is TRUE on every scan, so the zone is never disabled. Make E FALSE for a while to see the zone run false.":
      "E가 모든 스캔에서 TRUE라 영역이 꺼지지 않습니다. E를 잠시 FALSE로 두면 영역이 거짓으로 실행되는 것이 보입니다.",
    "Y2 is outside the zone, yet it is FALSE at {s} while A is TRUE: the zone was enabled and the end MCR's rung was false, so it toggled the override on for every rung after it.":
      "Y2는 영역 밖인데도 A가 TRUE인 {s}에 FALSE입니다: 영역이 켜진 상태에서 종료 MCR의 렁이 거짓이어서, 그 뒤 모든 렁에 대해 오버라이드를 켰습니다.",
    "Y2 follows A on every scan here. Make E TRUE while X is FALSE to see the end MCR switch it off.":
      "여기서는 Y2가 모든 스캔에서 A를 따릅니다. X가 FALSE일 때 E를 TRUE로 두면 종료 MCR이 Y2를 끄는 것이 보입니다.",
    "Y2 is TRUE at {s} although E is FALSE: the jump skipped the starting MCR, so the zone was never disabled. Y1 was skipped and kept its value.":
      "E가 FALSE인데도 Y2는 {s}에 TRUE입니다: 점프가 시작 MCR을 건너뛰어 영역이 꺼지지 않았습니다. Y1은 건너뛰어져 값을 유지했습니다.",
    "The jump never lands while E is FALSE here. Make X TRUE while E is FALSE to see the zone stay enabled.":
      "여기서는 E가 FALSE일 때 점프가 일어나지 않습니다. E가 FALSE일 때 X를 TRUE로 두면 영역이 켜진 채로 남는 것이 보입니다.",
    "Each row is sampled once per scan, at the end of the scan": "각 행은 스캔마다 한 번, 스캔 끝에 기록합니다",
    "Logix rules (RM003). Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Logix 규칙(RM003). 렁은 스캔마다 위에서 아래로 한 번 실행되고, 입력은 스캔 시작에 읽습니다. 전환 시각은 그 시각이거나 그 뒤의 첫 스캔에 반영됩니다.",
  },
  ja: {
    "Program": "プログラム",
    "JMP over four rungs (E FALSE skips them)": "4つのラングを飛ばすJMP（EがFALSEでスキップ）",
    "MCR zone around the same four rungs": "同じ4つのラングを囲むMCRゾーン",
    "MCR zone ended by a conditional MCR": "条件付きMCRで終わるMCRゾーン",
    "JMP into the middle of an MCR zone": "MCRゾーンの途中へ飛び込むJMP",
    "E (zone runs) toggles at (ms) — starts FALSE": "E（ゾーン実行）の切替時刻 (ms) — FALSEから開始",
    "X (end MCR condition) toggles at (ms) — starts FALSE": "X（終了MCRの条件）の切替時刻 (ms) — FALSEから開始",
    "X (jump) toggles at (ms) — starts FALSE": "X（ジャンプ）の切替時刻 (ms) — FALSEから開始",
    "Scan time, preset and duration must be whole milliseconds": "スキャン時間・プリセット・期間は整数ミリ秒で入力してください",
    "Rungs 2–5 are skipped at {s}. On those scans nothing inside the zone is written: Y keeps its last value whatever A does (Y is TRUE at {y}).":
      "ラング2–5は{s}でスキップされます。そのスキャンではゾーン内に何も書き込まれず、Aがどう変わってもYは最後の値を保ちます（Yは{y}でTRUE）。",
    "{tag}.ACC jumps from {from} to {to} at {at} ms: the first scan back adds all the time since the timer last ran, whatever A did in between.":
      "{tag}.ACCが{at} msで{from}から{to}へ跳びます。再び実行される最初のスキャンが、タイマーが最後に実行されてからの時間をまとめて加算します。その間のAの状態は関係ありません。",
    "E is TRUE on every scan, so nothing is skipped. Make E FALSE for a while to see the jump.":
      "Eが全スキャンでTRUEなので、スキップされるラングはありません。EをしばらくFALSEにするとジャンプが見えます。",
    "The zone is disabled at {s}. Its rungs still run, as false: Y is FALSE and T1 is cleared, but T2.DN is TRUE at {tof} (a false rung starts a TOF) and T3.ACC holds.":
      "ゾーンは{s}で無効です。ラングは実行され続けますが偽として実行されます：YはFALSE、T1はクリアされますが、T2.DNは{tof}でTRUE（偽のラングがTOFを開始）、T3.ACCは保持されます。",
    "E is TRUE on every scan, so the zone is never disabled. Make E FALSE for a while to see the zone run false.":
      "Eが全スキャンでTRUEなので、ゾーンは無効になりません。EをしばらくFALSEにするとゾーンが偽で実行される様子が見えます。",
    "Y2 is outside the zone, yet it is FALSE at {s} while A is TRUE: the zone was enabled and the end MCR's rung was false, so it toggled the override on for every rung after it.":
      "Y2はゾーンの外なのに、AがTRUEの{s}でFALSEです：ゾーンが有効な状態で終了MCRのラングが偽だったため、それ以降のすべてのラングに対してオーバーライドをONにしました。",
    "Y2 follows A on every scan here. Make E TRUE while X is FALSE to see the end MCR switch it off.":
      "ここではY2が全スキャンでAに従います。XがFALSEのときにEをTRUEにすると、終了MCRがY2を切る様子が見えます。",
    "Y2 is TRUE at {s} although E is FALSE: the jump skipped the starting MCR, so the zone was never disabled. Y1 was skipped and kept its value.":
      "EがFALSEなのにY2は{s}でTRUEです：ジャンプが開始MCRを飛ばしたため、ゾーンは無効になりませんでした。Y1はスキップされ、値を保ちました。",
    "The jump never lands while E is FALSE here. Make X TRUE while E is FALSE to see the zone stay enabled.":
      "ここではEがFALSEの間にジャンプが起きません。EがFALSEのときにXをTRUEにすると、ゾーンが有効のまま残る様子が見えます。",
    "Each row is sampled once per scan, at the end of the scan": "各行は1スキャンに1回、スキャン終了時に記録します",
    "Logix rules (RM003). Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Logixの規則（RM003）。ラングは1スキャンに1回、上から下へ実行され、入力はスキャン開始時に読み込まれます。切替時刻はその時刻以降の最初のスキャンに反映されます。",
  },
  de: {
    "Program": "Programm",
    "JMP over four rungs (E FALSE skips them)": "JMP über vier Strompfade (E FALSE überspringt sie)",
    "MCR zone around the same four rungs": "MCR-Zone um dieselben vier Strompfade",
    "MCR zone ended by a conditional MCR": "MCR-Zone, beendet durch ein bedingtes MCR",
    "JMP into the middle of an MCR zone": "JMP mitten in eine MCR-Zone",
    "E (zone runs) toggles at (ms) — starts FALSE": "E (Zone läuft) wechselt bei (ms) — beginnt mit FALSE",
    "X (end MCR condition) toggles at (ms) — starts FALSE": "X (Bedingung des End-MCR) wechselt bei (ms) — beginnt mit FALSE",
    "X (jump) toggles at (ms) — starts FALSE": "X (Sprung) wechselt bei (ms) — beginnt mit FALSE",
    "Scan time, preset and duration must be whole milliseconds": "Zykluszeit, Vorgabe und Dauer müssen ganze Millisekunden sein",
    "Rungs 2–5 are skipped at {s}. On those scans nothing inside the zone is written: Y keeps its last value whatever A does (Y is TRUE at {y}).":
      "Strompfade 2–5 werden bei {s} übersprungen. In diesen Zyklen wird in der Zone nichts geschrieben: Y behält seinen letzten Wert, egal was A tut (Y ist bei {y} TRUE).",
    "{tag}.ACC jumps from {from} to {to} at {at} ms: the first scan back adds all the time since the timer last ran, whatever A did in between.":
      "{tag}.ACC springt bei {at} ms von {from} auf {to}: Der erste wieder ausgeführte Zyklus addiert die gesamte Zeit seit der letzten Ausführung des Timers, egal was A dazwischen getan hat.",
    "E is TRUE on every scan, so nothing is skipped. Make E FALSE for a while to see the jump.":
      "E ist in jedem Zyklus TRUE, also wird nichts übersprungen. Setzen Sie E eine Weile auf FALSE, um den Sprung zu sehen.",
    "The zone is disabled at {s}. Its rungs still run, as false: Y is FALSE and T1 is cleared, but T2.DN is TRUE at {tof} (a false rung starts a TOF) and T3.ACC holds.":
      "Die Zone ist bei {s} deaktiviert. Ihre Strompfade laufen weiter, aber als falsch: Y ist FALSE und T1 wird gelöscht, doch T2.DN ist bei {tof} TRUE (ein falscher Strompfad startet einen TOF) und T3.ACC bleibt erhalten.",
    "E is TRUE on every scan, so the zone is never disabled. Make E FALSE for a while to see the zone run false.":
      "E ist in jedem Zyklus TRUE, also wird die Zone nie deaktiviert. Setzen Sie E eine Weile auf FALSE, um die Zone falsch laufen zu sehen.",
    "Y2 is outside the zone, yet it is FALSE at {s} while A is TRUE: the zone was enabled and the end MCR's rung was false, so it toggled the override on for every rung after it.":
      "Y2 liegt außerhalb der Zone und ist trotzdem bei {s} FALSE, während A TRUE ist: Die Zone war aktiv und der Strompfad des End-MCR falsch, also hat es den Override für alle folgenden Strompfade eingeschaltet.",
    "Y2 follows A on every scan here. Make E TRUE while X is FALSE to see the end MCR switch it off.":
      "Hier folgt Y2 in jedem Zyklus A. Setzen Sie E auf TRUE, während X FALSE ist, um zu sehen, wie das End-MCR es abschaltet.",
    "Y2 is TRUE at {s} although E is FALSE: the jump skipped the starting MCR, so the zone was never disabled. Y1 was skipped and kept its value.":
      "Y2 ist bei {s} TRUE, obwohl E FALSE ist: Der Sprung hat das Start-MCR übersprungen, also wurde die Zone nie deaktiviert. Y1 wurde übersprungen und behielt seinen Wert.",
    "The jump never lands while E is FALSE here. Make X TRUE while E is FALSE to see the zone stay enabled.":
      "Hier springt nichts, solange E FALSE ist. Setzen Sie X auf TRUE, während E FALSE ist, um die Zone aktiv bleiben zu sehen.",
    "Each row is sampled once per scan, at the end of the scan": "Jede Zeile wird einmal pro Zyklus am Zyklusende erfasst",
    "Logix rules (RM003). Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Logix-Regeln (RM003). Strompfade laufen einmal pro Zyklus von oben nach unten; Eingänge werden zu Zyklusbeginn gelesen. Wechselzeiten wirken im ersten Zyklus zu oder nach diesem Zeitpunkt.",
  },
  zh: {
    "Program": "程序",
    "JMP over four rungs (E FALSE skips them)": "跳过四个梯级的 JMP（E 为 FALSE 时跳过）",
    "MCR zone around the same four rungs": "包住同样四个梯级的 MCR 区域",
    "MCR zone ended by a conditional MCR": "以带条件的 MCR 结束的 MCR 区域",
    "JMP into the middle of an MCR zone": "跳入 MCR 区域中间的 JMP",
    "E (zone runs) toggles at (ms) — starts FALSE": "E（区域运行）切换时刻 (ms) — 初始为 FALSE",
    "X (end MCR condition) toggles at (ms) — starts FALSE": "X（结束 MCR 条件）切换时刻 (ms) — 初始为 FALSE",
    "X (jump) toggles at (ms) — starts FALSE": "X（跳转）切换时刻 (ms) — 初始为 FALSE",
    "Scan time, preset and duration must be whole milliseconds": "扫描时间、预设值和时长必须为整数毫秒",
    "Rungs 2–5 are skipped at {s}. On those scans nothing inside the zone is written: Y keeps its last value whatever A does (Y is TRUE at {y}).":
      "梯级 2–5 在 {s} 被跳过。这些扫描中区域内不写入任何内容：无论 A 如何变化，Y 都保持上一次的值（Y 在 {y} 为 TRUE）。",
    "{tag}.ACC jumps from {from} to {to} at {at} ms: the first scan back adds all the time since the timer last ran, whatever A did in between.":
      "{tag}.ACC 在 {at} ms 从 {from} 跳到 {to}：恢复执行的第一个扫描会一次性加上自定时器上次执行以来的全部时间，不管其间 A 如何变化。",
    "E is TRUE on every scan, so nothing is skipped. Make E FALSE for a while to see the jump.":
      "E 在每个扫描都为 TRUE，因此没有梯级被跳过。让 E 暂时为 FALSE 即可看到跳转。",
    "The zone is disabled at {s}. Its rungs still run, as false: Y is FALSE and T1 is cleared, but T2.DN is TRUE at {tof} (a false rung starts a TOF) and T3.ACC holds.":
      "区域在 {s} 被禁用。其梯级仍会执行，但按假执行：Y 为 FALSE、T1 被清零，但 T2.DN 在 {tof} 为 TRUE（假梯级会启动 TOF），T3.ACC 保持不变。",
    "E is TRUE on every scan, so the zone is never disabled. Make E FALSE for a while to see the zone run false.":
      "E 在每个扫描都为 TRUE，因此区域从未被禁用。让 E 暂时为 FALSE 即可看到区域按假执行。",
    "Y2 is outside the zone, yet it is FALSE at {s} while A is TRUE: the zone was enabled and the end MCR's rung was false, so it toggled the override on for every rung after it.":
      "Y2 位于区域之外，但在 A 为 TRUE 的 {s} 却为 FALSE：区域处于启用状态而结束 MCR 的梯级为假，于是它为其后的所有梯级打开了覆盖。",
    "Y2 follows A on every scan here. Make E TRUE while X is FALSE to see the end MCR switch it off.":
      "这里 Y2 在每个扫描都跟随 A。在 X 为 FALSE 时让 E 为 TRUE，即可看到结束 MCR 将其关断。",
    "Y2 is TRUE at {s} although E is FALSE: the jump skipped the starting MCR, so the zone was never disabled. Y1 was skipped and kept its value.":
      "尽管 E 为 FALSE，Y2 在 {s} 仍为 TRUE：跳转越过了起始 MCR，因此区域从未被禁用。Y1 被跳过，保持原值。",
    "The jump never lands while E is FALSE here. Make X TRUE while E is FALSE to see the zone stay enabled.":
      "这里在 E 为 FALSE 时不会发生跳转。在 E 为 FALSE 时让 X 为 TRUE，即可看到区域保持启用。",
    "Each row is sampled once per scan, at the end of the scan": "每一行每个扫描记录一次，在扫描结束时",
    "Logix rules (RM003). Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.":
      "Logix 规则（RM003）。梯级每个扫描从上到下执行一次；输入在扫描开始时读取。切换时刻在该时刻或其后的第一个扫描生效。",
  },
};
