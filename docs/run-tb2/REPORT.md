# RUN-TB2 — 결과 보고

- 실행: 2026-11-08 (UTC 10:52–11:10 전후)
- 사이트 배포: main `b53d9eb` 푸시 → 라이브 확인 11:00:16Z. 이후 문서 커밋은 main에 이어 푸시했다
- 1차(11-08): 배포 토큰 2개가 실행 환경에 없어서 원격 Worker 배포와 npm 퍼블리시를 하지 못했다
- **2차(11-10, UTC 12:30–12:45 전후)**: 토큰을 넣은 셸에서 §2·§4만 다시 실행했다. Worker 배포, npm 퍼블리시, G2·G4 재검증, 라이브 /mcp 설치 명령 2개의 실동작 확인까지 끝냈다

## 게이트 결과

| 게이트 | 기준 | 결과 | 판정 | 라벨 | 근거 |
|---|---|---|---|---|---|
| G1 | 빌드 OK, 테스트 전부 통과, NOKTRA·VIEW·`@testbench/mcp` 잔존 0 | 빌드 OK · 테스트 792/792(engine 702 · bench-core 81 · remote 7 · local 2) · 잔존 **0/0/0** · 내부 링크 3,114개 중 깨짐 0 | **PASS** | confirmed | `evidence/g1-grep.txt` |
| G2-1 | workers.dev로 tools/list 58 | `testbench-mcp.makseong.workers.dev` tools/list **58** | **PASS** (11-10) | confirmed | `evidence/g2-remote.txt` |
| G2-2 | mcp.testbench.tools tools/list 58 + 호출 3/3 | 첫 폴링에 200(대기 0분) · tools/list **58** · `crc.modbus16`·`mil1553.decode_command`·`plc.xgt_address` 결과가 RUN-TB1 evidence와 **3/3** 일치. RUN-TB1 게이트 스크립트를 라이브 URL로 돌린 결과도 HTTP·stdio 모두 58/58, 무작위 20/20 | **PASS** (11-10) | confirmed | `evidence/g2-remote.txt`, `evidence/g2-live-gates.json` |
| G3-1 | 라이브 /mcp 200, 5개 언어 200 | **6/6** (`/mcp`, `/mcp/`, ko·ja·de·zh) | **PASS** | confirmed | `evidence/g3-live.txt` |
| G3-2 | 무작위 툴 10개 CTA 10/10, Noctra 4장 200 | CTA **10/10** · Noctra **8/8** (영어 4 + 한국어 4) | **PASS** | confirmed | `evidence/g3-live.txt` |
| G3-3 | sitemap lastmod 날짜 2종 이상 | 서로 다른 날짜 **7종** (99개 URL에 lastmod) | **PASS** | confirmed | `evidence/g3-live.txt` |
| G4-1 | `npx -y @testbench-tools/mcp` tools/list 58 | 레지스트리에서 받은 0.1.0(빈 npm 캐시, 빈 폴더) tools/list **58** | **PASS** (11-10) | confirmed | `evidence/g4-npm-live.txt` |
| G4-2 | Claude Code + npx 실제 호출 1건 | `example.mcp.json`(npx 방식)으로 Claude Code 연결, 툴 58개 표시, `crc_modbus16` → **0xCDC5** 성공 | **PASS** (11-10) | confirmed | `evidence/g4-2-claude-code.jsonl` |
| 라이브 /mcp 설치 명령 | 페이지에 적힌 명령 2개가 실제로 동작 | 라이브 HTML에서 명령을 그대로 뽑아 빈 폴더에서 실행: HTTP(`--transport http … mcp.testbench.tools/mcp`)와 stdio(`-- npx -y @testbench-tools/mcp`) 둘 다 `claude mcp list` **✔ Connected**. 시험 등록은 지웠다 | **PASS** (11-10) | confirmed | `evidence/g4-npm-live.txt` |
| G5-1 | main 깨끗, autopilot 설정 변경 0 | `git status` 변경 0 · launchd plist 3개와 autopilot 스크립트 2개의 수정 시각이 전부 11-05 이전 · pulse 전체 시험 실행 정상(health 5/5, setup-needed 0) | **PASS** | confirmed | 아래 "정리" |

**PASS 10 · FAIL 0** (RUN-TB2 게이트 9개 + 라이브 설치 명령 확인 1개, 2차 반영). 1차의 FAIL 4개는 원인이 토큰 미설정 하나였고, 2차에서 모두 PASS로 바뀌었다.

## 실제 배포 주소

| 대상 | 주소 | 상태 |
|---|---|---|
| 사이트 | https://testbench.tools/mcp/ · https://testbench.tools/noctra/ · https://testbench.tools/ko/noctra/ | **라이브** |
| 원격 MCP Worker | https://mcp.testbench.tools/mcp · https://testbench-mcp.makseong.workers.dev/mcp (버전 `6a8684e3`) | **라이브** (11-10) |

## npm 패키지

- 이름 `@testbench-tools/mcp` · 버전 **0.1.0** · **퍼블리시됨**(11-10 12:35Z, 레지스트리 반영 12:37Z). 43개 파일, 125.9 kB. https://www.npmjs.com/package/@testbench-tools/mcp
- 토큰 퍼블리시라 provenance는 없다. 다음 버전부터 Trusted Publishing 워크플로로 붙는다.
- **주의(CLAUDE.md §3 매각 대비).** 레지스트리의 `maintainers`에 개인 npm 계정 이름과 그 계정 메일이 공개로 표시된다. npm이 계정 정보를 자동으로 싣는 것이라 패키지 쪽에서는 지울 수 없다. 도메인 메일로 바꾸려면 npm 계정 설정에서 메일을 바꾸거나, 사이트 전용 npm 계정을 org `testbench-tools`에 추가해 그 계정으로 퍼블리시해야 한다.

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

1. ~~Cloudflare 토큰 → `wrangler deploy`~~ — 완료 2026-11-10
2. ~~npm 첫 퍼블리시~~ — 완료 2026-11-10
3. **Trusted Publishing 연결** (이제 패키지가 있으니 가능): npm 패키지 설정 페이지에서 저장소 `Kim-Hakseong/testbench-tools`, 워크플로 `publish-mcp.yml`을 입력한다(TRUSTED-PUBLISHING.md).
4. **스크린샷 교체**: Noctra 대기 페이지의 이미지 자리. 지금은 비어 있어서 렌더되지 않는다(B-2). 넣을 곳은 `apps/web/content/noctra.ts`의 `screenshot`이다.
5. **Reddit 게시 2건**: r/ClaudeAI를 먼저 올리고, 3~4일 뒤 r/embedded. 설치 명령 두 개가 실제로 동작하는 것을 확인했으니, 이제 올려도 된다.
6. (선택) npm 메인테이너 표기 정리 — 위 "npm 패키지"의 주의 항목.

## 이번 런 비용 추정

- 1차 외부 과금: **0원**(confirmed). 사이트 자동 빌드 2회는 기존 무료 범위다. RUM·GSC·Bing 조회는 무료 API다.
- 2차 외부 과금: G4-2의 `claude -p` 1회 **$0.1245**(confirmed, 실행 결과의 `total_cost_usd`). Workers 무료 티어 안에서 배포 1회와 검증 요청 수십 건을 썼다. npm 퍼블리시는 무료다.
- 모델 사용량: 1차 약 16만 토큰, 2차 약 3만 토큰(estimated, 세션 잔여 토큰 차이로 계산).

## 토큰 확인

**2차(11-10).** 셸의 `CLOUDFLARE_API_TOKEN`·`NPM_TOKEN` 실제 값으로 다음을 검사했다: 저장소 전체(추적·미추적), 07a138c 이후 모든 커밋 diff, 작업 트리 diff, bench-mcp-local/dist, bench-mcp-remote/.wrangler, `~/.claude.json`, wrangler 로그, npm 로그. 일치는 **0건**이다. `.npmrc` 파일은 어디에도 없다. npm 토큰은 `env` 명령의 환경변수로만 넘겼다(confirmed).

**1차(11-08).** 
저장소 전체(추적·미추적 파일), 이번 런 커밋 diff, 빌드 산출물(apps/web/out, bench-mcp-local/dist)을 검사했다. 알려진 비밀값(telemetry.env의 3개)과 토큰 형태 문자열(`npm_…`, `_authToken=…`, `CLOUDFLARE_API_TOKEN=…`)이 **모두 0건**이다. `.npmrc` 파일도 어디에도 없다(confirmed).
