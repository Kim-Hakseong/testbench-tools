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

### LS ELECTRIC XGF-AD4S (절연형 아날로그 입력)

출처: **XGF-AD4S User's Manual V1.4 (2020-07)** — Digital output 사양표.
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

## 구현 금지 (근거 미기재)

| 벤더/모듈 | 확인이 필요한 것 | 출처 | 상태 |
|---|---|---|---|
| Mitsubishi Q64AD / L60AD4 / FX5 내장 아날로그 | 모듈별 디지털 출력 범위 (R60AD4와 같다고 가정하지 말 것) | (미기재) 해당 모듈 매뉴얼 확인 후 기재 | ⛔ 구현 금지 |
| Allen-Bradley 1756-IF8 등 ControlLogix 아날로그 | 모듈 설정에서 공학 단위로 스케일링해 내보내는 경우가 있어, raw 프리셋 개념이 성립하는지부터 판단 | (미기재) 〃 | ⛔ 구현 금지 |
| LS XGF-AD8A / XBF-AD04A 등 타 모듈 | 모듈별 출력 포맷·범위 | (미기재) 〃 | ⛔ 구현 금지 |

### 기재할 때 필요한 항목

1. 모듈 품번과 확인한 매뉴얼의 문서번호·판번호
2. 입력 타입별(전압/전류, 레인지별) 정격 raw 범위
3. 오버레인지/확장 모드가 있으면 그 범위도 별도로
4. 출력 포맷 설정이 있으면 설정마다 한 줄씩
