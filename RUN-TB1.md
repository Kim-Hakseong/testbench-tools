[RUN-TB1 — TestBench.tools: MCP 서버 + 툴 페이지 CTA + Noctra 대기 페이지. 배포·퍼블리시·결제 금지, 대화형 질문 금지]

## 0. 규칙
- 질문하지 말고 끝까지 진행. 막히면 docs/run-tb1/BLOCKERS.md 에 기록하고 다음 항목으로.
- 모든 주장은 숫자 게이트(PASS/FAIL)로 증명. 라벨: confirmed / estimated / unverified.
- 외부 배포 금지: Cloudflare/Vercel/npm publish/GitHub release 실행 금지. 배포는 "사람이 실행할 명령 한 줄"로만 남길 것.
- 기존 사이트 디자인 토큰·레이아웃·다국어(EN/KO/JA/DE/ZH) 구조를 따를 것. 새 색·폰트 추가 금지.
- 제3자 상표·바이너리를 저장소에 넣지 말 것. 브랜드 표기는 "Noctra"(이 철자로 통일, NOKTRA 표기가 있으면 Noctra로 교체).
- 커밋은 단계별로. 마지막에 docs/run-tb1/REPORT.md 작성.

## 1. 현황 파악 (쓰기 없음)
- 저장소 구조, 빌드 도구, 56개 툴의 구현 패턴(각 툴의 순수 계산 함수가 어디에 있고 UI와 어떻게 분리돼 있는지), 카테고리 메타데이터 위치, 다국어 처리 방식, 분석(analytics) 도구 유무를 docs/run-tb1/SURVEY.md 에 표로.
- 각 툴마다 "순수 함수로 분리 가능 여부"를 confirmed/estimated 로 표기. 분리 불가 툴은 사유.

## 2. 공용 코어 추출
- 56개 툴의 계산 로직을 UI 없는 패키지 packages/bench-core (TypeScript) 로 추출. 각 툴 = 입력 스키마(zod 또는 JSON Schema) + 순수 함수 + 설명 문자열.
- 웹 툴 페이지는 bench-core 를 import 해서 기존과 동일하게 동작해야 함(동작 변경 0).
- 게이트 G2-1: 56/56 툴이 bench-core 로 이전됨(불가 툴은 BLOCKERS 에 사유, 그래도 50/56 이상이면 PASS).
- 게이트 G2-2: 툴별 회귀 테스트 — 기존 UI 로직과 bench-core 결과를 같은 입력으로 비교, 툴당 최소 5케이스, 전부 일치.
- 게이트 G2-3: 사이트 빌드 성공, 툴 페이지 전부 렌더(링크 체크 0 오류).

## 3. MCP 서버 두 형태 (같은 bench-core)
A. packages/bench-mcp-remote — Cloudflare Workers + Streamable HTTP 방식 MCP 서버. 의존성은 정확한 버전 핀, 2주 이상 된 버전만.
B. packages/bench-mcp-local — stdio 방식, `npx` 로 실행 가능한 구조(퍼블리시는 금지, 로컬 `npm link` 로 검증).
- 툴 이름 규칙: 카테고리 접두사 (예: crc.modbus16, mil1553.decode_command, plc.xgt_address). 설명은 영어, 1~2문장, 입력 예시 포함.
- 게이트 G3-1: MCP Inspector(또는 동등한 로컬 클라이언트)로 tools/list → 56개(또는 G2-1 통과 수) 전부 노출.
- 게이트 G3-2: 툴별 tools/call 샘플 1회 이상 성공, 결과가 웹 툴과 동일(20개 무작위 비교, 20/20).
- 게이트 G3-3: Claude Code 로컬 설정(.mcp.json 예시)으로 B를 붙여 실제 호출 3건 성공 로그 저장.
- 배포는 docs/run-tb1/DEPLOY.md 에 사람이 실행할 명령(wrangler deploy 등)과 필요한 계정·환경변수만 기록.

## 4. 사이트: /mcp 페이지
- 설치 한 줄(원격 URL은 플레이스홀더 `https://mcp.testbench.tools` 로 두고 DEPLOY.md 에서 바꾸도록), Claude Code 예시 3개(CRC 확인, 1553 커맨드 워드 디코드, XGT 주소 변환), 툴 전체 목록(bench-core 메타에서 자동 생성), "100% stateless, 입력 저장 안 함" 문구.
- 상단 내비게이션에 MCP 항목 추가. 5개 언어 모두.

## 5. 툴 페이지 CTA ("다음 단계" 블록)
- 모든 툴 페이지 하단에 같은 컴포넌트 1종. 광고 톤 금지, 같은 문제의 더 큰 버전으로 안내하는 한 문장 + 링크 하나.
- 카테고리별 목적지:
  - Avionics & Data Bus → /noctra/bus ("실물 1553/429 버스에서 수백 메시지를 보려면")
  - File Tools(TDMS·CSV·HEX) → /noctra/view ("수 GB 측정 파일, DIAdem식 탐색")
  - PLC & Industrial 중 LS XGT 3종 → /noctra/oneshot ("도면에서 XG5000 래더까지 자동 생성")
  - PLC 나머지·Protocol Decoders → 기존 Desktop Apps(Modbus Workbench 등) 해당 앱
  - Checksum·Data Converters·Embedded·Sensor → /mcp ("Claude Code 안에서 바로 쓰기")
- 게이트 G5-1: 56/56 페이지에 CTA 렌더, 목적지 링크 전부 유효.
- 게이트 G5-2: 모바일 폭(390px)에서 레이아웃 깨짐 0 (스크린샷 3장 저장).

## 6. Noctra 대기 페이지 3개 (/noctra/bus, /noctra/view, /noctra/oneshot)
- 각 페이지: 제품 한 줄 정의, 스크린샷 자리(플레이스홀더, 사람이 교체), "폐쇄망·설치형·오프라인" 3단어, 대기 명단 CTA 는 기존 Contact 페이지로 연결(mailto 또는 기존 폼, 제목에 제품명 자동 삽입). 새 외부 서비스 추가 금지.
- /noctra 인덱스 1장. 사이트의 NOKTRA 외부 링크는 /noctra 로 교체.

## 7. 필드 노트 하단
- 노트 글 끝에 "검증 의뢰" 한 줄 + Contact 링크 컴포넌트. 5개 노트 전부.

## 8. 계측
- 기존 analytics 가 있으면 CTA 클릭·MCP 페이지 조회·대기 CTA 클릭에 이벤트 이름 부여. 없으면 BLOCKERS 에 "분석 도구 없음, 후보 2개와 설정 방법" 기록(설치 금지).
- docs/run-tb1/METRICS.md: 분기 목표 가설(GitHub 스타 100, 앱 다운로드 50/월, MCP 설치 30, 문의 2/월)과 각 지표를 어디서 읽는지.

## 9. 홍보 초안 (파일로만)
- docs/run-tb1/POST-reddit.md: r/ClaudeAI, r/embedded 용 소개 글 각 1개(영어, 150단어 이내, 링크는 /mcp).
- docs/run-tb1/POST-github-readme.md: 공개 저장소 README 상단에 넣을 MCP 소개 블록.

## 10. 마무리
- 커밋. REPORT.md 에: 게이트 결과표(전부 PASS/FAIL 숫자), 변경 파일 수, bench-core 로 못 옮긴 툴과 사유, DEPLOY.md 요약, 사람이 결정·실행할 것 목록(배포 명령, 스크린샷 교체, Cloudflare 계정, Noctra 개명 확정).
