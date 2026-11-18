import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

/**
 * Batch J — PLC edge detection and one-shots. Instruction and bit names
 * (R_TRIG, F_TRIG, P, N, P_TRIG, N_TRIG, M_BIT, ONS, OSR, OSF, rung-out) stay
 * as the vendor manuals write them.
 */
export const BATCH_J: Record<SiteLocale, ToolDict> = {
  en: {},
  ko: {
    "Edge": "엣지",
    "Rising — R_TRIG / P vs ONS, OSR": "상승 — R_TRIG / P vs ONS, OSR",
    "Falling — F_TRIG / N vs OSF": "하강 — F_TRIG / N vs OSF",
    "IEC memory bit at power-up": "기동 시 IEC 메모리 비트",
    "Scan time and duration must be whole milliseconds": "스캔 시간과 구간은 정수 ms여야 합니다",
    "Pulses — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}": "펄스 — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}",
    "Pulses — IEC F_TRIG / N: {a} · OSF: {b}": "펄스 — IEC F_TRIG / N: {a} · OSF: {b}",
    "First scan: the input is already TRUE. With the memory bit starting FALSE the IEC/Siemens edge fires at 0 ms; ONS and OSR do not, because the Logix prescan sets their storage bit TRUE.":
      "첫 스캔: 입력이 이미 TRUE입니다. 메모리 비트가 FALSE로 시작하면 IEC/Siemens 엣지는 0 ms에 검출됩니다. ONS와 OSR은 검출하지 않습니다 — Logix 프리스캔이 storage 비트를 TRUE로 두기 때문입니다.",
    "First scan: the input is FALSE and the memory bit starts TRUE, so the IEC/Siemens edge reports a falling edge at 0 ms. OSF does not: the Logix prescan clears its storage bit.":
      "첫 스캔: 입력이 FALSE이고 메모리 비트가 TRUE로 시작해서 IEC/Siemens 엣지가 0 ms에 하강 엣지를 보고합니다. OSF는 보고하지 않습니다 — Logix 프리스캔이 storage 비트를 지우기 때문입니다.",
    "ONS turns the rest of its rung TRUE for one scan. OSR leaves its rung-condition-out equal to the rung and puts the pulse on a separate output bit — instructions after an OSR on the same rung see the full rung, not the pulse.":
      "ONS는 렁의 나머지를 한 스캔 동안 TRUE로 만듭니다. OSR은 rung-condition-out을 렁 조건 그대로 두고 펄스를 별도 출력 비트에 냅니다 — 같은 렁에서 OSR 뒤의 명령은 펄스가 아니라 렁 전체를 봅니다.",
    "The input changed and changed back between two scans at {a} — no instruction sees an edge there.":
      "{a}에서 입력이 두 스캔 사이에 바뀌었다가 되돌아왔습니다 — 어떤 명령도 그 엣지를 보지 못합니다.",
    "IEC R_TRIG · Siemens P contact / P_TRIG (memory bit M)": "IEC R_TRIG · Siemens P 접점 / P_TRIG (메모리 비트 M)",
    "IEC F_TRIG · Siemens N contact / N_TRIG (memory bit M)": "IEC F_TRIG · Siemens N 접점 / N_TRIG (메모리 비트 M)",
    "Allen-Bradley ONS — the pulse is the rung-condition-out": "Allen-Bradley ONS — 펄스가 곧 rung-condition-out",
    "Allen-Bradley OSR — pulse on the output bit, rung passes through": "Allen-Bradley OSR — 펄스는 출력 비트에, 렁은 그대로 통과",
    "Allen-Bradley OSF — pulse on the output bit": "Allen-Bradley OSF — 펄스는 출력 비트에",
  },
  ja: {
    "Edge": "エッジ",
    "Rising — R_TRIG / P vs ONS, OSR": "立上り — R_TRIG / P vs ONS, OSR",
    "Falling — F_TRIG / N vs OSF": "立下り — F_TRIG / N vs OSF",
    "IEC memory bit at power-up": "起動時のIECメモリビット",
    "Scan time and duration must be whole milliseconds": "スキャンタイムと表示区間は整数のmsで入力してください",
    "Pulses — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}": "パルス — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}",
    "Pulses — IEC F_TRIG / N: {a} · OSF: {b}": "パルス — IEC F_TRIG / N: {a} · OSF: {b}",
    "First scan: the input is already TRUE. With the memory bit starting FALSE the IEC/Siemens edge fires at 0 ms; ONS and OSR do not, because the Logix prescan sets their storage bit TRUE.":
      "最初のスキャン: 入力はすでにTRUEです。メモリビットがFALSEで始まるとIEC/Siemensのエッジは0 msで検出されます。ONSとOSRは検出しません — Logixのプリスキャンがstorageビットを TRUE にするためです。",
    "First scan: the input is FALSE and the memory bit starts TRUE, so the IEC/Siemens edge reports a falling edge at 0 ms. OSF does not: the Logix prescan clears its storage bit.":
      "最初のスキャン: 入力がFALSEでメモリビットがTRUEで始まるため、IEC/Siemensのエッジは0 msで立下りを報告します。OSFは報告しません — Logixのプリスキャンがstorageビットをクリアするためです。",
    "ONS turns the rest of its rung TRUE for one scan. OSR leaves its rung-condition-out equal to the rung and puts the pulse on a separate output bit — instructions after an OSR on the same rung see the full rung, not the pulse.":
      "ONSはラングの残りを1スキャンだけTRUEにします。OSRはrung-condition-outをラング条件のままにし、パルスを別の出力ビットに出します — 同じラングでOSRの後の命令はパルスではなくラング全体を見ます。",
    "The input changed and changed back between two scans at {a} — no instruction sees an edge there.":
      "{a}で入力が2つのスキャンの間に変化して元に戻りました — どの命令もそのエッジを見ません。",
    "IEC R_TRIG · Siemens P contact / P_TRIG (memory bit M)": "IEC R_TRIG · Siemens P接点 / P_TRIG（メモリビットM）",
    "IEC F_TRIG · Siemens N contact / N_TRIG (memory bit M)": "IEC F_TRIG · Siemens N接点 / N_TRIG（メモリビットM）",
    "Allen-Bradley ONS — the pulse is the rung-condition-out": "Allen-Bradley ONS — パルスがそのままrung-condition-out",
    "Allen-Bradley OSR — pulse on the output bit, rung passes through": "Allen-Bradley OSR — パルスは出力ビットに、ラングは素通り",
    "Allen-Bradley OSF — pulse on the output bit": "Allen-Bradley OSF — パルスは出力ビットに",
  },
  de: {
    "Edge": "Flanke",
    "Rising — R_TRIG / P vs ONS, OSR": "Steigend — R_TRIG / P vs ONS, OSR",
    "Falling — F_TRIG / N vs OSF": "Fallend — F_TRIG / N vs OSF",
    "IEC memory bit at power-up": "IEC-Merkerbit beim Anlauf",
    "Scan time and duration must be whole milliseconds": "Zykluszeit und Zeitraum müssen ganze Millisekunden sein",
    "Pulses — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}": "Impulse — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}",
    "Pulses — IEC F_TRIG / N: {a} · OSF: {b}": "Impulse — IEC F_TRIG / N: {a} · OSF: {b}",
    "First scan: the input is already TRUE. With the memory bit starting FALSE the IEC/Siemens edge fires at 0 ms; ONS and OSR do not, because the Logix prescan sets their storage bit TRUE.":
      "Erster Zyklus: Der Eingang ist bereits TRUE. Beginnt das Merkerbit mit FALSE, meldet die IEC/Siemens-Flanke bei 0 ms; ONS und OSR nicht, weil der Logix-Prescan ihr Storage-Bit auf TRUE setzt.",
    "First scan: the input is FALSE and the memory bit starts TRUE, so the IEC/Siemens edge reports a falling edge at 0 ms. OSF does not: the Logix prescan clears its storage bit.":
      "Erster Zyklus: Der Eingang ist FALSE und das Merkerbit beginnt mit TRUE, also meldet die IEC/Siemens-Flanke bei 0 ms eine fallende Flanke. OSF nicht: Der Logix-Prescan löscht sein Storage-Bit.",
    "ONS turns the rest of its rung TRUE for one scan. OSR leaves its rung-condition-out equal to the rung and puts the pulse on a separate output bit — instructions after an OSR on the same rung see the full rung, not the pulse.":
      "ONS schaltet den Rest seines Strompfads für einen Zyklus auf TRUE. OSR lässt rung-condition-out gleich dem Strompfad und legt den Impuls auf ein eigenes Ausgangsbit — Anweisungen nach einem OSR im selben Strompfad sehen den ganzen Strompfad, nicht den Impuls.",
    "The input changed and changed back between two scans at {a} — no instruction sees an edge there.":
      "Bei {a} hat sich der Eingang zwischen zwei Zyklen geändert und wieder zurückgeändert — keine Anweisung sieht dort eine Flanke.",
    "IEC R_TRIG · Siemens P contact / P_TRIG (memory bit M)": "IEC R_TRIG · Siemens P-Kontakt / P_TRIG (Merkerbit M)",
    "IEC F_TRIG · Siemens N contact / N_TRIG (memory bit M)": "IEC F_TRIG · Siemens N-Kontakt / N_TRIG (Merkerbit M)",
    "Allen-Bradley ONS — the pulse is the rung-condition-out": "Allen-Bradley ONS — der Impuls ist das rung-condition-out",
    "Allen-Bradley OSR — pulse on the output bit, rung passes through": "Allen-Bradley OSR — Impuls auf dem Ausgangsbit, Strompfad läuft durch",
    "Allen-Bradley OSF — pulse on the output bit": "Allen-Bradley OSF — Impuls auf dem Ausgangsbit",
  },
  zh: {
    "Edge": "边沿",
    "Rising — R_TRIG / P vs ONS, OSR": "上升沿 — R_TRIG / P vs ONS, OSR",
    "Falling — F_TRIG / N vs OSF": "下降沿 — F_TRIG / N vs OSF",
    "IEC memory bit at power-up": "上电时 IEC 存储位",
    "Scan time and duration must be whole milliseconds": "扫描时间和时长必须是整数毫秒",
    "Pulses — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}": "脉冲 — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}",
    "Pulses — IEC F_TRIG / N: {a} · OSF: {b}": "脉冲 — IEC F_TRIG / N: {a} · OSF: {b}",
    "First scan: the input is already TRUE. With the memory bit starting FALSE the IEC/Siemens edge fires at 0 ms; ONS and OSR do not, because the Logix prescan sets their storage bit TRUE.":
      "首个扫描：输入已为 TRUE。存储位初始为 FALSE 时，IEC/Siemens 边沿在 0 ms 触发；ONS 和 OSR 不触发，因为 Logix 预扫描将其 storage 位置为 TRUE。",
    "First scan: the input is FALSE and the memory bit starts TRUE, so the IEC/Siemens edge reports a falling edge at 0 ms. OSF does not: the Logix prescan clears its storage bit.":
      "首个扫描：输入为 FALSE 且存储位初始为 TRUE，因此 IEC/Siemens 边沿在 0 ms 报告下降沿。OSF 不报告：Logix 预扫描清除了其 storage 位。",
    "ONS turns the rest of its rung TRUE for one scan. OSR leaves its rung-condition-out equal to the rung and puts the pulse on a separate output bit — instructions after an OSR on the same rung see the full rung, not the pulse.":
      "ONS 使其梯级的其余部分在一个扫描周期内为 TRUE。OSR 让 rung-condition-out 保持等于梯级条件，并把脉冲放在单独的输出位上 — 同一梯级中 OSR 之后的指令看到的是整个梯级，而不是脉冲。",
    "The input changed and changed back between two scans at {a} — no instruction sees an edge there.":
      "输入在 {a} 于两次扫描之间变化又恢复 — 任何指令都看不到该边沿。",
    "IEC R_TRIG · Siemens P contact / P_TRIG (memory bit M)": "IEC R_TRIG · Siemens P 触点 / P_TRIG（存储位 M）",
    "IEC F_TRIG · Siemens N contact / N_TRIG (memory bit M)": "IEC F_TRIG · Siemens N 触点 / N_TRIG（存储位 M）",
    "Allen-Bradley ONS — the pulse is the rung-condition-out": "Allen-Bradley ONS — 脉冲即 rung-condition-out",
    "Allen-Bradley OSR — pulse on the output bit, rung passes through": "Allen-Bradley OSR — 脉冲在输出位上，梯级直通",
    "Allen-Bradley OSF — pulse on the output bit": "Allen-Bradley OSF — 脉冲在输出位上",
  },
};
