[RUN-TB2 — RUN-TB1 산출물 배포·검증·마무리. 대화형 질문 금지. 토큰은 환경변수 CLOUDFLARE_API_TOKEN / NPM_TOKEN 으로만 읽고, 어떤 파일·로그·커밋에도 쓰지 말 것]

## 0. 규칙
- 질문하지 말고 끝까지. 막히면 docs/run-tb2/BLOCKERS.md 에 기록하고 다음 항목으로.
- 모든 주장은 숫자 게이트(PASS/FAIL). 라벨 confirmed/estimated/unverified.
- CLAUDE.md 와 충돌 시 CLAUDE.md 우선, 충돌 내용은 BLOCKERS 에 기록.
- 되돌릴 수 없는 작업(머지·푸시·퍼블리시)은 직전 게이트가 PASS 일 때만.
- 작업 위치: 브랜치 run-tb1 (worktree ~/Projects/testbench-tools-run-tb1). main 작업은 ~/Projects/testbench-tools.

## 1. 결정값 반영 (Haku 확정)
- 브랜드 철자: Noctra. 제품명: Noctra Bus / Noctra View / Noctra OneShot (Title Case, 대문자 VIEW 금지). B-3·B-4 닫기. Noctra 페이지 번역: 영어·한국어만.
- 원격 MCP 주소: https://mcp.testbench.tools (MCP_REMOTE_URL 확정).
- npm 패키지명: @testbench-tools/mcp (스코프 @testbench-tools 확보됨). package.json name 과 MCP_LOCAL_PACKAGE, /mcp 페이지·README·POST 문서의 설치 명령을 전부 이 이름으로 통일.
- 계측: BLOCKERS B-1 후보 1 (pulse.mjs 리퍼러 수집, 클라이언트 코드 변경 없음) 적용. 클라이언트 추적 스크립트 추가 금지.
- 스크린샷: 비움 유지(B-2). 플레이스홀더 만들지 말 것.
- CLAUDE.md: 워크스페이스 구성에 bench-core / bench-mcp-local / bench-mcp-remote 설명 추가(외부 의존성 0 명시).
- 게이트 G1: 위 변경 후 빌드 OK, 테스트 전부 통과, "NOKTRA"·"VIEW"(제품명 맥락)·"@testbench/mcp" 잔존 0건 (grep 결과 첨부).

## 2. 원격 MCP Worker 배포
- cd packages/bench-mcp-remote → `wrangler deploy` (CLOUDFLARE_API_TOKEN 사용, 브라우저 로그인 시도 금지).
- wrangler.jsonc 의 커스텀 도메인 설정을 켜서 mcp.testbench.tools 연결. DNS 전파 대기는 최대 10분, 30초 간격 폴링.
- 게이트 G2-1: workers.dev 주소로 tools/list → 58개.
- 게이트 G2-2: https://mcp.testbench.tools/mcp 로 tools/list → 58개, tools/call 3건(crc_modbus16 / mil1553_decode_command / plc_xgt_address) 결과가 RUN-TB1 evidence 와 동일 3/3.
- G2-2 가 10분 내 FAIL 이면 중단하지 말고 BLOCKERS 에 기록, 사이트 머지는 §3 로 계속(사이트는 URL 문자열만 참조).

## 3. 사이트 머지·배포
- cd ~/Projects/testbench-tools → `git fetch` → `git merge --ff-only run-tb1` → `git push origin main`.
- 게이트 G3-1: Cloudflare 배포 완료를 최대 10분 폴링. 라이브 https://testbench.tools/mcp 200, 5개 언어 전부 200.
- 게이트 G3-2: 라이브 툴 페이지 무작위 10개에 CTA 블록 존재 10/10, /noctra /noctra/bus /noctra/view /noctra/oneshot 200.
- 게이트 G3-3: 라이브 sitemap lastmod 가 배포일 일괄이 아님(서로 다른 날짜 2종 이상).

## 4. npm 퍼블리시
- 토큰은 `NPM_CONFIG_//registry.npmjs.org/:_authToken` 환경변수 방식으로만 전달, .npmrc 파일 생성 금지.
- packages/bench-mcp-local: private 제거 → version 0.1.0 → `pnpm build` → `npm publish --access public`.
- 게이트 G4-1: `npx -y @testbench-tools/mcp` 로 stdio 서버 기동, tools/list 58개.
- 게이트 G4-2: Claude Code .mcp.json 예시를 npx 방식으로 바꿔 실제 호출 1건 성공.
- Trusted Publishing 준비(2027-01 토큰 퍼블리시 폐지 대비): .github/workflows/publish-mcp.yml 작성 — 태그 `mcp-v*` 푸시 시 `npm publish --provenance --access public` 실행, 시크릿 없이 OIDC(id-token: write)만 사용. 워크플로는 커밋만 하고 트리거하지 말 것. docs/run-tb2/TRUSTED-PUBLISHING.md 에 npm 패키지 설정 페이지에서 사람이 할 연결 절차(저장소·워크플로 파일명 입력) 기록.

## 5. 문서·정리
- docs/run-tb1/DEPLOY.md 상태란에 "완료 YYYY-MM-DD" 와 실제 주소 기입.
- docs/run-tb1/POST-reddit.md, POST-github-readme.md 의 URL·패키지명을 확정값으로 치환(게시는 하지 않음).
- README 상단에 POST-github-readme.md 블록 삽입.
- worktree ~/Projects/testbench-tools-run-tb1 제거, 브랜치 run-tb1 은 원격에 푸시 후 유지.
- 게이트 G5-1: main 깨끗(git status 변경 0), 월요일 autopilot 설정 변경 0.

## 6. 보고
- docs/run-tb2/REPORT.md: 게이트 결과표, 실제 배포 주소 2개(Worker, 사이트), npm 패키지명·버전, 남은 사람 작업(스크린샷 2장 교체 / Trusted Publishing 연결 / Reddit 게시 2건 순서: r/ClaudeAI 먼저 → 3~4일 뒤 r/embedded), 이번 런 비용 추정.
- 토큰 값이 어떤 산출물에도 없음을 grep 으로 확인해 보고서에 한 줄 기록.
