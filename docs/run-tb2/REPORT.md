# RUN-TB2 — 결과 보고

- 실행: 2026-11-08 (UTC 10:52–11:10 전후)
- 사이트 배포: main `b53d9eb` 푸시 → 라이브 확인 11:00:16Z. 이후 문서 커밋은 main에 이어 푸시했다
- 막힘: **배포 토큰 2개가 실행 환경에 없었다** (`CLOUDFLARE_API_TOKEN`, `NPM_TOKEN`). 원격 Worker 배포와 npm 퍼블리시는 하지 못했다. 나머지는 끝까지 진행했다

## 게이트 결과

| 게이트 | 기준 | 결과 | 판정 | 라벨 | 근거 |
|---|---|---|---|---|---|
| G1 | 빌드 OK, 테스트 전부 통과, NOKTRA·VIEW·`@testbench/mcp` 잔존 0 | 빌드 OK · 테스트 792/792(engine 702 · bench-core 81 · remote 7 · local 2) · 잔존 **0/0/0** · 내부 링크 3,114개 중 깨짐 0 | **PASS** | confirmed | `evidence/g1-grep.txt` |
| G2-1 | workers.dev로 tools/list 58 | 배포 불가(토큰 없음). dry-run 번들 340 KiB·바인딩 0 | **FAIL** | confirmed | BLOCKERS R-1 |
| G2-2 | mcp.testbench.tools tools/list 58 + 호출 3/3 | DNS 레코드 없음(배포 전) | **FAIL** | confirmed | BLOCKERS R-1 |
| G3-1 | 라이브 /mcp 200, 5개 언어 200 | **6/6** (`/mcp`, `/mcp/`, ko·ja·de·zh) | **PASS** | confirmed | `evidence/g3-live.txt` |
| G3-2 | 무작위 툴 10개 CTA 10/10, Noctra 4장 200 | CTA **10/10** · Noctra **8/8** (영어 4 + 한국어 4) | **PASS** | confirmed | `evidence/g3-live.txt` |
| G3-3 | sitemap lastmod 날짜 2종 이상 | 서로 다른 날짜 **7종** (99개 URL에 lastmod) | **PASS** | confirmed | `evidence/g3-live.txt` |
| G4-1 | `npx -y @testbench-tools/mcp` tools/list 58 | 퍼블리시 불가(토큰 없음). 대체 검증: 팩한 tarball을 npx로 띄워 **58** | **FAIL** (대체 검증만 통과) | 대체 검증은 unverified | BLOCKERS R-2 |
| G4-2 | Claude Code + npx 실제 호출 1건 | 패키지가 레지스트리에 없어 불가. `example.mcp.json`은 npx 방식으로 바꿈 | **FAIL** | confirmed | BLOCKERS R-2 |
| G5-1 | main 깨끗, autopilot 설정 변경 0 | `git status` 변경 0 · launchd plist 3개와 autopilot 스크립트 2개의 수정 시각이 전부 11-05 이전 · pulse 전체 시험 실행 정상(health 5/5, setup-needed 0) | **PASS** | confirmed | 아래 "정리" |

PASS 6 · FAIL 4. FAIL 4개의 원인은 하나다: 토큰 미설정.

## 실제 배포 주소

| 대상 | 주소 | 상태 |
|---|---|---|
| 사이트 | https://testbench.tools/mcp/ · https://testbench.tools/noctra/ · https://testbench.tools/ko/noctra/ | **라이브** |
| 원격 MCP Worker | https://mcp.testbench.tools/mcp (예정). workers.dev 주소는 첫 배포 때 정해진다 | **미배포** |

## npm 패키지

- 이름 `@testbench-tools/mcp` · 버전 **0.1.0** · **미퍼블리시**. 레지스트리에서 404이고, org `testbench-tools`는 존재한다.
- 준비는 끝났다: `private` 제거, `repository`·`homepage` 추가, 빌드, `npm pack`(43개 파일, 125.9 kB).

## 이번 런에서 바뀐 것

- **§1 결정값 반영** (`b53d9eb`)
  - 패키지명을 전부 `@testbench-tools/mcp`로 통일했다.
  - Noctra 페이지 4장의 한국어판(`/ko/noctra/…`)을 추가했다. hreflang은 en·ko만 넣었다.
  - 한국어 툴 페이지 CTA, 내비 칩, 언어 전환이 한국어 Noctra 페이지로 연결된다.
  - pulse.mjs에 "다음 단계 CTA 도착" 집계를 넣었다(B-1 후보 1). 클라이언트 코드는 바꾸지 않았다.
  - wrangler.jsonc에 커스텀 도메인 route를 켰다.
  - CLAUDE.md에 워크스페이스 구성을 추가했다. CLAUDE.md는 추적 제외 파일이라 커밋에는 없다(R-4).
- **§4** `.github/workflows/publish-mcp.yml`: `mcp-v*` 태그에서만 돌고 OIDC만 쓰며 시크릿은 쓰지 않는다. 트리거한 적 없다. `docs/run-tb2/TRUSTED-PUBLISHING.md`도 함께 썼다.
- **§5**
  - DEPLOY.md에 상태표를 넣었다. 사이트는 "완료 2026-11-08", 나머지는 미완과 그 사유를 적었다.
  - POST 문서 2개를 확정 URL·패키지명으로 맞췄다. 게시는 하지 않았다.
  - README 상단에 MCP 블록을 삽입했다.
  - RUN-TB1 BLOCKERS의 B-1·B-3·B-4는 닫았다.

## 남은 사람 작업 (순서대로)

1. **Cloudflare 토큰** → `wrangler deploy` (R-1). 끝나면 G2-1·G2-2를 다시 확인한다. `node docs/run-tb1/mcp-gates.mjs https://mcp.testbench.tools/mcp`
2. **npm 첫 퍼블리시** (R-2). `env "NPM_CONFIG_//registry.npmjs.org/:_authToken=$NPM_TOKEN" npm publish --access public`
3. **Trusted Publishing 연결**: npm 패키지 설정 페이지에서 저장소 `Kim-Hakseong/testbench-tools`, 워크플로 `publish-mcp.yml`을 입력한다(TRUSTED-PUBLISHING.md).
4. **스크린샷 교체**: Noctra 대기 페이지의 이미지 자리. 지금은 비어 있어서 렌더되지 않는다(B-2). 넣을 곳은 `apps/web/content/noctra.ts`의 `screenshot`이다.
5. **Reddit 게시 2건**: r/ClaudeAI를 먼저 올리고, 3~4일 뒤 r/embedded. **1·2가 끝난 뒤에** 올린다. 그 전에는 /mcp와 README의 설치 명령이 동작하지 않는다(R-3).

## 이번 런 비용 추정

- 외부 과금: **0원**(confirmed). Workers 배포·npm 퍼블리시를 하지 않았고 `claude -p` 호출도 0회다. 사이트 자동 빌드 2회는 기존 무료 범위다. RUM·GSC·Bing 조회는 무료 API다.
- 모델 사용량: 이 세션 약 16만 토큰(estimated, 세션 잔여 토큰 차이로 계산).

## 토큰 확인

저장소 전체(추적·미추적 파일), 이번 런 커밋 diff, 빌드 산출물(apps/web/out, bench-mcp-local/dist)을 검사했다. 알려진 비밀값(telemetry.env의 3개)과 토큰 형태 문자열(`npm_…`, `_authToken=…`, `CLOUDFLARE_API_TOKEN=…`)이 **모두 0건**이다. `.npmrc` 파일도 어디에도 없다(confirmed).
