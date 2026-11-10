# RUN-TB2 — 막힌 것과 판단한 것

RUN-TB2는 "질문 금지, 막히면 여기 기록하고 다음으로" 조건이다. 우선순위는 CLAUDE.md > RUN-TB2.

## R-1. 원격 MCP Worker 배포 — 토큰 없음 (§2, G2-1·G2-2 FAIL)

> **2026-11-10 해결.** 토큰을 넣은 셸에서 `wrangler deploy` → workers.dev와 mcp.testbench.tools가 함께 붙었다. G2-1·G2-2 PASS.

- **상황.** RUN-TB2는 `CLOUDFLARE_API_TOKEN` 환경변수로만 인증하고 브라우저 로그인은 시도하지 말라고 한다. 실행 셸에 이 변수가 없었다(launchd 환경도 비어 있음). wrangler에 남아 있던 OAuth 토큰은 만료됐다("Your auth token has expired and could not be refreshed").
- `~/.config/testbench/telemetry.env`에 `CF_API_TOKEN`이 있지만 쓰지 않았다. 이 토큰은 분석 조회(RUM GraphQL)용이고, RUN-TB2는 지정된 변수만 쓰라고 한다.
- **한 것.** `wrangler deploy --dry-run` 통과(340.02 KiB, gzip 88.94 KiB, 바인딩 없음). 커스텀 도메인 `routes`는 wrangler.jsonc에서 켜 두었다. 2026-11-08 11:00Z 기준 `mcp.testbench.tools`는 DNS 레코드가 없다.
- **사람이 할 일.** Workers Scripts:Edit, 그리고 testbench.tools 존의 Workers Routes:Edit와 DNS:Edit 권한을 가진 API 토큰을 만든다. 그다음 `export CLOUDFLARE_API_TOKEN=…`를 한 셸에서 아래를 실행한다.
  ```bash
  cd ~/Projects/testbench-tools/packages/bench-mcp-remote && wrangler deploy
  ```
  확인 명령은 docs/run-tb1/DEPLOY.md 1번에 있다(`"crc": "0xCDC5"`).

## R-2. npm 퍼블리시 — 토큰 없음 (§4, G4-1·G4-2 FAIL)

> **2026-11-10 해결.** 위 `env` 형태로 0.1.0 퍼블리시. G4-1·G4-2 PASS.

- **상황.** `NPM_TOKEN`이 실행 셸에 없었다. `npm whoami`는 ENEEDAUTH다. `.npmrc` 생성은 금지 항목이라 다른 경로도 없다.
- **한 것.** `private` 제거, version 0.1.0, `repository`·`homepage` 추가(provenance에 `repository`가 필요), `pnpm build`, `npm pack --dry-run`(43개 파일, 125.9 kB). 팩한 tarball을 `npx -y --package=./testbench-tools-mcp-0.1.0.tgz testbench-mcp`로 띄워 **tools/list 58개**를 확인했다. 레지스트리를 거치지 않은 대체 검증이라 라벨은 unverified다.
- 레지스트리 상태(2026-11-08): `@testbench-tools/mcp`는 404(미존재), org `testbench-tools`는 존재(빈 패키지 목록).
- **사람이 할 일.**
  ```bash
  cd ~/Projects/testbench-tools/packages/bench-mcp-local && pnpm build && \
    env "NPM_CONFIG_//registry.npmjs.org/:_authToken=$NPM_TOKEN" npm publish --access public
  ```
  변수 이름에 `/`가 있어서 zsh에서는 `VAR=값 명령` 형태가 안 된다. 반드시 `env "이름=값"` 형태로 쓴다. 가짜 값으로 `npm whoami`를 돌리면 401이 나오는 것으로, npm이 이 변수를 읽는 것을 확인했다. 이 첫 퍼블리시가 Trusted Publishing 연결의 전제다(TRUSTED-PUBLISHING.md 1번).

## R-3. 사이트 머지를 Worker 없이 진행한 판단 (§3)

> **2026-11-10 해소.** 라이브 /mcp의 설치 명령 2개가 모두 동작한다(REPORT 게이트 표).

- RUN-TB2 §0은 되돌릴 수 없는 작업을 직전 게이트 PASS 때만 하라고 한다. §2는 "G2-2가 FAIL이어도 중단하지 말고 사이트 머지는 §3로 계속(사이트는 URL 문자열만 참조)"이라고 명시한다.
- G1(사이트 내용의 게이트)은 PASS였다. 그래서 §2의 명시 조항에 따라 머지·푸시했다.
- **결과.** R-1·R-2가 풀리기 전까지 라이브 /mcp 페이지의 두 설치 명령(원격 URL, `npx`)은 동작하지 않는다. README 상단 블록도 같다. 홍보 게시는 R-1·R-2 뒤로 미뤄야 한다(POST-reddit.md의 확인 항목).

## R-4. CLAUDE.md는 저장소에 없다 (§1)

`CLAUDE.md`는 `.git/info/exclude`로 추적에서 빠져 있다. 그래서 워크스페이스 구성 설명은 main 체크아웃의 파일에 직접 추가했고 커밋에는 없다. 같은 이유로 G5-1의 "main 변경 0"에 잡히지 않는다.

## R-5. 판단 기록

- **MCP_REMOTE_URL.** RUN-TB2는 "https://mcp.testbench.tools"로 확정했다. 서버의 엔드포인트 경로는 `/mcp`이고 G2-2도 `/mcp`로 부른다. 그래서 상수는 `https://mcp.testbench.tools/mcp` 그대로 두었다. 호스트는 확정값과 같다.
- **G1의 "VIEW".** 제품명 맥락의 대문자 단어 `\bVIEW\b`로 검사했다. 코드 식별자 `NOCTRA_*`는 브랜드 표기가 아니라 세지 않았다. 지시 문서 RUN-TB*.md는 옛 철자를 규칙으로 인용하므로 범위에서 뺐다(evidence/g1-grep.txt).
- **B-1 후보 1의 구현 차이.** CF RUM의 `visits`는 다른 사이트에서 온 페이지로드만 센다. 사이트 안 이동(툴 페이지 → /mcp)은 항상 0이라, `count`(페이지로드)로 센다. 실제 쿼리로 확인했다: `/zh/apps/` 10건(출발 툴 1개).
- **sitemap lastmod.** G3-3은 PASS다(서로 다른 날짜 7종). 다만 127개 URL 중 28개에는 lastmod가 없다. about·contact·privacy 15개는 원래 키가 없었다. 새 /mcp 5개와 /noctra 8개는 lastmod.json이 다음 로컬 생성(전체 이력이 있는 환경) 때 채워진다. 거짓 날짜를 찍지 않는 기존 규칙대로다.
- **Noctra 한국어 문구.** 출시 제품 4종의 한국어 설명은 이전 배너 파일(noktra-links.ts, RUN-TB1에서 삭제)에 이미 게시됐던 문장을 그대로 썼다. 대기 제품 3종의 한 줄 정의는 RUN-TB1 영어 정의의 직역이다.
