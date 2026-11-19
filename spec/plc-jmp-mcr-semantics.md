# plc-jmp-mcr-semantics.md — JMP·MCR 영역 근거 (벤더 상수 검증 게이트)

구현 규칙: `packages/engine/src/plcjmp.ts`는 아래에 출처·인용으로 적힌 동작만 구현한다. 매뉴얼이 침묵하는 곳은
**가정(D1…)**으로 이름 붙이고 툴 화면에도 밝힌다. IEC 61131-3 원문은 인용하지 않는다.

작성 2026-11-19. 출처는 타이머·스캔 순서 spec과 같은 문서다(`plc-timer-semantics.md`, `plc-scan-order-semantics.md`).

| 기호 | 문서 | 위치 |
|---|---|---|
| S5 | Siemens **S7-1200 Programmable controller System Manual**, 11/2011, A5E02486680-05 | JMP/JMPN/LABEL p.217 (Table 7-107, 7-108) |
| S6 | Rockwell Automation **Logix 5000 Controllers General Instructions**, Publication **1756-RM003Z-EN-P**, September 2024 (NHP 배포처 미러, 공식 사이트 대조 [미정] — 타이머 spec과 같은 사람 작업) | JMP/LBL p.620–621, MCR p.630–633, RTO p.103–106, TOF p.111–115, TON p.119–123 |

쪽 번호는 인쇄 쪽이며 이 PDF에서는 PDF 쪽 번호와 같다.

## 1. JMP — 건너뛴 렁은 실행되지 않는다
- "When true, the JMP instruction skips to the referenced LBL instruction and the controller continues executing from there. When false, the JMP instruction does not affect ladder execution." (S6 p.620)
- "IMPORTANT: Jumped logic is not scanned. Place critical logic outside the jumped zone." (S6 p.621)
- "The LBL instruction must be the first instruction on the rung." / 실행표 "(For LBL) no action taken" (S6 p.621)
- Siemens: "If there is power flow to a JMP coil (LAD) … then program execution continues with the first instruction following the specified label." / "You can jump forward or backward." (S5 p.217)

귀결(인용이 아니라 위 규칙의 직접 결과):
- J1. 건너뛴 렁의 OTE는 쓰지 않으므로 **비트는 마지막으로 실행된 스캔의 값에 머문다**. 입력이 바뀌어도 출력이 따라가지 않는다.
- J2. 건너뛴 Logix 타이머는 실행되지 않으므로 ACC·DN·EN도 그대로다. **다시 실행되는 첫 스캔**에 타이머 흐름도의 누적 단계 `ACC = ACC + (current_time − last_time_scanned)`(S6 TON p.122, RTO p.105, TOF p.114; `plc-timer-semantics.md` §3)가 마지막 실행 이후 흐른 시간 전체를 한 번에 더한다. 그래서 TON/RTO는 건너뛴 동안 입력이 꺼졌다 켜졌어도 그 시간을 "계속 켜져 있던 것"으로 셈하고, 재개 스캔에서 ACC가 PRE를 훌쩍 넘을 수 있다(타이머 spec: Logix ACC는 PRE에서 멈추지 않는다).
  - 이 귀결은 흐름도의 `last_time_scanned`가 건너뛴 스캔에서 갱신되지 않는다는 데 기댄다 — 실행되지 않는 명령은 아무것도 쓰지 않으므로(J1과 같은 이유). 이것을 **가정 D1**로 이름 붙인다.
- J3. Siemens IEC 타이머(TON 등)가 JMP로 호출되지 않을 때의 동작은 S5에 없다 → **[미정]**. 툴은 타이머 행을 Logix로만 그린다.

## 2. MCR — 영역 안 렁을 "거짓"으로 실행한다
- "The MCR instruction is able to override the normal behavior of rungs; forcing every instruction to execute as if rung-condition-in is false." (S6 p.631)
- "Each time the MCR instruction is executed with rung-condition-in false, the override behavior is toggled. Consequently, two MCR instructions are normally required: one to start the "zone" and a second to terminate it." (S6 p.631)
- "The terminating MCR is normally unconditional. If the zone is enabled, the terminating MCR will be true so it will do nothing. If the zone is disabled, however, the terminating MCR will be false so it will toggle the override, re-enabling the rungs that follow it." (S6 p.631)
- "You should end the zone with an unconditional MCR instruction. If the terminating MCR is false, and the zone is enabled, the terminating MCR will disable all of the rungs that follow it." (S6 p.631)
- "Do not jump into an MCR zone. If the starting MCR is not executed, the zone will not be disabled." (S6 p.631)
- "The override bit is automatically reset at the end of the routine." (S6 p.631)
- "Place critical operations outside the MCR zone. If you start instructions such as timers in a MCR zone, instruction execution becomes false when the zone is disabled and the timer will be cleared." (S6 p.632)
- 실행표: Prescan N/A / "Rung-condition-in is false — The override behavior is toggled enabling or disabling the rungs that follow." / Rung-condition-in is true N/A (S6 p.632)
- 예시 설명: "the controller executes the rungs in the MCR zone (between the two MCR instructions) and the EnableIn goes false for all the rungs in the MCR zone, regardless of input conditions." (S6 p.633)

모델: 루틴마다 override 비트 o = FALSE로 시작한다. 각 렁의 실효 조건 = (렁 조건) AND NOT o. MCR 렁의 실효 조건이 FALSE면 o를 뒤집는다. 영역 안 렁은 **실행된다** — 다만 거짓으로.

귀결(위 규칙 + 각 명령의 rung-false 실행표):
- M1. OTE: rung false → "The data bit is cleared to false." (S6 p.76–77) → 영역이 꺼지면 **출력이 즉시 FALSE**. (JMP와 반대: JMP는 그대로 둔다.)
- M2. TON: rung false → EN·TT·DN 해제, ACC = 0 (S6 p.122 흐름도). 위 p.632 "the timer will be cleared"와 일치.
- M3. TOF: rung false가 곧 **오프 딜레이 시작**이다(S6 p.114 흐름도: DN이 TRUE면 타이밍 시작, ACC ≥ PRE에서 DN 해제). 그래서 영역을 꺼도 **TOF.DN은 PRE 동안 TRUE로 남는다**. p.632의 "the timer will be cleared"는 TOF에는 그대로 맞지 않는다 — 툴은 TOF 실행표를 따른다.
- M4. RTO: rung false → EN·TT 해제, **ACC·DN 유지**(S6 p.105). 영역을 다시 켜면 첫 참 스캔은 last_time만 잡고(EN이 FALSE였으므로) 그 다음부터 누적한다 — JMP(J2)처럼 공백을 한 번에 더하지 않는다.
- M5. 조건부 종료 MCR: 영역이 켜져 있고 종료 MCR 렁이 FALSE면 o가 TRUE로 뒤집혀 **영역 밖의 뒤 렁들이 꺼진다**. 영역이 꺼져 있으면 종료 MCR은 강제로 거짓이 되어 o를 되돌린다. 그래서 뒤 렁은 "영역이 꺼져 있을 때는 정상, 영역이 켜져 있고 종료 조건이 거짓일 때는 꺼짐"이 된다. o는 루틴 끝에서 리셋되므로 다음 스캔은 다시 o = FALSE로 시작한다.
- M6. MCR 영역 안으로 점프: 시작 MCR이 실행되지 않으므로 o는 FALSE 그대로 → 레이블 뒤 영역 렁은 **시작 조건과 상관없이 정상 실행**된다. 건너뛴 렁은 J1대로 머문다. 종료 MCR(무조건)은 참이라 아무것도 하지 않는다.

**가정 D2.** OTL/OTU·카운터 등 툴에 없는 명령은 다루지 않는다. 툴의 영역 안 명령은 OTE, TON, TOF, RTO뿐이다.
**가정 D3.** 툴 프로그램은 앞으로만 점프한다(뒤로 점프는 같은 스캔에서 렁을 반복 실행하므로 이 툴 범위 밖).

## 3. 매뉴얼 오기
- **MCR Flow Chart (False), S6 p.633.** "zone enabled?" 판단의 yes 가지가 "zone is disabled" 상자로 간 뒤 본선으로 다시 합류해 "zone is enabled" 상자를 지나므로, 그림대로 따라가면 어느 쪽이든 영역이 켜진다. 같은 명령의 설명("the override behavior is toggled")과 실행표와 맞지 않는다. 설명·실행표를 따른다(no 가지만 "zone is enabled"로 가는 그림의 오기로 본다).
- (참고) p.632의 "timers … will be cleared"는 TON에는 맞고 TOF·RTO에는 각자 실행표와 다르다(M3, M4). 오기라기보다 일반화이므로 툴 화면에 차이를 밝힌다.

## 4. 구현하지 않는 것
- 뒤로 점프·중첩/겹친 MCR 영역("unpredictable machine operation", S6 p.632)·서브루틴/AOI 안의 MCR — 범위 밖.
- Siemens IEC 타이머의 건너뜀 동작(J3) — [미정].
- Logix 물리 출력 갱신 시점 — `plc-scan-order-semantics.md` §3과 같은 [미정].

## 5. 골든 벡터
`packages/engine/vectors/plcjmp.json` — 위 규칙으로 스캔을 손으로 따라가 계산한 값(엔진 출력에서 가져오지 않음). 스캔 10 ms, PRE 100 ms.
