# plc-pulse-semantics.md — Mitsubishi PLS/PLF·LDP/LDF, LS OUTP/OUTN·LOADP/LOADN 근거 (벤더 상수 검증 게이트)

구현 규칙: `packages/engine/src/plcpulse.ts`는 아래에 출처·인용으로 적힌 동작만 구현한다. 매뉴얼이 침묵하는 곳은
**가정(E1…)**으로 이름 붙이고 툴 화면에도 밝힌다.

작성 2026-11-19.

| 기호 | 문서 | 위치 |
|---|---|---|
| M1 | Mitsubishi **MELSEC iQ-F FX5 Programming Manual (Instructions, Standard Functions/Function Blocks)**, JY997D55801 rev. Z (PDF 2024-08) | https://dl.mitsubishielectric.com/dl/fa/document/manual/plcf/jy997d55801/jy997d55801z.pdf — LDP/LDF/ANDP/ANDF/ORP/ORF p.117–120, PLS p.152–153, PLF p.154–155, CJ p.436–437 |
| M2 | Mitsubishi **MELSEC iQ-F FX5 Programming Manual (Program Design)**, JY997D55701 rev. M (PDF 2023-04) | https://dl.mitsubishielectric.com/dl/fa/document/manual/plcf/jy997d55701/jy997d55701m.pdf — IF/CASE 안의 상승·하강 실행 명령 표 p.57 |
| L1 | LS ELECTRIC **XGK/XGB Instructions and Programming**, V2.2 (2014.04) | https://www.ls-electric.com/upload/customer/download/c4090ad3-f6a5-424a-a5fd-ef46a70eecd8/XGK_XGB_Instructions_Manual_Eng_V2.2.pdf — JMP-LABEL 2-47, LOADP/LOADN 4-1–4-2, OUTP/OUTN 4-16–4-17 |

쪽 번호는 인쇄 쪽이다. L1은 LS 공식 사이트에서 받을 수 있는 영문판 중 확인한 것이며, Solution Square에 V2.9(2020-12)가 있으나
페이지가 스크립트로 그려져 내려받지 못했다 → **[미정] 사람 작업: V2.9에서 아래 L1 인용 대조.**

## 1. 펄스 접점 — 렁 결과 자체가 한 스캔 ON
- Mitsubishi LDP: "The LDP instruction is the rising edge pulse operation start instruction, and becomes conductive (ON) only at the rising edge (OFF to ON) of the specified bit device." LDF: "becomes conductive (ON) at the falling edge (ON to OFF) of the specified bit device." (M1 p.118)
- "When only the LDP instruction is programmed, operation is the same as the conversion of the instruction under execution to pulse instruction (P)." 그림: `LDP X0 → OUT M0` ≡ `LD X0 → PLS M0`. (M1 p.118)
- 예시 타이밍도: "M0 is ON during only one operation cycle when X0 or X1 turn from OFF to ON." (M1 p.119)
- LS LOADP: "Operation result is On when specified contact changes Off to On (Rising edge of pulse)". LOADN: "Operation result is On when specified contact changes On to Off (Falling edge of pulse)". (L1 4-1)

## 2. 펄스 코일 — 지정 디바이스가 한 스캔 ON
- Mitsubishi PLS: "This instruction turns ON the specified device for one scan when the PLS command turns from OFF to ON, and turns OFF in other cases. When there is one PLS instruction programmed for the device specified by (d) during a scan, the specified device turns ON for one scan." (M1 p.153) PLF는 "turns OFF from ON"으로 같은 문장. (M1 p.154)
- LS OUTP: "when up to OUTP Instruction operation result changes Off → On, specified contact is On for 1 scan and the others than that, it will be Off." OUTN: "changes On → Off". (L1 4-16)

귀결(인용이 아니라 위 규칙 + 렁 순서의 결과, `plc-scan-order-semantics.md` §1·§4와 같은 추론):
- P1. 코일 디바이스는 PLS(OUTP)가 실행된 지점부터 **다음 스캔에서 같은 명령이 다시 실행될 때까지** ON이다("turns OFF in other cases" — 다음 실행에서 끈다). 그래서 PLS 아래 렁은 같은 스캔에, 위 렁은 한 스캔 뒤에 펄스를 본다.
- P2. `LDP → OUT M`도 같은 자리에서 매 스캔 쓰므로 같은 구간 ON이다 — M1이 둘을 같다고 적은 것과 일치한다.
- P3. 입력이 두 스캔 사이에서 켜졌다 꺼지면 어떤 펄스 명령도 보지 못한다(스캔 시작 표본만 본다 — 타이머·엣지 툴과 같은 입력 모델).

## 3. 점프로 건너뛴 펄스
- Mitsubishi CJ: "When the execution command is off, the program in the next step is executed." / "The value in the device skipped with these instructions remains the same." / 예: "Y4 and Y5 remain the same even if X2 and X4 turn on/off during the execution of the CJ instruction." (M1 p.436–437)
- **PLS·PLF 주의 문장:** "Note that the device specified by (d) sometimes turns ON for one scan or more when the PLS instruction is made to jump by the CJ instruction or the executed subroutine program was not called by the CALL(P) instruction." (M1 p.153, PLF p.155 동일)
- LS: "With JMP conditions satisfied to jump to applicable label, all instructions between JMP instruction and LABEL will not be operated." (L1 2-47)

귀결:
- J1. 펄스 스캔 직후 점프가 걸리면 PLS(OUTP)가 실행되지 않아 디바이스를 끄지 못한다 → **점프가 풀릴 때까지 ON**. M1의 "one scan or more"가 이것이다.

**가정 E1.** 각 펄스 명령은 자기 직전 상태(이전 ON/OFF 판정)를 스스로 기억하고, **실행될 때만** 갱신한다. 근거: 건너뛴 명령은 아무것도 쓰지 않는다(M1 CJ "remains the same", L1 "will not be operated"); M2 p.57 표가 판정을 명령마다 "the ON/OFF judgment of the instruction at the time of the previous scan"으로 다룬다; M1 PLS의 RUN→STOP→RUN 문장(§4)이 이 기억이 명령에 붙어 남는다는 것을 보여 준다. 두 매뉴얼 모두 점프 중 기억 갱신을 직접 적지 않으므로 가정으로 둔다.
- J2(E1의 귀결). 점프 중에 입력이 꺼졌다 다시 켜지면, 점프가 풀린 첫 실행은 "이전 ON / 지금 ON"을 보므로 **그 상승 엣지를 놓친다**.

## 4. 첫 스캔과 RUN 재시작
- Mitsubishi: "If the RUN/STOP/RESET switch is changed from RUN to STOP after execution of the PLS instruction, the PLS instruction will not be executed even if the switch is set to RUN again." (M1 p.153, PLF p.154 동일) — 입력이 계속 ON이면 RUN 재시작 때 다시 펄스가 나오지 않는다.
- Mitsubishi RUN 중 쓰기: "When write during RUN is completed for a circuit including a rising edge instruction (LDP/ANDP/ORP instruction), the instruction is not executed regardless of the ON/OFF status of the target device … The instruction is executed when the target device and the device in the operation conditions is set from OFF to ON again." (M1 p.153)
- 전원 투입 첫 스캔에 입력이 이미 ON일 때의 동작은 M1·L1 모두 적지 않는다.

**가정 E2.** 첫 스캔의 "직전 상태"는 사용자 입력이다(기본 OFF). OFF면 첫 스캔에 이미 ON인 입력이 상승 펄스를 낸다; ON이면 내지 않고, 대신 첫 스캔에 OFF인 입력이 하강 펄스를 낸다. 툴은 RUN 재시작·RUN 중 쓰기를 시뮬레이션하지 않고 위 인용으로 설명만 한다.

## 5. 벤더 차이
- 위 인용 범위에서 Mitsubishi와 LS의 동작은 같다(접점 펄스 = 렁 결과, 코일 펄스 = 디바이스 한 스캔, 점프 구간은 실행되지 않음). 툴의 벤더 선택은 **니모닉 표기만** 바꾼다: LDP/LDF ↔ LOADP/LOADN, PLS/PLF ↔ OUTP/OUTN, CJ P0 ↔ JMP/LABEL.
- LS 매뉴얼에는 M1의 "one scan or more" 같은 점프 주의 문장이 없다. 툴은 J1을 L1 "will not be operated"에서 같은 방식으로 이끌어 낸 것으로 표시한다.

## 6. 구현하지 않는 것
- MC/MCR(Mitsubishi)·MCS/MCSCLR(LS) 영역 안의 펄스: M1 MC 표는 "Devices in basic instructions and applied instructions — Current status is maintained"라고만 적고 PLS를 따로 다루지 않는다 → [미정].
- ST IF/CASE 안의 펄스(M2 p.57 표), SFC 스텝 재활성 시 펄스, 서브루틴 미호출(CALL), ANDP/ORP 조합, 워드 비트 지정 — 범위 밖.

## 7. 골든 벡터
`packages/engine/vectors/plcpulse.json` — 위 규칙으로 스캔을 손으로 따라가 계산한 값(엔진 출력에서 가져오지 않음).
