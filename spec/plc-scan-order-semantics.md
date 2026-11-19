# plc-scan-order-semantics.md — 스캔 순서 함정 근거 (벤더 상수 검증 게이트)

구현 규칙: `packages/engine/src/plcscan.ts`는 아래에 출처·인용으로 적힌 동작만 구현한다. 매뉴얼이 침묵하는 곳은
**가정(C1…)**으로 이름 붙이고 툴 화면에도 밝힌다. IEC 61131-3 원문은 인용하지 않는다.

작성 2026-11-18. S1(Beckhoff Tc2_Standard v1.3.4), S5(Siemens S7-1200 System Manual A5E02486680-05), S6(Rockwell
1756-RM003Z-EN-P 2024-09, 공식 사이트 대조 [미정] 1건은 `plc-timer-semantics.md`와 같은 사람 작업)는 타이머 spec과 같은 문서다.
추가 출처:

| 기호 | 문서 | 위치 |
|---|---|---|
| S7 | CODESYS 4 online help — LD basics | https://content.helpme-codesys.com/en/CODESYS%204/_c4ld_basics.html |
| S8 | CODESYS online help — FBD/LD/IL programming language | https://content.helpme-codesys.com/en/CODESYS%20LD%20FBD/_cds_f_programming_language_fbd_ld_il.html |

## 1. 실행 순서
- "The black vertical line represents the bus bar. It connects the numbered networks to form an interconnected ladder diagram. The networks are processed in order along the bus bar from top to bottom." (S7)
- "The signal flow in the network runs from left to right. The signal flow in the editor runs from top to bottom, starting with network 1." (S8)
- Rockwell RM003에는 렁 실행 순서를 직접 적은 문장이 없다. JMP 설명이 순차 실행을 전제한다: "When true, the JMP instruction skips to the referenced LBL instruction and the controller continues executing from there. … Jumping forward to a label saves program scan time by omitting a logic segment until it is needed. Jumping backward lets the controller repeat iterations of logic." (S6 p.620)

**가정 C1.** Logix 래더 루틴도 위에서 아래로 렁을 한 번씩 실행한다(위 JMP 설명이 전제하는 순서). 툴의 시나리오는 JMP·서브루틴·인터럽트 없이 렁만 나열한다.

## 2. 코일(OTE / `=`)은 매 실행마다 쓴다
- CODESYS coil: "If the signal line is conductive up to the coil, then the output signal is set. Otherwise, it will be reset. This works similarly to an assignment operator." (S7)
- Logix OTE: "The Output Energize (OTE) instruction sets or clears the data bit based on rung condition." 실행표: Prescan "The data bit is cleared to false" / Rung false "The data bit is cleared to false" / Rung true "The data bit is set to true." / Postscan "The data bit is cleared to false." (S6 p.76–77)

귀결(인용이 아니라 위 두 규칙의 직접 결과): 같은 비트에 코일이 둘이면 각 코일이 실행될 때마다 덮어쓰므로 **스캔 끝 값은 마지막 코일의 렁 조건**이고, 두 코일 사이의 렁은 첫 코일이 쓴 중간 값을 읽는다.

## 3. 물리 출력은 스캔 끝 값만 본다 (프로세스 이미지)
- "Each cycle includes writing the outputs, reading the inputs, executing the user program instructions, and performing background processing." (S5 p.61)
- "Under the default configuration, all local digital and analog I/O points are updated synchronously with the scan cycle using an internal memory area called the process image." … "The CPU executes the logic of the user instructions and updates the output values in the process image output area instead of writing to the actual physical outputs." … "This process provides consistent logic through the execution of the user instructions for a given cycle and prevents the flickering of physical output points that might change state multiple times in the process image output area." (S5 p.62)

툴은 이중 코일의 "물리 출력"을 S7-1200 기본 설정(프로세스 이미지) 기준으로 스캔 끝 값으로 그린다.
**[미정] Logix 출력 갱신 시점.** Logix I/O가 프로그램 스캔과 어떤 관계로 출력 모듈에 전달되는지는 이 출처들에 없다. 툴은 Logix의 물리 출력을 따로 주장하지 않는다.

## 4. 원샷 출력 비트를 위·아래 렁에서 읽기
- OSR은 출력 비트를 "for one scan" 세운다. 프리스캔 storage TRUE, 렁 TRUE + storage 0 → storage·출력 비트 set, storage 1 → 출력 비트 cleared (`plc-edge-semantics.md` §3.2, S6 p.72–73).
- 귀결: 출력 비트는 OSR이 실행된 시점부터 다음 스캔의 OSR 실행까지 TRUE다. **OSR 아래 렁은 같은 스캔에, 위 렁은 다음 스캔에** 그 TRUE를 한 번 본다(§1 실행 순서 + 위 규칙).

## 5. SET/RESET 우선순위
- Beckhoff RS: "The RS function block is bistable and RESET is dominant." 구현: "Q1: = NOT RESET1 AND (Q1 OR SET);" (S1 p.9)
- Beckhoff SR: "The SR function block is bistable and SET is dominant." 구현: "Q1 := (NOT RESET AND Q1) OR SET1;" (S1 p.9)
  - (같은 쪽 입력 표는 SET/RESET이 "on a rising edge"에 동작한다고 적지만, 같은 쪽에 실린 내부 구현식은 레벨 동작이다. 구현식을 따른다.)
- Logix OTL: "When the rung condition is true, the OTL instruction sets the data bit to true. The data bit remains true until it is cleared, typically by an OTU instruction. When the rung condition is changed to false, the OTL instruction does not change the status of the data bit." Prescan N/A. (S6 p.77–78)
- Logix OTU: "The Output Unlatch (OTU) instruction clears (unlatches) the data bit." (S6 p.79)
  - (p.80 OTU 실행표의 Rung true 행은 "The data bit is set to true."라고 적혀 있다. 같은 명령의 설명과 반대이고 OTL 표와 글자까지 같아 복사 오기로 본다. 설명을 따른다.)
- 귀결: Logix에는 우선순위 규칙이 따로 없다. 같은 스캔에 OTL과 OTU가 모두 실행되면 **나중 렁이 이긴다**(§1 + 위 두 설명).
- 자기유지 렁 `(Start ∨ M) ∧ ¬Stop → OTE M`은 OTE 규칙(§2)과 직렬 AND·병렬 OR(S7: "Elements connected in a series are AND-ed. Elements in a parallel branch are OR-ed.")만으로 정해지며 Stop 우선이다.

**가정 C2.** OTL/OTU의 비트는 프리스캔에서 바뀌지 않으므로(N/A) 툴은 FALSE에서 시작한다고 둔다(보존 메모리 초기값은 프로그램·프로젝트 설정 몫).

## 6. 구현하지 않는 것
- 인터럽트·이벤트 태스크가 스캔 중간에 비트를 바꾸는 경우, 즉시 I/O(`:P`), Logix 비동기 I/O — 출처 범위 밖 [미정].
- MCR 영역, JMP로 건너뛴 코일 — `plc-jmp-mcr-semantics.md`(PLC JMP vs MCR 툴).

## 7. 골든 벡터
`packages/engine/vectors/plcscan.json` — 위 규칙으로 스캔을 손으로 따라가 계산한 값.
