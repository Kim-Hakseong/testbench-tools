# RUN-TB1 — 결과 보고

- 실행: 2026-11-07
- 브랜치: `run-tb1` (worktree `~/Projects/testbench-tools-run-tb1`, main 07a138c 기준, **원격 미푸시·미배포**)
- 커밋 10개: §1 → §9, 마지막에 DEPLOY와 증거 파일

## 게이트 결과

| 게이트 | 기준 | 결과 | 판정 | 근거 |
|---|---|---|---|---|
| G2-1 | 툴이 bench-core로 이전 (50/56 이상이면 PASS) | **58/58** (허브 툴 57 + 보조 페이지 ascii-to-hex 1) | PASS | `packages/bench-core/src/tools/*.ts`, 레지스트리 58개 |
| G2-2 | 툴당 5케이스 이상, 기존 UI 로직과 전부 일치 | **58개 툴 · 347/347 케이스 일치**, 5건 미만 툴 0개 | PASS | `*.parity.test.ts`. 기대값은 테스트 안에서 페이지 컴포넌트의 글루를 그대로 옮겨 엔진을 호출해 만든다 |
| G2-3 | 빌드 성공, 툴 페이지 전부 렌더, 링크 오류 0 | 빌드 OK · HTML 125개 · 내부 링크 2,799개 · **깨진 링크 0** · OG 검사 123/123 | PASS | 정적 출력 전수 검사 |
| G3-1 | tools/list에 전부 노출 | stdio **58/58** · HTTP(`wrangler dev`) **58/58** | PASS | `evidence/g3-1-g3-2.json` |
| G3-2 | 무작위 20개 tools/call 결과가 웹 툴과 동일 | stdio **20/20** · HTTP **20/20** (seed 20261107). 추가로 실제 웹 화면 3건(CRC, 1553, XGT)을 헤드리스 Chrome으로 읽어 대조 **3/3** | PASS | `evidence/g3-1-g3-2.json`, `evidence/g3-2-web-ui.json` |
| G3-3 | Claude Code 로컬 설정으로 B를 붙여 실제 호출 3건 성공 | **3/3 성공** (`crc_modbus16` → 0xCDC5, `mil1553_decode_command` → RT1·송신·SA1·WC2, `plc_xgt_address` → 워드 10·비트 5) | PASS | `evidence/g3-3-claude-code.jsonl`, 설정 `example.mcp.json` |
| G5-1 | 전체 툴 페이지에 CTA 렌더, 목적지 링크 유효 | **63/63** (영어 58 + 한국어 5), 잘못된 목적지 0 | PASS | 정적 출력 전수 검사 |
| G5-2 | 390px에서 레이아웃 깨짐 0, 스크린샷 3장 | 페이지 **85/85** scrollWidth = 390, **넘침 0** · 스크린샷 3장 | PASS | `evidence/g5-2-widths-390.txt`, `evidence/g5-2-*.png` |

테스트 합계: engine 702 · bench-core 81 · bench-mcp-remote 7 · bench-mcp-local 2. 모두 통과. 번역 검사 606개 문자열 통과.

라벨: 위 수치는 전부 **confirmed**(이번 런에서 실행해 얻은 값)다. 예외는 METRICS.md의 리퍼러 기반 CTA 추정으로, **estimated**다.

## 변경 파일

`main..run-tb1` 기준 **128개 파일** (추가 60 · 수정 66 · 삭제 2), +7,560 / −195줄.

| 영역 | 파일 수 | 내용 |
|---|---|---|
| apps/web | 79 | 위젯 59개의 import를 engine → bench-core로 전환. /mcp 5개 언어, Noctra 4장, NextStep CTA, 노트 검증 의뢰, 내비 |
| packages/bench-core | 19 | 레지스트리·스키마 검증기·MCP 핸들러·툴 정의 5묶음·회귀 테스트 |
| docs/run-tb1 | 15 | SURVEY · DEPLOY · METRICS · BLOCKERS · POST 2개 · 게이트 스크립트 · 증거 7개 · 이 문서 |
| packages/bench-mcp-local | 7 | stdio 서버, tsc 전용 빌드, bin, 통합 테스트 |
| packages/bench-mcp-remote | 6 | Workers Streamable HTTP 서버, wrangler 설정, 테스트 |

새 의존성은 **0개**다. MCP는 SDK 없이 명세대로 구현했다. 로컬 빌드는 tsc만 쓰고, Worker 번들링은 기존 wrangler가 한다.

## bench-core로 옮기지 못한 툴

**없음.** 다만 페이지 기능 중 계산이 아닌 것은 MCP 툴에 넣지 않았다.
- frame-workbench: 공유 링크, .ftproj 가져오기·내보내기, 프레임 선택
- crc-identifier: Web Worker 전수 탐색. 카탈로그 매칭만 툴로 제공하고, 없으면 페이지의 전수 탐색을 안내한다

파일 툴 5종은 바이너리를 base64로 받고 응답 크기에 상한을 둔다. 페이지와 다른 출력 형식(반올림하지 않은 전체 정밀도 등)은 BLOCKERS B-7에 있다.

## 이번 런 중 main에서 고친 것 (배포됨)

RUN-TB1 작업을 하다 발견한 **기존 결함**이다. 이건 런의 산출물이 아니라 운영 수정이라, main에 바로 커밋·배포했다.

| 커밋 | 내용 |
|---|---|
| 408ecf0 | Cloudflare 빌드(얕은 클론)가 sitemap lastmod 99개를 전부 배포일로 찍던 문제. IndexNow가 매 배포마다 전 URL을 다시 제출하고 있었다 |
| ea72c7f | 2의 보수 32비트 음수 오류: 0x80000000이 −6442450944로 표시됐다. 에이전트가 이식하다 발견했고 직접 재현해 확인했다 |
| 07a138c | 390px 가로 넘침 7개 페이지(nmea 3종, mc-protocol, bit-field, apps)와, bit-field 행 결과가 한 줄씩 밀리던 문제 |

## DEPLOY.md 요약

1. **원격 MCP**: `cd packages/bench-mcp-remote && wrangler deploy`. 바인딩·시크릿은 없다. 커스텀 도메인은 wrangler.jsonc의 주석 한 줄로 켠다.
2. **사이트**: `git merge --ff-only run-tb1 && git push origin main`. 원격 MCP가 응답하는 것을 확인한 뒤에 하는 것이 좋다.
3. **로컬 MCP**(선택): npm 스코프 `@testbench` 확보 → `private` 제거 → `pnpm build && npm publish --access public`.

## 사람이 결정·실행할 것

1. **배포 명령 실행**: 위 1→2(→3) 순서
2. **Cloudflare**: `testbench-mcp` Worker 생성(첫 `wrangler deploy`), `mcp.testbench.tools` 커스텀 도메인 연결 여부. workers.dev 주소를 그대로 쓰면 `MCP_REMOTE_URL` 한 줄을 바꾼다
3. **npm 스코프·패키지 이름**: `@testbench/mcp`를 쓸 수 있는지. 못 쓰면 `package.json`의 `name`과 `MCP_LOCAL_PACKAGE`를 함께 바꾼다
4. **스크린샷 교체**: Noctra 페이지 3장. `content/noctra.ts`의 `screenshot` 경로를 채우기 전에는 이미지 영역이 아예 렌더되지 않는다(B-2)
5. **Noctra 개명 확정**: 철자 "Noctra"와 제품명 Bus / View / OneShot(B-3). 확정되면 Noctra 페이지 번역 여부도 정한다(B-4)
6. **계측**: B-1 후보 1(코드 변경 없음, pulse.mjs 수집 추가)과 후보 2(CLAUDE.md §4 개정) 중 선택
7. **홍보 게시**: POST-reddit.md, POST-github-readme.md 검토 후 게시
8. **CLAUDE.md 갱신 여부**: §4 의존성 목록에 패키지 3개(bench-core, bench-mcp-local, bench-mcp-remote)가 추가됐다. 외부 의존성은 0개지만, 워크스페이스 구성 설명에 반영할지 정한다
