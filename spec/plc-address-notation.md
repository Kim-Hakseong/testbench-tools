# plc-address-notation.md — PLC 주소 표기 규칙 근거 (사람 검증 게이트)

구현 규칙: 아래 표에 출처가 기재된 항목만 툴로 구현한다. (벤더 상수 검증 게이트)

주소 표기는 아날로그 raw 범위와 같은 부류로 취급한다 — 틀리면 잘못된 주소를
읽고 쓰게 되고, 화면상으로는 정상으로 보인다.

## 구현 완료

| 벤더/계열 | 규칙 | 근거 | 상태 |
|---|---|---|---|
| Siemens S7 (S7-300/400/1200/1500) | 주소 = 영역 + 바이트 오프셋 + 접근 폭. X=비트(0–7), B=1바이트, W=2바이트, D=4바이트. 워드/더블워드는 빅엔디안. `%M10.3` = 바이트 10의 비트 3. `DBx.DBWy` = 데이터블록 x의 바이트 y~y+1. | 주소 모델 자체의 산술 — 벤더별 매직 넘버 없음. 겹침·절대 비트 인덱스는 전부 이 정의에서 유도됨. | ✅ 구현됨 (`s7address.ts`, `vectors/s7address.json`) |
| Mitsubishi MELSEC iQ-R (R시리즈 CPU) | 디바이스 번호 표기: **X, Y = 16진**. M·L·F·V·S·T·ST·C·LC·D·SM·SD = 10진. B·SB·W·SW = 16진. | **MELSEC iQ-R CPU Module User's Manual (Application), SH-081264ENG, 22.1 Device List** — "Notation" 열에 디바이스별 진법이 명시됨. | ✅ 구현됨 (`melsec.ts`) |
| Mitsubishi MELSEC iQ-F / FX5 | 디바이스 번호 표기: **X, Y = 8진**. M·L·F·S·T·ST·C·LC·D·SM·SD·R·Z = 10진. B·SB·W·SW = 16진. | **MELSEC iQ-F FX5 User's Manual (Application), JY997D55401AD, 4.1 List of Devices** — "Notation" 열에 디바이스별 진법이 명시됨. | ✅ 구현됨 (`melsec.ts`) |
| Rockwell / Allen-Bradley SLC 500 | 데이터 테이블 `<타입><파일번호>:<엘리먼트>[/<비트>]`. 엘리먼트 0–255, 엘리먼트 1개 = 16비트 워드, 비트 0–15. I/O는 슬롯 기준 `I:<슬롯>.<워드>/<비트>` (워드는 슬롯 점수가 16 초과일 때 필요). 예약 파일 0–8 = O·I·S·B·T·C·R·N·F, 9–255는 사용자 지정(B/T/C/R/N/F/ST/A). | **SLC 500 Instruction Set Reference Manual, Rockwell Automation 1747-RM001G-EN-P (2008-11), Processor Files** — 구분자·범위·I/O 형식·기본 파일 배정이 본문과 예제(`N7:2`, `N7:2/8`, `I:2.1/3`, `O:5.1`)에 명시됨. | ✅ 구현됨 (`abslc.ts`) |
| LS ELECTRIC XGT (XGK / XGB) | **비트 디바이스**(P·M·K·F·L·S, T/C 접점)는 점 없이 쓰고 **마지막 자리가 16진 비트**, 앞부분은 10진 워드 (`P2047F` = 워드 2047·비트 15). **워드 디바이스**(D·R·U·Z, T/C 현재값)는 점으로 비트 지정하며 **워드 번호는 10진, 비트 번호는 16진** (`D0011.A` = 워드 11·비트 10). | **LS ELECTRIC, XGK/XGB Instructions and Programming V2.2 — §2.2** ("the lowest place should be marked in hexadecimal", "Word device number is displayed in decimal and bit number in hexadecimal") **및 §2.3 Device Area**(비트/워드 디바이스 분류, 입력 범위 표). | ✅ 구현됨 (`lsxgt.ts`) |

> iQ-R와 FX5의 X/Y 진법이 서로 다르다(16진 vs 8진)는 점이 두 매뉴얼의 디바이스 목록
> 표에서 각각 확인된다. 통설이 아니라 벤더 1차 문서의 "Notation" 열이 근거다.
> 그래서 툴은 계열을 반드시 먼저 고르게 하고, 계열별 진법으로만 해석한다.

S7 항목이 게이트를 통과하는 이유: 구현된 값이 "이 벤더는 27648" 같은 **외부 상수가
아니라**, 문서화된 주소 모델에서 바로 나오는 **산술**이기 때문이다. 폭이 2바이트라는
사실만 주어지면 `%MW100`이 바이트 100–101을 덮는다는 것과 `%MW101`과 겹친다는 것은
계산으로 확정된다.

## 구현 금지 (근거 미기재)

아래는 매뉴얼로 확인한 값을 이 표에 적기 전까지 구현하지 않는다.

| 벤더/계열 | 확인이 필요한 것 | 출처 | 상태 |
|---|---|---|---|
| Mitsubishi MELSEC — Q / L 계열 | iQ-R과 같은지 계열별 확인 필요 (iQ-R·FX5만 확인됨) | (미기재) 해당 계열 매뉴얼 확인 후 기재 | ⛔ 구현 금지 |
| Rockwell / Allen-Bradley — Logix (ControlLogix/CompactLogix) | 태그 기반이라 숫자 주소 변환 대상이 아님 — 툴에서 제외한다고 페이지에 명시함 | 해당 없음 | ⛔ 구현 대상 아님 |
| Rockwell / Allen-Bradley — PLC-5 | SLC 500과 파일 표기가 같은지 별도 확인 필요 (SLC 500만 확인됨) | (미기재) PLC-5 매뉴얼 확인 후 기재 | ⛔ 구현 금지 |

### 기재할 때 필요한 항목

1. 계열명과 확인한 매뉴얼의 문서번호·판번호·페이지
2. 디바이스별 진법과 유효 범위 (예: `X` 0–…, 진법 …)
3. 비트/워드 접근 문법과, 워드 접근이 여러 디바이스를 덮는 경우 그 규칙
4. 같은 벤더 안에서 계열별로 다르면 계열마다 한 줄씩

**주의**: Mitsubishi는 계열에 따라 X/Y 진법이 다르다는 이야기가 널리 통용되지만,
이 저장소는 그런 통설을 근거로 삼지 않는다. 매뉴얼에서 확인된 값만 기재한다.
