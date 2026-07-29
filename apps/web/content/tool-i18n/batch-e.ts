// Batch e tool strings — Measurement Accuracy Calculator. Keys are the English
// source text exactly as it appears at the call site; a missing key falls back
// to that English text. Placeholders ({n}, {p}, {v}) must survive translation.

import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

export const BATCH_E: Record<SiteLocale, ToolDict> = {
  en: {},

  ko: {
    // 계측기 프리셋 / 입력
    Instrument: "계측기",
    "Manual entry — type your spec": "직접 입력 — 사양을 타이핑",
    "Preset range": "프리셋 레인지",
    Reading: "측정값",
    "Range (full scale)": "레인지 (풀 스케일)",
    Unit: "단위",

    // 사양 항
    "Accuracy specification": "정확도 사양",
    "Proportional term unit": "비례항 단위",
    "% of reading": "측정값의 %",
    "ppm of reading": "측정값의 ppm",
    "% of range": "레인지의 %",
    "ppm of range": "레인지의 ppm",
    "Counts / digits": "카운트 / 디지트",
    "Fixed offset": "고정 오프셋",

    // 카운트 크기
    "Size one count from": "1 카운트 크기 기준",
    "Display counts at full scale (6000, 20000…)": "풀 스케일 표시 카운트 (6000, 20000…)",
    "Display digits (3.5, 4.5, 5.5…)": "표시 자릿수 (3.5, 4.5, 5.5…)",
    "Resolution — value of one count": "분해능 — 1 카운트의 값",
    "Over-ranges to {n} counts before switching range.":
      "레인지를 바꾸기 전까지 최대 {n} 카운트까지 표시합니다.",
    "Enter at least one term of your instrument's accuracy specification.":
      "계측기 정확도 사양의 항을 최소 하나 입력하세요.",

    // 결과
    "Uncertainty (±)": "불확도 (±)",
    Interval: "구간",
    "As % of reading": "측정값 대비 %",
    "As ppm of reading": "측정값 대비 ppm",

    // 항별 분해
    "Where the uncertainty comes from": "불확도의 구성",
    Term: "항",
    Contribution: "기여분",
    Share: "비중",
    "does not shrink with the reading": "측정값이 줄어도 작아지지 않음",
    "Reading is {p} % of full scale.": "측정값은 풀 스케일의 {p} %입니다.",
    "one count = {v}": "1 카운트 = {v}",
    "terms cross over at {v}": "{v}에서 두 항이 교차",

    // 경고 / 주석
    "The reading is past full scale, so the published specification no longer applies to it.":
      "측정값이 풀 스케일을 넘었습니다. 공표된 사양은 이 지점에 더 이상 적용되지 않습니다.",
    "The terms that do not depend on the reading now make up more than half the error. This is the small-value-on-a-large-range case: the same reading taken on the smallest range that still fits it will have a smaller absolute uncertainty.":
      "측정값과 무관한 항이 오차의 절반을 넘었습니다. 큰 레인지에서 작은 값을 재는 전형적인 경우입니다. 신호가 들어가는 가장 작은 레인지로 바꾸면 절대 불확도가 줄어듭니다.",
    "Terms are added, not root-sum-squared, because a published accuracy specification is a single guaranteed limit of error rather than a set of independent random contributions. It also assumes the instrument is inside its stated calibration interval and temperature window.":
      "각 항은 RSS가 아니라 단순 합산합니다. 공표된 정확도 사양은 독립적인 확률 성분의 모음이 아니라 하나의 보증된 오차 한계이기 때문입니다. 또한 계측기가 명시된 교정 주기와 온도 범위 안에 있다는 전제가 붙습니다.",
  },

  ja: {
    Instrument: "測定器",
    "Manual entry — type your spec": "手入力 — 仕様を直接入力",
    "Preset range": "プリセットレンジ",
    Reading: "測定値",
    "Range (full scale)": "レンジ (フルスケール)",
    Unit: "単位",

    "Accuracy specification": "確度仕様",
    "Proportional term unit": "比例項の単位",
    "% of reading": "測定値の %",
    "ppm of reading": "測定値の ppm",
    "% of range": "レンジの %",
    "ppm of range": "レンジの ppm",
    "Counts / digits": "カウント / デジット",
    "Fixed offset": "固定オフセット",

    "Size one count from": "1 カウントの大きさの基準",
    "Display counts at full scale (6000, 20000…)": "フルスケールの表示カウント (6000, 20000…)",
    "Display digits (3.5, 4.5, 5.5…)": "表示桁数 (3.5, 4.5, 5.5…)",
    "Resolution — value of one count": "分解能 — 1 カウントの値",
    "Over-ranges to {n} counts before switching range.":
      "レンジ切り替えまで最大 {n} カウントまで表示します。",
    "Enter at least one term of your instrument's accuracy specification.":
      "測定器の確度仕様の項を少なくとも 1 つ入力してください。",

    "Uncertainty (±)": "不確かさ (±)",
    Interval: "区間",
    "As % of reading": "測定値に対する %",
    "As ppm of reading": "測定値に対する ppm",

    "Where the uncertainty comes from": "不確かさの内訳",
    Term: "項",
    Contribution: "寄与",
    Share: "割合",
    "does not shrink with the reading": "測定値が小さくなっても減らない",
    "Reading is {p} % of full scale.": "測定値はフルスケールの {p} % です。",
    "one count = {v}": "1 カウント = {v}",
    "terms cross over at {v}": "{v} で 2 つの項が入れ替わる",

    "The reading is past full scale, so the published specification no longer applies to it.":
      "測定値がフルスケールを超えています。公表された仕様はこの点には適用されません。",
    "The terms that do not depend on the reading now make up more than half the error. This is the small-value-on-a-large-range case: the same reading taken on the smallest range that still fits it will have a smaller absolute uncertainty.":
      "測定値に依存しない項が誤差の半分を超えました。大きなレンジで小さな値を測る典型的なケースです。信号が収まる最小のレンジに切り替えれば絶対不確かさは小さくなります。",
    "Terms are added, not root-sum-squared, because a published accuracy specification is a single guaranteed limit of error rather than a set of independent random contributions. It also assumes the instrument is inside its stated calibration interval and temperature window.":
      "各項は RSS ではなく単純加算します。公表された確度仕様は独立したランダム成分の集合ではなく、保証された 1 つの誤差限界だからです。さらに、測定器が規定の校正周期と温度範囲の内側にあることが前提です。",
  },

  de: {
    Instrument: "Messgerät",
    "Manual entry — type your spec": "Manuelle Eingabe — Spezifikation eintippen",
    "Preset range": "Voreingestellter Bereich",
    Reading: "Messwert",
    "Range (full scale)": "Bereich (Endwert)",
    Unit: "Einheit",

    "Accuracy specification": "Genauigkeitsspezifikation",
    "Proportional term unit": "Einheit der proportionalen Terme",
    "% of reading": "% vom Messwert",
    "ppm of reading": "ppm vom Messwert",
    "% of range": "% vom Bereich",
    "ppm of range": "ppm vom Bereich",
    "Counts / digits": "Counts / Digits",
    "Fixed offset": "Fester Offset",

    "Size one count from": "Größe eines Counts aus",
    "Display counts at full scale (6000, 20000…)": "Anzeige-Counts bei Endwert (6000, 20000…)",
    "Display digits (3.5, 4.5, 5.5…)": "Anzeigestellen (3,5, 4,5, 5,5…)",
    "Resolution — value of one count": "Auflösung — Wert eines Counts",
    "Over-ranges to {n} counts before switching range.":
      "Übersteuert bis {n} Counts, bevor der Bereich gewechselt wird.",
    "Enter at least one term of your instrument's accuracy specification.":
      "Geben Sie mindestens einen Term der Genauigkeitsspezifikation Ihres Geräts ein.",

    "Uncertainty (±)": "Unsicherheit (±)",
    Interval: "Intervall",
    "As % of reading": "In % vom Messwert",
    "As ppm of reading": "In ppm vom Messwert",

    "Where the uncertainty comes from": "Woher die Unsicherheit kommt",
    Term: "Term",
    Contribution: "Beitrag",
    Share: "Anteil",
    "does not shrink with the reading": "sinkt nicht mit dem Messwert",
    "Reading is {p} % of full scale.": "Der Messwert liegt bei {p} % des Endwerts.",
    "one count = {v}": "ein Count = {v}",
    "terms cross over at {v}": "Terme kreuzen sich bei {v}",

    "The reading is past full scale, so the published specification no longer applies to it.":
      "Der Messwert liegt über dem Endwert — die veröffentlichte Spezifikation gilt dort nicht mehr.",
    "The terms that do not depend on the reading now make up more than half the error. This is the small-value-on-a-large-range case: the same reading taken on the smallest range that still fits it will have a smaller absolute uncertainty.":
      "Die vom Messwert unabhängigen Terme machen jetzt mehr als die Hälfte des Fehlers aus. Das ist der Fall „kleiner Wert im großen Bereich“: derselbe Messwert im kleinsten noch passenden Bereich hat eine kleinere absolute Unsicherheit.",
    "Terms are added, not root-sum-squared, because a published accuracy specification is a single guaranteed limit of error rather than a set of independent random contributions. It also assumes the instrument is inside its stated calibration interval and temperature window.":
      "Die Terme werden addiert, nicht quadratisch summiert (RSS): eine veröffentlichte Genauigkeitsspezifikation ist eine einzelne garantierte Fehlergrenze und keine Menge unabhängiger zufälliger Beiträge. Sie setzt außerdem voraus, dass das Gerät innerhalb des angegebenen Kalibrierintervalls und Temperaturfensters betrieben wird.",
  },

  zh: {
    Instrument: "仪器",
    "Manual entry — type your spec": "手动输入 — 直接键入规格",
    "Preset range": "预设量程",
    Reading: "读数",
    "Range (full scale)": "量程（满量程）",
    Unit: "单位",

    "Accuracy specification": "准确度指标",
    "Proportional term unit": "比例项单位",
    "% of reading": "读数的 %",
    "ppm of reading": "读数的 ppm",
    "% of range": "量程的 %",
    "ppm of range": "量程的 ppm",
    "Counts / digits": "字数 / 位数",
    "Fixed offset": "固定偏置",

    "Size one count from": "一个字的大小依据",
    "Display counts at full scale (6000, 20000…)": "满量程显示字数（6000、20000…）",
    "Display digits (3.5, 4.5, 5.5…)": "显示位数（3.5、4.5、5.5…）",
    "Resolution — value of one count": "分辨力 — 一个字的数值",
    "Over-ranges to {n} counts before switching range.": "切换量程前最多可显示到 {n} 个字。",
    "Enter at least one term of your instrument's accuracy specification.":
      "请至少输入仪器准确度指标中的一项。",

    "Uncertainty (±)": "不确定度（±）",
    Interval: "区间",
    "As % of reading": "占读数的 %",
    "As ppm of reading": "占读数的 ppm",

    "Where the uncertainty comes from": "不确定度的构成",
    Term: "项",
    Contribution: "贡献量",
    Share: "占比",
    "does not shrink with the reading": "不随读数减小",
    "Reading is {p} % of full scale.": "读数为满量程的 {p} %。",
    "one count = {v}": "一个字 = {v}",
    "terms cross over at {v}": "两项在 {v} 处交叉",

    "The reading is past full scale, so the published specification no longer applies to it.":
      "读数已超过满量程，公布的指标在此处不再适用。",
    "The terms that do not depend on the reading now make up more than half the error. This is the small-value-on-a-large-range case: the same reading taken on the smallest range that still fits it will have a smaller absolute uncertainty.":
      "与读数无关的项已占误差的一半以上。这就是「大量程测小信号」的情形：把同一读数换到仍能容纳信号的最小量程上，绝对不确定度会更小。",
    "Terms are added, not root-sum-squared, because a published accuracy specification is a single guaranteed limit of error rather than a set of independent random contributions. It also assumes the instrument is inside its stated calibration interval and temperature window.":
      "各项相加而不是方和根（RSS）合成，因为公布的准确度指标是一条有保证的误差限，而不是一组相互独立的随机分量。它同时假定仪器处于规定的校准周期和温度范围之内。",
  },
};
