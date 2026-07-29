// Batch f tool strings — NTC thermistor calculator. Keys are the English
// source text exactly as it appears at the call site; a missing key falls back
// to that English text. Keys already carried by an earlier batch
// ("Temperature", "Resistance", "Temperature (°C)") are not repeated here.

import type { SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";

export const BATCH_F: Record<SiteLocale, ToolDict> = {
  en: {},

  ko: {
    Direction: "방향",
    "Resistance → temperature": "저항 → 온도",
    "Temperature → resistance": "온도 → 저항",
    "Measured resistance (Ω)": "측정 저항 (Ω)",
    "R0 (Ω)": "R0 (Ω)",
    "T0 (°C)": "T0 (°C)",
    "B parameter": "B 파라미터",
    "Enter B from the datasheet": "데이터시트의 B 값 입력",
    "Derive B from the Steinhart-Hart curve": "Steinhart-Hart 곡선에서 B 유도",
    "B (K)": "B (K)",
    "B measured from (°C)": "B 측정 시작 온도 (°C)",
    "to (°C)": "끝 온도 (°C)",
    "B is defined between two temperatures — this result assumes {label}.":
      "B는 두 온도 사이에서 정의됩니다 — 이 결과는 {label} 기준입니다.",
    "The fitted curve gives {label} = {beta} K.": "피팅된 곡선에서는 {label} = {beta} K입니다.",
    "Steinhart-Hart (3 constants)": "Steinhart-Hart (상수 3개)",
    "Beta equation": "Beta 식",
    "Beta − Steinhart-Hart": "Beta − Steinhart-Hart",
    "A, B, C in use": "사용 중인 A, B, C",
    "Steinhart-Hart coefficients": "Steinhart-Hart 계수",
    "Fit A, B and C from three (R, T) points": "(R, T) 3점으로 A, B, C 피팅",
    "Enter A, B and C directly": "A, B, C 직접 입력",
    "Load datasheet points": "데이터시트 점 불러오기",
    "Point {n}": "점 {n}",
    "Resistance (Ω)": "저항 (Ω)",
    "Checked against all {n} rows of the datasheet table: worst {worst} °C at {at} °C, RMS {rms} °C.":
      "데이터시트 표 {n}행 전체와 대조: 최대 오차 {worst} °C ({at} °C), RMS {rms} °C.",
    "What the Beta equation costs from {lo} °C to {hi} °C":
      "{lo} °C ~ {hi} °C 구간에서 Beta 식이 치르는 대가",
    "Beta reads": "Beta 식 값",
    Error: "오차",
    "Steinhart-Hart is treated as the reference here. The error column is what a Beta-only conversion would read at the same resistance — near zero at T0 and at the second temperature B was measured at, and growing at both ends of the range.":
      "여기서는 Steinhart-Hart를 기준으로 둡니다. 오차 열은 같은 저항에서 Beta 식만으로 변환했을 때 읽히는 값이며, T0와 B를 측정한 두 번째 온도 부근에서는 거의 0이고 범위 양 끝으로 갈수록 커집니다.",
    "Voltage divider and ADC counts (optional)": "전압 분배기 · ADC 카운트 (선택)",
    Topology: "구성",
    "Series resistor to supply, thermistor to ground": "직렬 저항이 전원 쪽, 서미스터가 접지 쪽",
    "Thermistor to supply, series resistor to ground": "서미스터가 전원 쪽, 직렬 저항이 접지 쪽",
    "Series resistor (Ω)": "직렬 저항 (Ω)",
    "Supply (V)": "공급 전압 (V)",
    "ADC resolution (bits)": "ADC 분해능 (비트)",
    "Thermistor resistance": "서미스터 저항",
    "Divider output": "분배기 출력",
    "ADC count": "ADC 카운트",
    "Counts assume the ADC reference is the same rail as the divider supply (ratiometric) and that full scale is the all-ones code: ratio = count / (2^N − 1). Self-heating is not modelled — the divider current warms the thermistor, which is a real error at low series resistance.":
      "카운트는 ADC 기준전압이 분배기 공급 전원과 같은 레일(비율식)이고 풀스케일이 전부 1인 코드라고 가정합니다: ratio = count / (2^N − 1). 자기가열은 반영하지 않았습니다 — 분배기 전류가 서미스터를 데우며, 직렬 저항이 작을수록 실제 오차로 나타납니다.",
  },

  ja: {
    Direction: "方向",
    "Resistance → temperature": "抵抗 → 温度",
    "Temperature → resistance": "温度 → 抵抗",
    "Measured resistance (Ω)": "測定抵抗 (Ω)",
    "R0 (Ω)": "R0 (Ω)",
    "T0 (°C)": "T0 (°C)",
    "B parameter": "B定数",
    "Enter B from the datasheet": "データシートのB値を入力",
    "Derive B from the Steinhart-Hart curve": "Steinhart-Hart 曲線からBを導出",
    "B (K)": "B (K)",
    "B measured from (°C)": "Bの測定開始温度 (°C)",
    "to (°C)": "終了温度 (°C)",
    "B is defined between two temperatures — this result assumes {label}.":
      "Bは2つの温度の間で定義されます — この結果は {label} を前提としています。",
    "The fitted curve gives {label} = {beta} K.":
      "フィッティング曲線では {label} = {beta} K です。",
    "Steinhart-Hart (3 constants)": "Steinhart-Hart (定数3個)",
    "Beta equation": "Beta 式",
    "Beta − Steinhart-Hart": "Beta − Steinhart-Hart",
    "A, B, C in use": "使用中の A, B, C",
    "Steinhart-Hart coefficients": "Steinhart-Hart 係数",
    "Fit A, B and C from three (R, T) points": "(R, T) 3点から A, B, C をフィッティング",
    "Enter A, B and C directly": "A, B, C を直接入力",
    "Load datasheet points": "データシートの点を読み込む",
    "Point {n}": "点 {n}",
    "Resistance (Ω)": "抵抗 (Ω)",
    "Checked against all {n} rows of the datasheet table: worst {worst} °C at {at} °C, RMS {rms} °C.":
      "データシート表の全 {n} 行と照合: 最大誤差 {worst} °C ({at} °C)、RMS {rms} °C。",
    "What the Beta equation costs from {lo} °C to {hi} °C":
      "{lo} °C ~ {hi} °C で Beta 式が生む誤差",
    "Beta reads": "Beta 式の読み",
    Error: "誤差",
    "Steinhart-Hart is treated as the reference here. The error column is what a Beta-only conversion would read at the same resistance — near zero at T0 and at the second temperature B was measured at, and growing at both ends of the range.":
      "ここでは Steinhart-Hart を基準としています。誤差列は、同じ抵抗値に対して Beta 式のみで換算した場合の読み値です。T0 と B を測定した2番目の温度の付近ではほぼ0で、範囲の両端に向かうほど大きくなります。",
    "Voltage divider and ADC counts (optional)": "分圧回路と ADC カウント (任意)",
    Topology: "構成",
    "Series resistor to supply, thermistor to ground": "直列抵抗を電源側、サーミスタをGND側",
    "Thermistor to supply, series resistor to ground": "サーミスタを電源側、直列抵抗をGND側",
    "Series resistor (Ω)": "直列抵抗 (Ω)",
    "Supply (V)": "電源電圧 (V)",
    "ADC resolution (bits)": "ADC 分解能 (ビット)",
    "Thermistor resistance": "サーミスタ抵抗",
    "Divider output": "分圧出力",
    "ADC count": "ADC カウント",
    "Counts assume the ADC reference is the same rail as the divider supply (ratiometric) and that full scale is the all-ones code: ratio = count / (2^N − 1). Self-heating is not modelled — the divider current warms the thermistor, which is a real error at low series resistance.":
      "カウントは、ADC の基準電圧が分圧回路の電源と同じレール(レシオメトリック)であり、フルスケールが全ビット1のコードであることを前提とします: ratio = count / (2^N − 1)。自己発熱は考慮していません — 分圧回路の電流がサーミスタを加熱し、直列抵抗が小さいほど実際の誤差になります。",
  },

  de: {
    Direction: "Richtung",
    "Resistance → temperature": "Widerstand → Temperatur",
    "Temperature → resistance": "Temperatur → Widerstand",
    "Measured resistance (Ω)": "Gemessener Widerstand (Ω)",
    "R0 (Ω)": "R0 (Ω)",
    "T0 (°C)": "T0 (°C)",
    "B parameter": "B-Parameter",
    "Enter B from the datasheet": "B aus dem Datenblatt eingeben",
    "Derive B from the Steinhart-Hart curve": "B aus der Steinhart-Hart-Kurve ableiten",
    "B (K)": "B (K)",
    "B measured from (°C)": "B gemessen von (°C)",
    "to (°C)": "bis (°C)",
    "B is defined between two temperatures — this result assumes {label}.":
      "B ist zwischen zwei Temperaturen definiert — dieses Ergebnis setzt {label} voraus.",
    "The fitted curve gives {label} = {beta} K.":
      "Die gefittete Kurve ergibt {label} = {beta} K.",
    "Steinhart-Hart (3 constants)": "Steinhart-Hart (3 Konstanten)",
    "Beta equation": "Beta-Gleichung",
    "Beta − Steinhart-Hart": "Beta − Steinhart-Hart",
    "A, B, C in use": "Verwendete A, B, C",
    "Steinhart-Hart coefficients": "Steinhart-Hart-Koeffizienten",
    "Fit A, B and C from three (R, T) points": "A, B und C aus drei (R, T)-Punkten fitten",
    "Enter A, B and C directly": "A, B und C direkt eingeben",
    "Load datasheet points": "Datenblattpunkte laden",
    "Point {n}": "Punkt {n}",
    "Resistance (Ω)": "Widerstand (Ω)",
    "Checked against all {n} rows of the datasheet table: worst {worst} °C at {at} °C, RMS {rms} °C.":
      "Gegen alle {n} Zeilen der Datenblatttabelle geprüft: größter Fehler {worst} °C bei {at} °C, RMS {rms} °C.",
    "What the Beta equation costs from {lo} °C to {hi} °C":
      "Was die Beta-Gleichung von {lo} °C bis {hi} °C kostet",
    "Beta reads": "Beta liest",
    Error: "Fehler",
    "Steinhart-Hart is treated as the reference here. The error column is what a Beta-only conversion would read at the same resistance — near zero at T0 and at the second temperature B was measured at, and growing at both ends of the range.":
      "Steinhart-Hart gilt hier als Referenz. Die Fehlerspalte zeigt, was eine reine Beta-Umrechnung beim selben Widerstand anzeigen würde — nahe null bei T0 und bei der zweiten Temperatur, für die B bestimmt wurde, und wachsend zu beiden Enden des Bereichs.",
    "Voltage divider and ADC counts (optional)": "Spannungsteiler und ADC-Counts (optional)",
    Topology: "Topologie",
    "Series resistor to supply, thermistor to ground":
      "Serienwiderstand an Versorgung, Thermistor an Masse",
    "Thermistor to supply, series resistor to ground":
      "Thermistor an Versorgung, Serienwiderstand an Masse",
    "Series resistor (Ω)": "Serienwiderstand (Ω)",
    "Supply (V)": "Versorgung (V)",
    "ADC resolution (bits)": "ADC-Auflösung (Bit)",
    "Thermistor resistance": "Thermistorwiderstand",
    "Divider output": "Teilerausgang",
    "ADC count": "ADC-Count",
    "Counts assume the ADC reference is the same rail as the divider supply (ratiometric) and that full scale is the all-ones code: ratio = count / (2^N − 1). Self-heating is not modelled — the divider current warms the thermistor, which is a real error at low series resistance.":
      "Die Counts setzen voraus, dass die ADC-Referenz dieselbe Schiene wie die Teilerversorgung ist (ratiometrisch) und dass der Vollausschlag der Code aus lauter Einsen ist: ratio = count / (2^N − 1). Eigenerwärmung ist nicht modelliert — der Teilerstrom erwärmt den Thermistor, was bei kleinem Serienwiderstand ein realer Fehler ist.",
  },

  zh: {
    Direction: "方向",
    "Resistance → temperature": "电阻 → 温度",
    "Temperature → resistance": "温度 → 电阻",
    "Measured resistance (Ω)": "测得电阻 (Ω)",
    "R0 (Ω)": "R0 (Ω)",
    "T0 (°C)": "T0 (°C)",
    "B parameter": "B 值参数",
    "Enter B from the datasheet": "输入数据手册中的 B 值",
    "Derive B from the Steinhart-Hart curve": "由 Steinhart-Hart 曲线导出 B",
    "B (K)": "B (K)",
    "B measured from (°C)": "B 测量起始温度 (°C)",
    "to (°C)": "至 (°C)",
    "B is defined between two temperatures — this result assumes {label}.":
      "B 定义在两个温度之间 — 此结果基于 {label}。",
    "The fitted curve gives {label} = {beta} K.": "拟合曲线给出 {label} = {beta} K。",
    "Steinhart-Hart (3 constants)": "Steinhart-Hart（3 个常数）",
    "Beta equation": "Beta 方程",
    "Beta − Steinhart-Hart": "Beta − Steinhart-Hart",
    "A, B, C in use": "当前使用的 A、B、C",
    "Steinhart-Hart coefficients": "Steinhart-Hart 系数",
    "Fit A, B and C from three (R, T) points": "由三个 (R, T) 点拟合 A、B、C",
    "Enter A, B and C directly": "直接输入 A、B、C",
    "Load datasheet points": "载入数据手册数据点",
    "Point {n}": "点 {n}",
    "Resistance (Ω)": "电阻 (Ω)",
    "Checked against all {n} rows of the datasheet table: worst {worst} °C at {at} °C, RMS {rms} °C.":
      "已与数据手册表格全部 {n} 行比对：最大误差 {worst} °C（{at} °C），RMS {rms} °C。",
    "What the Beta equation costs from {lo} °C to {hi} °C":
      "{lo} °C 至 {hi} °C 范围内 Beta 方程的代价",
    "Beta reads": "Beta 读数",
    Error: "误差",
    "Steinhart-Hart is treated as the reference here. The error column is what a Beta-only conversion would read at the same resistance — near zero at T0 and at the second temperature B was measured at, and growing at both ends of the range.":
      "此处以 Steinhart-Hart 为基准。误差列表示在相同电阻下仅用 Beta 方程换算所读到的值 — 在 T0 以及标定 B 的第二个温度附近接近于零，向量程两端逐渐增大。",
    "Voltage divider and ADC counts (optional)": "分压电路与 ADC 计数（可选）",
    Topology: "拓扑",
    "Series resistor to supply, thermistor to ground": "串联电阻接电源，热敏电阻接地",
    "Thermistor to supply, series resistor to ground": "热敏电阻接电源，串联电阻接地",
    "Series resistor (Ω)": "串联电阻 (Ω)",
    "Supply (V)": "供电电压 (V)",
    "ADC resolution (bits)": "ADC 分辨率（位）",
    "Thermistor resistance": "热敏电阻阻值",
    "Divider output": "分压输出",
    "ADC count": "ADC 计数",
    "Counts assume the ADC reference is the same rail as the divider supply (ratiometric) and that full scale is the all-ones code: ratio = count / (2^N − 1). Self-heating is not modelled — the divider current warms the thermistor, which is a real error at low series resistance.":
      "计数假设 ADC 基准与分压供电为同一电源轨（比例式），且满量程为全 1 码：ratio = count / (2^N − 1)。未考虑自热 — 分压电流会加热热敏电阻，串联电阻越小，误差越明显。",
  },
};
