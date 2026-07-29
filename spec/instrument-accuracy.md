# instrument-accuracy.md — 계측기 정확도 사양 근거 (벤더 상수 검증 게이트)

CLAUDE.md §5-3에 따라, **이 파일에 출처와 함께 기재된 값만** `packages/engine/src/accuracy.ts`의
`INSTRUMENT_PRESETS`에 구현한다. 여기에 없는 기종·기능·레인지는 프리셋으로 넣지 않는다.

## 수집 방법 (재현 가능해야 함)

모든 값은 제조사 문서 PDF를 실제로 내려받아 `pdftotext -layout`로 추출한 텍스트에서 읽었다.
기억이나 2차 자료에서 옮긴 값은 하나도 없다.

```
curl -sL -A "Mozilla/5.0" -o doc.pdf "<URL>"
file doc.pdf                      # 반드시 "PDF document"여야 함 (HTML 랜딩 페이지 주의)
pdftotext -layout doc.pdf doc.txt
grep -n -A12 "DC Voltage" doc.txt
```

**주의**: 벤더 사이트 URL이 `.pdf`로 끝나도 `content-type: text/html`인 인터스티셜 페이지를
돌려주는 경우가 많다. `file`로 확인하지 않으면 빈 텍스트를 읽고 값을 지어내게 된다.
아래 "확보 실패" 절 참고.

## 프리셋 범위 한정

- **DC 전압(DC voltage / DCV) 기능, 1년(1 year) 사양만** 구현한다.
- 24시간·90일·2년 열, 온도계수, AC·저항·전류 등 다른 기능은 구현하지 않는다.
  필요하면 사용자가 직접 입력한다. (표를 통째로 옮기면 검증 부담이 기종 수만큼 늘어난다)
- 레인지 값은 **공칭(nominal) 레인지**로 적는다. 20 % 오버레인지 표시 한계가 아니다.
- 단위는 전부 **V**로 통일한다. 600.0 mV 레인지 → `range: 0.6`, 분해능 0.1 mV → `0.0001`.

---

## 1. Keysight 34461A (Truevolt 시리즈)

- **문서**: DATA SHEET — Digital Multimeters 34460A, 34461A, 34465A (6½ digit), 34470A (7½ digit)
- **문서번호 / 일자**: `5991-1983EN`, "Published in USA, June 20, 2022" (푸터에 인쇄됨)
- **실제로 PDF를 반환한 URL (제조사 호스트, 근거 원본)**:
  `https://www.keysight.com/us/en/assets/7018-03846/data-sheets/5991-1983.pdf`
  2026-07-29 재확인: `curl -sL`로 정상 PDF 수신(2,081,950 bytes, PDF 1.6). 최초 조사 시
  HTML 인터스티셜이 반환돼 유통사 미러를 썼으나, **리다이렉트를 따라가면 자사 경로가 응답한다.**
  DC voltage 1년 열 5개 레인지 전부 재대조해 구현값과 일치 확인.
- **대체 경로(참고)**: `https://assets.testequity.com/te1/Documents/pdf/keysight/Keysight_Truevolt-Digital-Multimeters_Datasheet.pdf`
  — 동일 문서번호·일자. 자사 경로가 죽었을 때만 쓸 것.
- **형식**: `± (% of reading + % of range)`, "These specifications are compliant to ISO/IEC 17025 for K = 2."
- **조건**: 1년 열은 **TCAL ± 5 °C**. 각주 1: "For DC: Specifications are for 60-minute warm-up,
  aperture of 10 or 100 NPLC, and auto zero on."

같은 문서에 34460A / 34461A / 34465A 표가 **연달아** 나온다. 34461A 표는 "Specifications 34461A"
제목 바로 아래 것이다. 34460A 표를 잘못 읽으면 10 V 레인지가 0.0075가 되어 두 배 넘게 틀린다.

| 레인지 | range (V) | 1 year (TCAL ± 5 °C) |
|---|---|---|
| 100 mV | 0.1 | ±(0.0050 % rdg + 0.0035 % rng) |
| 1 V | 1 | ±(0.0040 + 0.0007) |
| 10 V | 10 | ±(0.0035 + 0.0005) |
| 100 V | 100 | ±(0.0045 + 0.0006) |
| 1000 V | 1000 | ±(0.0045 + 0.0010) |

원문 발췌 (`Specifications 34461A` 절):

```
                                24 hours 3             90 days           1 year            2 years           Temperature
Range 2/frequency
                                TCAL ± 1 °C            TCAL ± 5 °C       TCAL ± 5 °C       TCAL ± 5 °C       coefficient/°C 4

DC voltage
100 mV                          0.0030 + 0.0030        0.0040 + 0.0035   0.0050 + 0.0035   0.0065 + 0.0035   0.0005 + 0.0005
1V                              0.0020 + 0.0006        0.0030 + 0.0007   0.0040 + 0.0007   0.0055 + 0.0007   0.0005 + 0.0001
10 V                            0.0015 + 0.0004        0.0020 + 0.0005   0.0035 + 0.0005   0.0050 + 0.0005   0.0005 + 0.0001
100 V                           0.0020 + 0.0006        0.0035 + 0.0006   0.0045 + 0.0006   0.0060 + 0.0006   0.0005 + 0.0001
1000 V                          0.0020 + 0.0006        0.0035 + 0.0010   0.0045 + 0.0010   0.0060 + 0.0010   0.0005 + 0.0001
```

---

## 2. Keysight / Agilent 34401A

두 개정판에서 **독립적으로 두 번** 확보했고 DC 전압 값은 완전히 일치한다.

- **문서**: 34401A Digital Multimeter 데이터시트
- **문서번호 / 일자 (A)**: `5968-0162EN`, "© Keysight Technologies, 2016 - 2022, Published in USA, July 8, 2022"
  - URL: `https://www.keysight.com/us/en/assets/7018-06774/data-sheets-archived/5968-0162.pdf`
- **문서번호 / 일자 (B, 교차 확인용 구판)**: `5968-0162EN`, "Printed in the U.S.A. May 1, 2005"
  - URL: `https://www.farnell.com/datasheets/1969123.pdf`
- **형식**: `Accuracy Specifications ± (% of reading + % of range)`
- **조건**: 1년 열은 **23 ± 5 °C**. 각주 1: "Specifications are for 1 hr warm-up and 6½ digits, slow ac filter."

| 레인지 | range (V) | 1 year (23 ± 5 °C) |
|---|---|---|
| 100.0000 mV | 0.1 | ±(0.0050 % rdg + 0.0035 % rng) |
| 1.000000 V | 1 | ±(0.0040 + 0.0007) |
| 10.00000 V | 10 | ±(0.0035 + 0.0005) |
| 100.0000 V | 100 | ±(0.0045 + 0.0006) |
| 1000.000 V | 1000 | ±(0.0045 + 0.0010) |

원문 발췌 (개정판 A):

```
Accuracy Specifications ± (% of reading + % of range)1

 Function       Range3            Frequency, etc.          24 hour2          90 day            1 year            Temperature
                                                           23 ± 1 °C         23 ± 5 °C         23 ± 5 °C         coefficient

 DC voltage     100.0000 mV                                0.0030 + 0.0030   0.0040 + 0.0035   0.0050 + 0.0035   0.0005 + 0.0005
                1.000000 V                                 0.0020 + 0.0006   0.0030 + 0.0007   0.0040 + 0.0007   0.0005 + 0.0001
                10.00000 V                                 0.0015 + 0.0004   0.0020 + 0.0005   0.0035 + 0.0005   0.0005 + 0.0001
                100.0000 V                                 0.0020 + 0.0006   0.0035 + 0.0006   0.0045 + 0.0006   0.0005 + 0.0001
                1000.000 V                                 0.0020 + 0.0006   0.0035 + 0.0010   0.0045 + 0.0010   0.0005 + 0.0001
```

> 34461A와 34401A의 1년 DC 전압 값이 **똑같다**. 전사 오류가 아니라 두 문서가 실제로 그렇게
> 적고 있다. 같은 데이터시트에 "34461A: The industry's only 100 % drop-in, SCPI-compatible
> replacement for the 34401A DMM."이라고 쓰여 있는 것과 일관된다.

---

## 3. Keithley DMM6500

- **문서**: Model DMM6500 6½ Digit Bench/System Multimeter Specifications
- **문서번호 / 개정 (모든 페이지 푸터에 인쇄)**: `SPEC-DMM6500 Rev. A / April 2018`
- **URL**: `https://download.tek.com/document/SPEC-DMM6500A_April_2018.pdf`
- **형식**: `DC VOLTAGE ACCURACY ±(% OF READING + % OF RANGE)`
- **조건**: "Autozero enabled", 1년 열은 **TCAL ± 5 °C**,
  "TCAL: The temperature at which the instrument was calibrated (23 °C for factory calibration)"

| 레인지 | range (V) | 분해능 | 1 year (TCAL ± 5 °C) |
|---|---|---|---|
| 100 mV | 0.1 | 100 nV | ±(0.0030 % rdg + 0.0035 % rng) |
| 1 V | 1 | 1 µV | ±(0.0025 + 0.0006) |
| 10 V | 10 | 10 µV | ±(0.0025 + 0.0005) |
| 100 V | 100 | 100 µV | ±(0.0040 + 0.0006) |
| 1000 V | 1000 | 1 mV | ±(0.0040 + 0.0006) |

원문 발췌:

```
DC VOLTAGE ACCURACY ±(% OF READING + % OF RANGE)
                               Input           24 hours            90 days             1 year                2 years             Temperature
     Range        Resolution
                               impedance       TCAL ±1 °C          TCAL ±5 °C          TCAL ±5 °C            TCAL ±5 °C          coefficient
     100 mV       100 nV                       0.0015 + 0.0030     0.0025 + 0.0035     0.0030 + 0.0035       0.0035 + 0.0035     0.0001 + 0.0005
     1V           1 µV                         0.0015 + 0.0006     0.0020 + 0.0006     0.0025 + 0.0006       0.0030 + 0.0006     0.0001 + 0.0001
     10 V         10 µV                        0.0010 + 0.0004     0.0020 + 0.0005     0.0025 + 0.0005       0.0030 + 0.0005     0.0001 + 0.0001
     100 V        100 µV       10 MΩ ±1%       0.0015 + 0.0006     0.0035 + 0.0006     0.0040 + 0.0006       0.0050 + 0.0006     0.0006 + 0.0001
     1000 V   1   1 mV         10 MΩ ±1%       0.0020 + 0.0006     0.0035 + 0.0006     0.0040 + 0.0006       0.0050 + 0.0006     0.0006 + 0.0001
```

---

## 4. Siglent SDM3055

- **문서**: SDM3055 Digital Multimeter 데이터시트
- **개정 (문서에 인쇄된 그대로)**: `DataSheet-2021.05`
- **URL**: `https://www.welectron.com/mediafiles/datasheets/siglent/Siglent_SDM3055_Datasheet-Web.pdf`
- ⚠️ **이 항목만 근거 원본이 제조사 호스트가 아니다(유통사 미러).** 2026-07-29 재확인 시
  `siglentna.com`·`int.siglent.com`의 추정 경로는 전부 404. 나머지 5개 기종은 제조사
  (keysight.com / download.tek.com / fluke.com) 호스트에서 직접 받은 원본을 쓴다.
  Siglent 자사 PDF를 확보하면 근거를 교체할 것. 값 자체는 미러 문서에서 전사·재대조했다.
  (Siglent 자사 `int.siglent.com` URL은 HTML 반환)
- **형식**: `Accuracy ±（% of Reading + % of Range）`
- **조건**: **1 year 열만** 발행되며 **23 °C ± 5 °C**. 각주 1: "Specifications are for 0.5 Hour warm-up,
  'Slow' measurement rate and calibration temperature 18 °C ~ 28 °C."
  각주 4 (1000 V): "Plus 0.02 mV of error per 1 V after the first ±500 VDC." — **미구현**,
  사용자가 필요하면 고정 오프셋 항으로 직접 넣는다.

| 레인지 | range (V) | 1 year (23 °C ± 5 °C) |
|---|---|---|
| 200 mV | 0.2 | ±(0.015 % rdg + 0.004 % rng) |
| 2 V | 2 | ±(0.015 + 0.003) |
| 20 V | 20 | ±(0.015 + 0.004) |
| 200 V | 200 | ±(0.015 + 0.003) |
| 1000 V | 1000 | ±(0.015 + 0.003) |

> 20 V 행만 `+ 0.004`로 이웃 행들과 다르다. 오타처럼 보이지만 문서가 그렇게 인쇄하고 있으므로
> 그대로 옮긴다. 임의로 0.003으로 "고치지 말 것".

원문 발췌:

```
DC Characteristics                                          Accuracy±（% of Reading + % of Range）[1]
                                                                            Temperature
                                    [2]    Test current or Load 1 Year      coefficient
 Function              Range
                                           voltage              23 °C± 5 °C 0 °C~ 18 °C / 28 °C~ 50 °C
                       200 mV                     0.015 + 0.004             0.0015 + 0.0005
                       2V                         0.015 + 0.003             0.0010 + 0.0005
 DC Voltage            20 V                       0.015 + 0.004             0.0020 + 0.0005
                       200 V                      0.015 + 0.003             0.0015 + 0.0005
                       1000 V [4]                 0.015 + 0.003             0.0015 + 0.0005
```

---

## 5. Fluke 87V

- **문서**: 80 Series V Multimeters Users Manual
- **개정 (표지)**: "May 2004 Rev.2, 11/08", "©2004, 2008 Fluke Corporation"
- **URL**: `https://assets.fluke.com/manuals/80v_____umeng0200.pdf`
- **형식**: `±([% of reading] + [number of least significant digits])`
- **조건**: "at 18 °C to 28 °C, with relative humidity up to 90 %, for a period of one year after calibration."
- **표시 카운트**: "Display: Digital: 6000 counts updates 4/sec; (Model 87 also has 19,999 counts in
  high-resolution mode)."
- **주의 1**: 이 매뉴얼은 **83과 87 두 기종을 한 표에** 싣는다. 열 제목이 `Model 83` / `Model 87`이며,
  87V 값은 **오른쪽 열**이다. 왼쪽 열을 읽으면 6 V 레인지가 0.1 %가 되어 두 배 틀린다.
- **주의 2**: "For Model 87 in the 4½-digit mode, multiply the number of least significant digits
  (counts) by 10." — 고분해능 모드에서는 카운트 항이 ×10. 프리셋은 **기본 6000-count 모드** 기준이며
  이 배수는 적용하지 않는다.
- 카운트 크기는 매뉴얼이 레인지마다 **Resolution 열에 직접 인쇄**하므로, 유도값(range ÷ 6000)이 아니라
  인쇄된 분해능을 그대로 쓴다.

| 레인지 | range (V) | Resolution | resolution (V) | Model 87 정확도 |
|---|---|---|---|---|
| 600.0 mV | 0.6 | 0.1 mV | 0.0001 | ±(0.1 % + 1) |
| 6.000 V | 6 | 0.001 V | 0.001 | ±(0.05 % + 1) |
| 60.00 V | 60 | 0.01 V | 0.01 | ±(0.05 % + 1) |
| 600.0 V | 600 | 0.1 V | 0.1 | ±(0.05 % + 1) |
| 1000 V | 1000 | 1 V | 1 | ±(0.05 % + 1) |

원문 발췌 (Table 12):

```
                         Table 12. DC Voltage, Resistance, and Conductance Function Specifications
                                                                                                   Accuracy
          Function                   Range                  Resolution
                                                                                     Model 83                     Model 87

                                  6.000 V                     0.001 V        ± (0.1 % + 1)               ± (0.05 % + 1)
     L                            60.00 V                     0.01 V         ± (0.1 % + 1)               ± (0.05 % + 1)
                                  600.0 V                     0.1 V          ± (0.1 % + 1)               ± (0.05 % + 1)
                                  1000 V                      1V             ± (0.1 % + 1)               ± (0.05 % + 1)
     mV
                                  600.0 mV                    0.1 mV         ± (0.3 % + 1)               ± (0.1 % + 1)
```

> 별도 SKU인 **87V Ex**(intrinsically safe)는 다른 매뉴얼(PN 2518115, December 2005)이며
> 혼동하지 말 것. 여기서는 구현하지 않는다.

---

## 6. Fluke 289

- **문서**: 287/289 True-rms Digital Multimeters Users Manual
- **개정 (표지)**: "June 2007, Rev. 2, 3/09"
- **URL**: `https://media.fluke.com/f640860c-6f58-4c4c-8096-b10800c17e13_original%20file.pdf`
- **형식**: `±( [ % of reading ] + [ number of least significant digits ] )`
- **조건**: "specified for a period of one year after calibration, at 18 °C to 28 °C, with relative
  humidity to 90 %. Accuracy specification assumes ambient temperature stable at ±1 °C.
  For ambient temperature changes of ±5 °C, rated accuracy applies after 2 hours."
- **표시 카운트**: 이 매뉴얼은 counts 수치를 **본문에 인쇄하지 않는다**.
  range ÷ resolution으로 50 000 카운트가 계산되지만 그것은 **유도값**이므로 게이트를 통과하지 못한다.
  따라서 프리셋은 카운트 수가 아니라 **인쇄된 Resolution 열**을 카운트 크기로 쓴다.

| 레인지 | range (V) | Resolution | resolution (V) | DC 정확도 | 비고 |
|---|---|---|---|---|---|
| 50 mV | 0.05 | 0.001 mV | 0.000001 | ±(0.05 % + 20) | 각주 [3] REL 모드로 오프셋 보정 시 |
| 500 mV | 0.5 | 0.01 mV | 0.00001 | ±(0.025 % + 2) | |
| 5 V | 5 | 0.0001 V | 0.0001 | ±(0.025 % + 2) | |
| 50 V | 50 | 0.001 V | 0.001 | ±(0.025 % + 2) | |
| 500 V | 500 | 0.01 V | 0.01 | ±(0.03 % + 2) | |
| 1000 V | 1000 | 0.1 V | 0.1 | ±(0.03 % + 2) | |

각주 [1] "Add 20 counts in dual display ac over dc, dc over ac or ac+dc." — 미구현(단일 표시 기준).

원문 발췌:

```
DC Voltage Specification
                                                                        Accuracy
  Function          Range        Resolution            DC [2]
DC mV               50 mV        0.001 mV        0.05 % + 20   [4]
                    500 mV       0.01 mV         0.025 % + 2   [5]
DC V [1]            5V           0.0001 V        0.025 % + 2
                    50 V         0.001 V         0.025 % + 2
                    500 V        0.01 V          0.03 % + 2
                    1000 V       0.1 V           0.03 % + 2
```

---

## 확보 실패 — 프리셋 없음 `[미정]`

기억으로 채우지 않고 그대로 비워 둔다.

| 기종 | 시도한 URL | 결과 |
|---|---|---|
| Keysight Truevolt (자사 경로) | 위 참조 | ~~HTML 인터스티셜~~ **해결됨** — `curl -sL`로 정상 수신. 근거 원본으로 승격 |
| Rigol DM3058 | `www.saelig.com/supplier/Rigol/DM3058_Datasheet_Saelig.pdf` | HTML 반환. **값 없음** |
| Siglent (자사 경로) | `int.siglent.com` | HTML 반환. 미러로 대체 |
| Tektronix 오실로스코프 DC gain accuracy | — | 검증된 PDF 미확보. **값 없음** |

## 갱신 규칙

1. 프리셋을 추가·수정할 때는 위와 같은 형식으로 **문서번호·개정일·실제 PDF를 반환한 URL·원문 발췌**를
   먼저 이 파일에 적는다. 코드가 먼저 바뀌는 일은 없어야 한다.
2. 제조사가 데이터시트를 개정하면 값이 바뀔 수 있다. 프리셋의 `source` 문자열에 문서번호가 들어 있으므로
   그 문자열과 이 파일의 절이 1:1로 대응하는지 확인한다.
3. 사양은 교정 주기·온도 창·워밍업 조건이 붙어야 의미가 있다. `conditions` 필드를 비운 채로 프리셋을
   추가하지 않는다.
