# plc-timer-semantics.md — PLC 타이머 동작 근거 (벤더 상수 검증 게이트)

구현 규칙: `packages/engine/src/plctimer.ts`는 아래에 출처와 인용으로 적힌 동작만 구현한다.
매뉴얼이 침묵하는 부분은 **가정(A1…)**으로 이름을 붙이고, 툴 화면에도 같은 가정을 밝힌다.
IEC 61131-3 원문은 유료라 직접 인용하지 않는다. 대신 IEC 펑션 블록을 구현한 벤더의 공식 문서를 쓴다.

작성 2026-11-18. 원본 파일은 저장소에 넣지 않는다(저작권). 출처 URL과 판·쪽을 남긴다.

## 1. 출처

| 기호 | 문서 | 위치 |
|---|---|---|
| S1 | Beckhoff **TE1000 TwinCAT 3 PLC Library Tc2_Standard**, Version 1.3.4 (2026-04-08) | https://download.beckhoff.com/download/Document/automation/twincat3/TwinCAT_3_PLC_Lib_Tc2_Standard_EN.pdf — TOF·TON p.12–13, TP p.14 |
| S2 | Beckhoff Infosys, Tc2_Standard TON / TOF (S1과 같은 문구) | https://infosys.beckhoff.com/content/1033/tcplclib_tc2_standard/74406539.html · …/74405003.html |
| S4 | CODESYS Standard library online help, 3.5.22.0 — TON / TOF / TP | https://content.helpme-codesys.com/en/libs/Standard/Current/Timer/TON.html (TOF.html, TP.html) |
| S5 | Siemens **S7-1200 Programmable controller System Manual**, 11/2011, A5E02486680-05 | https://cache.industry.siemens.com/dl/files/246/61777246/att_98021/v1/s71200_system_manual_en-US_en-US.pdf — p.170–175 |
| S6 | Rockwell Automation **Logix 5000 Controllers General Instructions**, Publication **1756-RM003Z-EN-P**, September 2024 | RES p.101–102, RTO p.103–106, TOF p.111–115, TON p.119–123, pseudo-operand p.856–857 |

S6 주의: rockwellautomation.com이 자동 요청에 403을 돌려줘 공식 URL에서 받지 못했다. 같은 발행 번호(1756-RM003Z-EN-P, 2024-09)의 PDF를 Rockwell 대리점(NHP) 미러에서 받아 대조했다
(https://www.nhp.com.au/public/assets/pim/Original/10045/Allen-Bradley-Logix5000-Controllers-General-Instructions-User-Manual.pdf).
**[미정] 사람 확인 1건:** 공식 사이트에서 같은 판을 받아 위 쪽수의 문구가 같은지 한 번 대조한다. 틀리면 이 문서를 고치고 엔진을 다시 맞춘다.

## 2. IEC 타이머 (Beckhoff · CODESYS · Siemens)

### 2.1 TON
- "If IN = FALSE, the Q output has the value FALSE and the ET output has the value zero. As soon as IN is set to TRUE, the time in milliseconds is counted up in ET until the setpoint PT is reached." (S1 p.12–13)
- "Q is TRUE, if IN = TRUE and ET = PT. Otherwise Q = FALSE." (S1)
- IN: "Rising edge: Start timer / Falling edge: Reset timer" (S1) — CODESYS도 같다: "Rising edge: starts delay counter / Falling edge: resets delay counter" (S4)
- "Changing PT has no effect while the timer runs. Changing IN to FALSE, while the timer runs, resets and stops the timer." (S5 p.172, Table 7-19)
- ET 상한: "the elapsed time is clamped at the preset value (the timer does not continue to accumulate elapsed time after the preset is reached)" (S5 p.174)

구현: IN 상승 스캔에 시작 시각을 잡고 ET = min(t − 시작, PT), Q = ET ≥ PT. IN이 FALSE면 Q FALSE, ET 0.

### 2.2 TOF
- "If IN = TRUE, the Q output has the value TRUE and the ET output has the value zero. As soon as IN is set to FALSE, the time in milliseconds is counted up in ET until the setpoint PT is reached. Q is FALSE, if IN = FALSE and ET = PT. Otherwise Q = TRUE." (S1 p.12)
- IN: "Falling edge: Start timer / Rising edge: Reset timer" (S1) · CODESYS ET: "Elapsed time since falling edge at IN" (S4)
- "Changing PT has no effect while the timer runs. Changing IN to TRUE, while the timer runs, resets and stops the timer." (S5 p.172)
- (S1의 TOF 출력 표는 ET 타입을 BOOL로 적었지만 선언부는 `ET : TIME`이다. 문서 오기.)

**가정 A1 (기동 직후).** IN이 처음부터 FALSE면 하강 엣지가 없어 타이머가 시작되지 않는다("Falling edge: Start timer"). Q는 초기값 FALSE, ET 0으로 둔다. "Otherwise Q = TRUE"를 문자 그대로 읽으면 기동 시 Q가 TRUE가 되지만, 그 문장은 타이머가 시작된 뒤를 설명한다고 본다.
**가정 A2 (완료 후 ET).** 완료 뒤 IN이 계속 FALSE면 ET는 PT에 머문다("counted up … until the setpoint PT is reached", S5의 clamp).

### 2.3 TP
- "If IN = FALSE and Q = FALSE, the ET output has the value zero. As soon as IN is set to TRUE, Q = TRUE and remains TRUE for the pulse duration PT. As long as Q = TRUE, the time in milliseconds is counted up in ET until the setpoint PT is reached. The Q output remains TRUE until the pulse duration has elapsed, irrespective of the state of the IN input." (S1 p.14)
- ET: "Elapsed time since pulse timer started. It will then remain constant after PT is reached." (S4 TP)
- "Changing PT has no effect while the timer runs. Changing IN has no effect while the timer runs." (S5 p.172) — 펄스 중 재트리거 없음.

구현: Q가 FALSE일 때 IN 상승 엣지가 펄스를 시작한다. 펄스 중 IN 변화는 무시한다. ET = min(t − 시작, PT), ET = PT가 되는 스캔에 Q FALSE. 그 뒤 IN이 TRUE면 ET는 PT 유지, IN과 Q가 모두 FALSE면 ET 0.
펄스가 끝난 뒤에도 IN이 TRUE로 남아 있으면 새 펄스는 다음 상승 엣지까지 없다.

### 2.4 Siemens TONR (보존형)
- "Elapsed time is accumulated over multiple timing periods until the R input is used to reset the elapsed time." (S5 p.171)
- R: "1= Reset elapsed time and Q bit to 0" (S5 p.171)
- "Changing PT has no effect while the timer runs, but has an effect when the timer resumes. Changing IN to FALSE, while the timer runs, stops the timer but does not reset the timer. Changing IN back to TRUE will cause the timer to start timing from the accumulated time value." (S5 p.172)
- ET는 PT에서 멈춘다(S5 p.174 clamp). S5 p.174 TONR 타이밍도(그림)에서 Q는 IN이 떨어진 뒤에도 R까지 TRUE다.

구현: IN이 TRUE인 스캔 사이 시간을 더한다(IN이 다시 TRUE가 된 첫 스캔은 더하지 않음). ET = min(누적, PT), Q = ET ≥ PT. R이 TRUE인 스캔은 ET 0, Q FALSE.

### 2.5 공통
- 갱신 시점: "A timer update is performed when and only when: A timer instruction (TP, TON, TOF, or TONR) is executed …" (S5 p.175) — 툴은 스캔마다 한 번 실행한다.
- 음수 PT: "Negative PT (preset time) values are set to zero when the timer instruction is executed." (S5 p.172) — 툴은 음수 입력을 받지 않는다.

## 3. Allen-Bradley Logix 5000 (S6)

### 3.1 TIMER 구조와 시간 진행
- ".EN … The enable bit contains rung-condition-in when the instruction was last executed." / ".TT … The timing bit when set indicates the timing operation is in process." / ".DN … The done bit when set indicates the timing operation is complete (or paused)." / ".PRE … (1 millisecond units)" (p.120)
- "A timer runs by subtracting the time of its last scan from the current time: ACC = ACC + (current_time - last_time_scanned)" (p.105, p.112–113, p.120)
- 음수 .PRE/.ACC는 메이저 폴트 4/34 (p.105, 113, 121). 툴은 음수 입력을 받지 않는다.

### 3.2 TON (p.119–123)
- "The TON instruction accumulates time from the time it is enabled until: The timer is disabled / The timer completes" (p.120)
- Rung-condition-in false (prescan·postscan 동일): ".EN … cleared to false. … .TT … cleared … .DN … cleared … The .ACC value is cleared to zero." (p.121)
- TON Flow Chart (True), p.122(그림, 직접 판독): .TT를 TRUE로 → .DN이 TRUE면 .TT를 FALSE로 → (아니면) .EN이 FALSE면 last_time = current_time → (아니면) DeltaT = current_time − last_time, last_time = current_time, ACC = ACC + DeltaT → 오버플로면 ACC = 2147483647, .TT FALSE, .DN TRUE → ".ACC >= .PRE"면 .TT FALSE, .DN TRUE → .EN을 TRUE로.
- 순서도 어디에도 ACC를 PRE로 자르는 단계가 없다. **ACC는 PRE에 도달한 스캔의 값에서 멈추고, 스캔 주기가 PRE를 나누지 않으면 PRE보다 크다.** 첫 TRUE 스캔은 시간을 더하지 않는다.

### 3.3 TOF (p.111–115)
- "accumulates time when the instruction is enabled (rung-condition-in is false)" (p.111)
- Rung true: ".EN bit is set to true. The .TT bit is cleared to false. The .DN bit is set to true. The .ACC value is cleared to zero." (p.113)
- Prescan·postscan: ".EN … .TT … .DN … cleared to false. The .ACC value is set to equal the .PRE value." (p.113) — 기동 직후는 "이미 끝난" 상태(DN FALSE, ACC = PRE)다.
- TOF Flow Chart (False), p.114(그림, 직접 판독): .TT를 TRUE로 → .DN이 FALSE면 .TT FALSE → (아니면) .EN이 TRUE면 last_time = current_time → (아니면) ACC += DeltaT → ".ACC >= .PRE"면 .TT FALSE, .DN FALSE → .EN을 FALSE로.

### 3.4 RTO (p.103–106)와 RES (p.101–102)
- "The RTO instruction is a retentive timer that accumulates time when the instruction is enabled." (p.103)
- Rung false·prescan: ".EN bit is cleared to false. The .TT bit is cleared to false." ACC·DN은 건드리지 않는다. Postscan "N/A". (p.106)
- 예제: "Light_3 remains on until timer_3 is reset … the RES instruction resets timer_3 (clears status bits and .ACC value)." (p.106)
- RES: "When true, the RES instruction clears these elements: … TIMER .ACC value to 0, control status bits to false" (p.101)

**가정 A3 (RTO TRUE 순서도).** 이 판(2024-09)의 "RTO Flow Chart (True)"는 제목만 있고 그림이 비어 있다(p.106). TON 순서도(p.122)의 누적 단계를 그대로 쓴다: 다시 TRUE가 된 첫 스캔은 last_time만 잡고, 그 뒤 ACC += DeltaT, ACC ≥ PRE면 DN. 같은 매뉴얼 RTOR 설명이 뒷받침한다: "When the RTOR instruction is false, it retains its ACC value." (p.108) — 꺼져 있던 시간은 더하지 않는다.
**가정 A4 (RES 위치).** RES 렁은 같은 스캔에서 RTO 렁 **뒤에** 온다(매뉴얼 예제 배치). RES가 TRUE인 스캔의 최종 값은 ACC 0, EN·TT·DN FALSE.

### 3.5 펄스 타이머 없음
- S6의 "Timer and Counter Instructions" 장(p.87~) 목차: CTD, CTU, CTUD, RTO, RTOR, TOF, TOFR, TON, TONR (그리고 RES). 펄스 타이머(TP에 해당하는 명령)는 없다. 툴은 TP 비교에서 Logix 쪽을 비워 두고 이 사실만 밝힌다.

## 4. 구현하지 않는 것
- Logix에서 .DN을 사용자가 직접 써서 일시정지하는 기법("timing can be paused by setting the .DN bit", p.120) — 입력 모델 밖.
- Logix FBD 전용 TONR/TOFR/RTOR, Siemens S5 타이머, Mitsubishi·LS 타이머 — 이 문서에 출처가 없으므로 [미정].
- S7-1500·TIA 최신 판 대조 — S5는 2011년 판이다. [미정]
- 스캔 시간 지터·비동기 갱신(S5 p.175의 "ELAPSED/Q 직접 참조 시 갱신") — 툴은 고정 스캔, 스캔당 1회 실행만 모델링한다.

## 5. 골든 벡터
`packages/engine/vectors/plctimer.json` — 위 규칙으로 스캔을 손으로 따라가 계산한 값. 엔진 출력에서 만든 값이 아니다.
