# vendor-analog-ranges.md — PLC 아날로그 raw 범위 근거 (사람 검증 게이트)

구현 규칙: 아래 표에 출처가 기재된 항목만 프리셋으로 구현한다. (벤더 상수 검증 게이트)

**중요**: raw 범위는 "벤더"가 아니라 **모듈 + 입력 레인지 + (있다면) 출력 포맷 설정**
단위로 정해진다. 같은 벤더라도 모듈이 다르면 값이 다르고, LS처럼 한 모듈 안에서
출력 포맷을 고를 수 있는 경우도 있다. 프리셋은 그래서 모듈·레인지 단위로 만든다.

## 구현 완료

### Siemens S7 (S7-1200/1500 아날로그 정격)

| 레인지 | raw 범위 | 출처 |
|---|---|---|
| 정격 (0–10V / 4–20mA 등) | 0 ~ 27648 | Siemens S7 아날로그 모듈 매뉴얼 |

### Mitsubishi MELSEC iQ-R — R60AD4 (A/D 변환 모듈)

출처: **MELSEC iQ-R Analog-Digital Converter Module User's Manual (Startup), SH-081232ENG**
— Performance specifications 표의 *I/O characteristics, resolution* 항목.
디지털 출력값은 16비트 부호 있는 2진수(−32768 ~ 32767).

| 아날로그 입력 레인지 | 디지털 출력값 |
|---|---|
| 0–10V, 0–5V, 1–5V | 0 ~ 32000 |
| 0–20mA, 4–20mA | 0 ~ 32000 |
| 1–5V (extended mode) | −8000 ~ 32000 |
| 4–20mA (extended mode) | −8000 ~ 32000 |
| −10–10V | −32000 ~ 32000 |
| User range setting | −32000 ~ 32000 |

### Rockwell / Allen-Bradley SLC 500 — 1746-NI4 / -NIO4I / -NIO4V (아날로그 **입력**)

출처: **SLC 500 4-Channel Analog I/O Modules User Manual, 1746-UM005B-EN-P (2004-06)**
— *Voltage/Current Range → Integer Representation* 표.

| 아날로그 입력 레인지 | Integer Representation |
|---|---|
| −10V ~ +10V | −32768 ~ +32767 |
| 0 ~ 10V | 0 ~ 32767 |
| 0 ~ 5V | 0 ~ 16384 |
| 1 ~ 5V | 3277 ~ 16384 |
| −20mA ~ +20mA | −16384 ~ +16384 |
| 0 ~ 20mA | 0 ~ 16384 |
| 4 ~ 20mA | 3277 ~ 16384 |

> 같은 매뉴얼의 아날로그 **출력**(1746-NO4I/-NO4V)은 값이 다르다: 0–21mA → 0~32764,
> 0–20mA → 0~31208, 4–20mA → 6242~31208, −10–10V → −32768~32764, 0–10V → 0~32764,
> 0–5V → 0~16384, 1–5V → 3277~16384. 입력용 프리셋과 혼동하지 말 것.

### Mitsubishi MELSEC-Q — Q64AD / Q68ADV / Q68ADI (A/D 변환 모듈)

출처: **Analog-Digital Converter Module User's Manual -Q64AD -Q68ADV -Q68ADI,
SH(NA)-080055-U (2023-02, MODEL CODE 13JR03)** — Section 3.1.1 *Performance
specifications list*, **Table 3.1** 의 *I/O characteristics, Maximum resolution* 항목.
URL(실제 취득): https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080055/sh080055u.pdf

분해능 모드(normal / high resolution)를 파라미터로 고르며, **모드마다 값이 다르다**.

| 아날로그 입력 레인지 | Normal resolution | High resolution |
|---|---|---|
| 0–10V | 0 ~ 4000 | 0 ~ 16000 |
| 0–5V, 1–5V | 0 ~ 4000 | 0 ~ 12000 |
| −10–10V | −4000 ~ 4000 | −16000 ~ 16000 |
| 0–20mA, 4–20mA | 0 ~ 4000 | 0 ~ 12000 |
| User range setting (전압) | −4000 ~ 4000 | −12000 ~ 12000 |
| User range setting (전류) | −4000 ~ 4000 | −12000 ~ 12000 |

> 같은 Table 3.1 의 *Digital output* 행은 "16-bit signed binary (normal resolution
> mode: −4096 to 4095, high resolution mode: −12288 to 12287, −16384 to 16383)" 이다.
> 이것은 **버퍼 메모리 값이 클리핑되는 한계**이지 스케일 양끝점이 아니다.
> 스케일링에 쓸 값은 위 표(I/O characteristics)다.

### Mitsubishi MELSEC-L — L60AD4 (A/D 변환 모듈)

출처: **MELSEC-L Analog-Digital Converter Module User's Manual, SH(NA)-080899ENG-F
(2015-06, MODEL CODE 13JZ42)** — Section 3.2 *Performance Specifications*, 표 (1) L60AD4
의 *I/O characteristics, resolution* 항목.
URL(실제 취득): https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080899eng/sh080899engf.pdf

| 아날로그 입력 레인지 | 디지털 출력값 |
|---|---|
| 0–10V, 0–5V, 1–5V | 0 ~ 20000 |
| −10–10V | −20000 ~ 20000 |
| 1–5V (Extended mode) | −5000 ~ 22500 |
| 0–20mA, 4–20mA | 0 ~ 20000 |
| 4–20mA (Extended mode) | −5000 ~ 22500 |
| User range setting | −20000 ~ 20000 |

> 같은 표의 *Digital output value* 행은 −20480 ~ 20479(스케일링 기능 사용 시
> −32768 ~ 32767)이며, 이는 클리핑 한계다.
> 같은 매뉴얼의 형제 모듈 L60ADVL8(0–10V → 0 ~ 16000)·L60ADIL8(0–20mA → 0 ~ 8000)은
> 값이 완전히 다르다. **L60AD4 값을 형제 모듈에 옮겨 쓰지 말 것.**

### Mitsubishi MELSEC iQ-F — FX5U CPU 내장 아날로그

출처: **MELSEC iQ-F FX5 User's Manual (Analog Control - CPU module built-in,
Expansion adapter), JY997D60501H (Model code 09R557)** — Chapter 7 *FX5U CPU MODULE
BUILT-IN ANALOG*, Section 7.1 *Specifications* → *Performance specifications* →
*Analog input* / *Analog output* 표 (p.409–410).
URL(실제 취득): https://dl.mitsubishielectric.com/dl/fa/document/manual/plcf/jy997d60501/jy997d60501h.pdf

| 항목 | 레인지 | 디지털 값 |
|---|---|---|
| 내장 아날로그 입력 (2ch) | 0–10V | 0 ~ 4000 (unsigned 12-bit binary) |
| 내장 아날로그 출력 (1ch) | 0–10V | 0 ~ 4000 (unsigned 12-bit binary) |

> 내장 아날로그는 **0–10V 전압 1종뿐**이다. 전류 입력·바이폴라 레인지는 없다.

**기재만 하고 구현하지 않음** — 같은 매뉴얼 Chapter 2 (FX5-4AD-ADP, p.24
*Performance specifications* / p.25 *Input conversion characteristics*)의 값.
필요해지면 재조사 없이 쓸 수 있도록 남긴다:
0–10V → 0 ~ 16000, 0–5V → 0 ~ 16000, 1–5V → 0 ~ 12800, −10–10V → −8000 ~ 8000,
0–20mA → 0 ~ 16000, 4–20mA → 0 ~ 12800, −20–20mA → −8000 ~ 8000.
(1–5V·4–20mA가 0에서 시작한다는 점이 다른 벤더와 다르다.)

### Rockwell / Allen-Bradley ControlLogix — 1756-IF8 / -IF16 (아날로그 입력)

출처: **ControlLogix Analog I/O Modules User Manual, 1756-UM009G-EN-P (2025-03)**
— Chapter 3 *ControlLogix Analog I/O Module Features* → *Data Format as Related to
Resolution and Scaling* → **Integer mode**, 표 *Input Signal to User Count Conversion* (p.31).
URL(실제 취득): https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1756-um009_-en-p.pdf

**"raw 프리셋" 개념이 성립하는지에 대한 판단 — 조건부로 성립한다.**

- **Floating point mode(모듈 기본 동작)**: 모듈이 채널 단위로 공학 단위 변환을 하고
  REAL 값을 그대로 올린다. 매뉴얼 원문: *"Scaling is only available with the floating
  point data format."* → 이 모드에서는 **raw 범위라는 것이 존재하지 않으므로 프리셋을
  만들지 않는다.**
- **Integer mode**: 매뉴얼 원문 *"Scaling isn't available in integer mode. The low
  signal of your application range equals −32,768 counts while the high signal equals
  32,767 counts."* → 고정된 raw 범위가 있으므로 프리셋이 성립한다.

**함정**: integer mode의 ±32768 카운트는 정격 레인지 양끝이 아니라 **확장된 신호
양끝**에 대응한다. 표에 적힌 그대로:

| 모듈 | 레인지 | −32768 counts | +32767 counts |
|---|---|---|---|
| 1756-IF8 / -IF8K / -IF16 / -IF16K | ±10V | −10.25 V | +10.25 V |
| 〃 | 0–10V | 0 V | 10.25 V |
| 〃 | 0–5V | 0 V | 5.125 V |
| 〃 | 0–20mA | 0 mA | 20.58 mA |

> 즉 0–20mA 레인지에서 32767 카운트는 20 mA가 **아니라** 20.58 mA다.
> 0–20mA를 0~100%로 스케일하려면 공학 단위 양끝을 0과 102.9(= 20.58/20 × 100)로
> 넣어야 한다. 프리셋 note에 이 신호 양끝을 반드시 표기한다.
> 4–20mA 전용 레인지는 존재하지 않는다(0–20mA 레인지 + floating point scaling으로 처리).

### LS ELECTRIC XGF-AD4S (절연형 아날로그 입력)

출처: **XGF-AD4S User's Manual V1.4 (2020-07)** — Section 2.2 *Performance
Specifications*, Table 2.2 의 *Digital output* 항목.
URL(실제 취득): https://ssq.ls-electric.com/uploads/document/16409282919990/XGF-AD4S_Manual_V1.4_202007_EN.pdf
(같은 문서의 최신판 V1.7(2024-06): https://ssq.ls-electric.com/uploads/document/17197973438560/XGF-AD4S_Manual_V1.7_202406_EN.pdf)
출력 데이터 포맷을 **채널별로 3가지 중 선택**한다. 값은 16비트 부호 있는 값(−32768 ~ 32767).

| 출력 포맷 | 레인지 | 디지털 출력값 |
|---|---|---|
| Signed Value | 전 레인지 공통 | −32000 ~ 32000 |
| Percentile Value | 전 레인지 공통 | 0 ~ 10000 |
| Precise Value | 1–5V | 1000 ~ 5000 |
| Precise Value | 0–5V | 0 ~ 5000 |
| Precise Value | 0–10V | 0 ~ 10000 |
| Precise Value | −10–10V | −10000 ~ 10000 |
| Precise Value | 4–20mA | 4000 ~ 20000 |
| Precise Value | 0–20mA | 0 ~ 20000 |

### LS ELECTRIC XGF-AD8A (XGT 8채널 아날로그 입력)

출처: **XGT Series Analog Input Module XGF-AD8A User's Manual V1.8 (2025-02)**
— Section 2.2 *Performance Specifications*, **Table 2.2** 의 *Digital output* 항목.
URL(실제 취득): https://ssq.ls-electric.com/uploads/document/17394978442750/XGF-AD8A_Manual_V1.8_202502_EN.pdf
(LS ELECTRIC Solution Square 문서 ID 2724 — https://sol.ls-electric.com/ww/en/product/document/2724)

**14비트 값이며 포맷이 4종**이다. XGF-AD4S(16비트, signed −32000~32000)와 **다르다**.

| 출력 포맷 | 레인지 | 디지털 출력값 |
|---|---|---|
| Unsigned value | 전 레인지 공통 | 0 ~ 16000 |
| Signed value | 전 레인지 공통 | −8000 ~ 8000 |
| Percentile value | 전 레인지 공통 | 0 ~ 10000 |
| Precise value | 1–5V | 1000 ~ 5000 |
| Precise value | 0–5V | 0 ~ 5000 |
| Precise value | 0–10V | 0 ~ 10000 |
| Precise value | −10–10V | −10000 ~ 10000 |
| Precise value | 4–20mA | 4000 ~ 20000 |
| Precise value | 0–20mA | 0 ~ 20000 |

### LS ELECTRIC XBF-AD04A (XGB 4채널 아날로그 입력)

출처: **XGB Analog Module User Manual V2.4 (2024-06)**, 파일명
`XBF-AD04A_T16_Manual_V2.4_202406_EN.pdf` — Chapter 2 *Analog Input (XBF-AD04A)*,
Section **2.2.2 Performance specifications** 의 *Digital output / Range* 항목.
오버레인지 값은 같은 장 Section 2.5.1–2.5.3 (*I/O characteristic*) 표.
URL(실제 취득): https://sftpssqblobcdn.blob.core.windows.net/prod/largefile/document/17192987590230/XBF-AD04A_T16_Manual_V2.4_202406_EN.pdf
(LS ELECTRIC Solution Square 문서 ID 3015 — https://sol.ls-electric.com/ww/en/product/document/3015)

**12비트 값**이며, 입력 레인지는 전압 0–10V 하나와 전류 4–20mA / 0–20mA 둘뿐이다
(1–5V·0–5V·−10–10V 없음).

| 출력 포맷 | 레인지 | 정격 디지털 출력값 | 클리핑 한계 (§2.5) |
|---|---|---|---|
| Unsigned value | 0–10V, 0–20mA | 0 ~ 4000 | 0 ~ 4047 |
| Unsigned value | 4–20mA | 0 ~ 4000 | −48 ~ 4047 |
| Signed value | 0–10V, 0–20mA | −2000 ~ 2000 | −2000 ~ 2047 |
| Signed value | 4–20mA | −2000 ~ 2000 | −2048 ~ 2047 |
| Percentile value | 0–10V, 0–20mA | 0 ~ 1000 | 0 ~ 1011 |
| Percentile value | 4–20mA | 0 ~ 1000 | −12 ~ 1011 |
| Precise value | 0–10V | 0 ~ 1000 | 0 ~ 1011 |
| Precise value | 0–20mA | 0 ~ 2000 | 0 ~ 2023 |
| Precise value | 4–20mA | 400 ~ 2000 | 381 ~ 2023 |

## 전사(轉寫) 위험 기록

매뉴얼 자체가 틀렸거나 표마다 값이 다르게 인쇄된 지점. 값을 옮길 때 여기를 먼저 볼 것.

1. **XBF-AD04A V2.4 §2.2.2 Note 3 은 틀렸다.** "Gain Value: Analog input value where
   digital output value is **16000** when digital output format is set to Unsigned
   Value" 라고 인쇄되어 있으나, 이 모듈의 unsigned 풀스케일은 **4000**이다(같은 페이지
   표와 §2.5 특성표 모두 4000). 16000은 XGF-AD8A 매뉴얼에서 복사된 값으로 보인다.
   → **Note가 아니라 표를 따른다.**
2. XBF-AD04A V2.4 §2.5.3 은 4–20mA 전류 그래프인데 가로축 캡션이
   "Analog input value (**voltage**)"로 인쇄되어 있다.
3. XBF-AD04A V2.4 §2.2.2 은 입력 모듈인데 행 이름이 "No. of **output** channel"이다.
   ("Absolute max. **output**"도 같은 오타.)
4. **XGF-AD8A 는 V1.1(2014-01) 개정 이력에 "Correct typing errors — Ch2, Ch5, Ch6"이
   적혀 있다.** Ch2가 바로 성능 사양 장이므로 V1.0 인쇄본의 Table 2.2는 신뢰하지 않는다.
   위 표는 V1.8(2025-02)에서 읽고 V1.1 사본과 대조해 일치를 확인한 값이다.
5. L60AD4 매뉴얼(SH-080899ENG-F)의 형제 모듈 **L60ADIL8 은 Digital output value 를
   "−8192 to 8192"로 인쇄**한다. 부호 있는 14비트 필드라면 −8192 ~ 8191이 되어야 하는
   비대칭 값이다. L60ADIL8은 구현하지 않으므로 그대로 두되, 옮겨 쓰지 말 것.
6. Q64AD·L60AD4 매뉴얼의 *Digital output value* 행(−4096~4095, −20480~20479 등)은
   **버퍼 메모리 클리핑 한계**다. 스케일 양끝점(I/O characteristics 표)과 혼동하기 쉽다.
7. 1756-IF8 integer mode의 −32768/32767은 **정격 레인지 양끝이 아니라 확장 신호
   양끝**(0–20mA → 0 mA / 20.58 mA)에 대응한다. 위 ControlLogix 절 참조.

## 구현 금지 (근거 미기재)

| 벤더/모듈 | 확인이 필요한 것 | 출처 | 상태 |
|---|---|---|---|
| Mitsubishi Q68ADV / Q68ADI 개별 확인 | Q64AD와 같은 Table 3.1을 공유하므로 값은 동일하나, 8채널 전압/전류 전용이라 지원 레인지 집합이 다름 (Q68ADV는 전류 없음, Q68ADI는 전압 없음) | SH(NA)-080055-U Table 3.1 (기재됨) | ⚠️ 값은 확보, 레인지 조합만 미정 — 프리셋 라벨은 Q64AD 기준으로만 발행 |
| Mitsubishi L60ADVL8 / L60ADIL8 | 모듈별 디지털 출력 범위 (L60AD4와 다름) | SH(NA)-080899ENG-F §3.2 (2)(3) 에 값이 있으나 위 전사 위험 5번 미해결 | ⛔ 구현 금지 |
| Allen-Bradley 1756-IF8 floating point mode | 해당 없음 — 모듈이 공학 단위로 변환하므로 raw 범위 자체가 없음 (1756-UM009G-EN-P Ch.3) | 판단 완료 | ⛔ 프리셋 만들지 않음 (개념 부재) |
| Allen-Bradley 1756-IF6CIS / -IF6I / -IR6I / -IT6I | integer mode 신호 양끝이 IF8과 다름 (예: IF6I 0–10V → 10.54688 V) | 1756-UM009G-EN-P p.31 에 값이 있음 | ⚠️ 값은 확보, 이번 범위 밖 — 필요 시 재조사 없이 추가 가능 |

### 확인했으나 1차 출처를 찾지 못한 것

- **없음.** 이번 회차의 세 항목은 모두 제조사 호스팅 원문에서 값을 확인했다.
  - Mitsubishi: `dl.mitsubishielectric.com` 직접 다운로드.
  - Rockwell: `literature.rockwellautomation.com` 직접 다운로드.
  - LS ELECTRIC: `sol.ls-electric.com` 은 SPA라 PDF 링크가 HTML에 없다. 게스트 API
    `GET /api/guest/zdata/ssqdoc/dlCenter/by-ids?ids=<docId>` 가 파일 목록과 `fileKey`를
    돌려주며, 실제 파일은
    `https://ssq.ls-electric.com/uploads/<fileKey>/<fileName>` 또는 응답의
    `blobUrlForLargeFile`(sftpssqblobcdn.blob.core.windows.net) 에 있다.
    문서 ID: XGF-AD4S=2725, XGF-AD8A=2724, XGB Analog(XBF-AD04A)=3015.
    유통사 미러(otomasyonline.com 의 XGF-AD8A V1.1)도 받아 대조에만 사용했고,
    기재 값은 제조사 호스팅본에서 읽었다.

### 기재할 때 필요한 항목

1. 모듈 품번과 확인한 매뉴얼의 문서번호·판번호
2. 입력 타입별(전압/전류, 레인지별) 정격 raw 범위
3. 오버레인지/확장 모드가 있으면 그 범위도 별도로
4. 출력 포맷 설정이 있으면 설정마다 한 줄씩
