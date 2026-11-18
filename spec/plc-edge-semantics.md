# plc-edge-semantics.md — PLC 엣지 검출·원샷 동작 근거 (벤더 상수 검증 게이트)

구현 규칙: `packages/engine/src/plcedge.ts`는 아래에 출처·인용으로 적힌 동작만 구현한다. 매뉴얼이 침묵하는
곳은 **가정(B1…)**으로 이름 붙이고 툴 화면에도 밝힌다. IEC 61131-3 원문은 유료라 인용하지 않는다.

작성 2026-11-18. 출처 문서는 `spec/plc-timer-semantics.md`와 같다(S1 Beckhoff Tc2_Standard v1.3.4, S5 Siemens
S7-1200 System Manual A5E02486680-05, S6 Rockwell 1756-RM003Z-EN-P 2024-09 — S6의 공식 사이트 대조는 그 문서의
[미정] 항목과 같은 사람 작업 1건으로 처리). 추가 출처:

| 기호 | 문서 | 위치 |
|---|---|---|
| S4e | CODESYS Standard library help — R_TRIG / F_TRIG | https://content.helpme-codesys.com/en/libs/Standard/Current/Trigger/R_TRIG.html (F_TRIG.html) |

## 1. IEC R_TRIG / F_TRIG (Beckhoff, CODESYS)
- R_TRIG: "The R_TRIG function block is a rising edge detector. As long as the CLK input variable = FALSE, the Q output = FALSE. As soon as CLK = TRUE, Q is set to TRUE for one cycle. This means that each time the function is called, Q returns FALSE until CLK has a falling edge and then a rising edge." (S1 p.19)
- R_TRIG Q: "TRUE for a rising edge at the CLK input (for one cycle)" (S1 p.19)
- F_TRIG: "The F_TRIG function block is a detector for a falling edge. As long as the CLK input variable = TRUE, the Q output = FALSE. As soon as CLK = FALSE, Q is set to TRUE for one cycle. This means that each time the function is called, Q returns FALSE until CLK has a rising edge and then a falling edge." (S1 p.18)
- CODESYS: "Detects a rising edge of a boolean signal" / Q "TRUE : Rising edge detected"; F_TRIG "Detects a falling edge of a boolean signal" / Q "TRUE : Falling edge detected" (S4e)

## 2. Siemens S7-1200 P/N 접점·코일, P_TRIG / N_TRIG (S5 p.168–170)
- P contact: "The state of this contact is TRUE when a positive transition (OFF-to-ON) is detected on the assigned "IN" bit." N contact: "… TRUE when a negative transition (ON-to-OFF) is detected …"
- P_TRIG: "The Q output power flow or logic state is TRUE when a positive transition (OFF-to-ON) is detected on the CLK input state (FBD) or CLK power flow in (LAD)." N_TRIG는 negative(ON-to-OFF).
- M_BIT: "Memory bit in which the previous state of the input is saved"
- "All edge instructions use a memory bit (M_BIT) to store the previous state of the input signal being monitored. An edge is detected by comparing the state of the input with the state of the memory bit. If the states indicate a change of the input in the direction of interest, then an edge is reported by writing the output TRUE. Otherwise, the output is written FALSE."
- **첫 스캔:** "Edge instructions evaluate the input and memory-bit values each time they are executed, including the first execution. You must account for the initial states of the input and memory bit in your program design either to allow or to avoid edge detection on the first scan." (S5 p.170 Note)

구현(IEC 측 공통 모델): 메모리 = 직전 실행의 입력값. 상승: Q = IN ∧ ¬M, 하강: Q = ¬IN ∧ M, 그 뒤 M := IN.
첫 실행은 M의 초기값과 비교한다.

**가정 B1 (메모리 초기값).** Siemens는 첫 스캔 검출 여부가 M_BIT 초기값에 달렸다고 명시한다(위 Note). Beckhoff·CODESYS 문서는
R_TRIG/F_TRIG 내부 메모리의 초기값을 적지 않는다. 그래서 툴은 **메모리 초기값을 사용자가 고르는 입력**으로 두고(기본 FALSE —
BOOL 변수의 기본값), 한 벤더의 내부 구현을 단정하지 않는다. Beckhoff F_TRIG 설명("Q returns FALSE until CLK has a rising edge
and then a falling edge")은 초기값 FALSE에서의 결과와 일치한다.

## 3. Allen-Bradley Logix 5000 원샷 (S6 Chapter 2, p.65–77)
목차(p.65): "Enable outputs for one scan each time a rung goes true — ONS", "set a bit for one scan each time a rung goes true — OSR", "set a bit for one scan each time the rung goes false — OSF".

### 3.1 ONS (p.65–67)
- "The One Shot (ONS) instruction makes the remainder of the rung true each time rung-condition-in transitions from false to true."
- Storage bit: "Retains the rung-condition-in from the last time the instruction was executed."
- Prescan: "The storage bit is set to true to prevent an invalid trigger during the first scan."
- Rung false: "The storage bit is cleared to false, rung-condition-out is cleared to false."
- ONS Flow Chart (True), p.67(그림 판독): storage bit = 0 → "storage bit is set, rung-condition-out is set to true"; storage bit = 1 → "storage bit remains set, rung-condition-out is set to false".

### 3.2 OSR (p.72–73)
- "The One Shot Rising (OSR) instruction sets the output bit for one scan when rung-condition-in transitions from false to true."
- Prescan: "The storage bit is set to true to prevent an invalid trigger during the first program scan. The output bit is cleared to false."
- Rung false: "Set Rung-condition-out to Rung-condition-in / The storage bit is cleared to false. / The output bit is cleared to false."
- OSR Flow Chart (True), p.73(그림 판독): Storage Bit = 0 → "Storage bit is set. Output bit is set. Rung-condition-out is set to true."; Storage Bit = 1 → "Storage bit remains set. Output bit is cleared. Rung-condition-out is set to true."
- **ONS와의 차이:** OSR의 rung-condition-out은 rung-condition-in 그대로(TRUE면 계속 TRUE)이고 펄스는 별도 Output Bit에만 나온다. ONS는 렁 나머지 자체를 한 스캔만 TRUE로 만든다.

### 3.3 OSF (p.67–69)
- "The One Shot Falling (OSF) instruction sets the output bit for one scan when rung-condition-in transitions from true to false."
- Prescan: "The storage bit is cleared to false to prevent an invalid trigger during the first program scan. The output bit is cleared to false."
- Rung true: "Set Rung-condition-out to Rung-condition-in. The storage bit is set to true. The output bit is cleared to false."
- OSF Flow Chart (False), p.69(그림 판독): storage bit = 1 → "storage bit is cleared, output bit is set, rung-condition-out is set to false"; storage bit = 0 → "storage bit remains cleared, output bit is cleared, rung-condition-out is set to false".

### 3.4 FBD/ST 전용 OSRI / OSFI (p.69–76) — 첫 스캔 규칙만 사용
- OSRI: "If InputBit is true, and it was false the last time the instruction was scanned then OutputBit will be set, otherwise OutputBit will be cleared." 첫 스캔: "Previous InputBit history is set to require a False to True transition of InputBit."
- OSFI: "If InputBit is false, and it was true the last time the instruction was scanned then OutputBit will be set, otherwise OutputBit will be cleared." 첫 스캔: "Previous InputBit history is cleared to require a True to False transition of InputBit."
- (OSFI 첫 문장 "sets the OutputBit … when the InputBit toggles from false to true"는 같은 쪽의 Description과 반대인 문서 오기다.)
- 툴은 OSRI/OSFI를 따로 그리지 않는다. 사다리 OSR/OSF와 같은 결과(첫 스캔 검출 없음)라는 사실만 페이지에 적는다.

## 4. 모델 공통
- 고정 스캔, 스캔마다 1회 실행, 입력은 스캔 시각의 값(타이머 spec과 같은 모델). 따라서 **두 스캔 사이에 켜졌다 꺼진 입력은 어느 쪽 명령도 보지 못한다** — 이건 매뉴얼 인용이 아니라 "직전 실행 값과 비교한다"는 위 규칙들의 직접 귀결이다.
- 펄스 길이: 모든 명령에서 다음 실행까지 한 스캔(S1 "for one cycle", S6 "for one scan").

## 5. 구현하지 않는 것
- 같은 storage/M_BIT를 두 명령이 공유하는 오용(S5가 금지, S6 "structure operands are shared" 경고) — 입력 모델 밖.
- 렁 안에서 원샷 출력 비트를 그보다 위 렁이 읽는 스캔 순서 효과 — 다음 툴(스캔 순서) 후보로 남긴다.
- Mitsubishi PLS/PLF, LS 엣지 접점 — 출처 없음 [미정].

## 6. 골든 벡터
`packages/engine/vectors/plcedge.json` — 위 규칙으로 스캔을 손으로 따라가 계산한 값.
