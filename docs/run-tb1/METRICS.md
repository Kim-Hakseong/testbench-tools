# RUN-TB1 — 계측과 분기 목표 가설

## 분기 목표 (가설, 2026 Q4 → 2027 Q1)

아래 숫자는 RUN-TB1이 제시한 **가설**이다. 기저 측정 없이 잡은 값이므로, AUTOPILOT.md의 "목표치는 기저에서 유도한다" 규칙에 따라 첫 4주는 기저 측정으로 쓰고, 그 뒤에 2~3배 이내로 다시 잡는다.

| 지표 | 분기 목표(가설) | 어디서 읽나 | 지금 읽을 수 있나 |
|---|---|---|---|
| GitHub 스타 | 100 | GitHub 저장소 Insights → Stargazers. CLI: `gh api repos/Kim-Hakseong/<repo> --jq .stargazers_count` (testbench-frameterm, -modbus-workbench, -tdms-converter, -linktap, 그리고 MCP를 공개 저장소로 낼 경우 그 저장소) | 예 |
| 앱 다운로드 | 50/월 | GitHub Releases 자산 download_count: `gh api repos/Kim-Hakseong/<repo>/releases --jq '[.[].assets[].download_count]|add'`. 월별 값은 직전 달 값과의 차이 | 예. 누적값만 있으므로 매월 1회 기록해 차분을 낸다 |
| MCP 설치 | 30 | ① 원격: Cloudflare 대시보드 → Workers → `testbench-mcp` → Metrics의 요청 수. `initialize` 호출 수가 설치·세션 수에 가깝지만, 무상태 설계라 메서드별 집계를 남기지 않는다(아래 BLOCKERS 참조) ② 로컬: npm 퍼블리시 후 `https://api.npmjs.org/downloads/point/last-month/@testbench/mcp` | 부분적. 원격은 총 요청 수만 읽힌다. 로컬은 퍼블리시 후에 읽힌다 |
| 문의 | 2/월 | contact@testbench.tools 받은편지함. 제목 규칙으로 분류: `… — waitlist`(Noctra 대기 명단), `Verification request — …`(노트 검증 의뢰) | 예. mailto 제목이 자동으로 들어가므로 메일 검색으로 센다 |

## 이번 런이 추가한 퍼널 지점

| 지점 | 이름(이벤트 후보) | 지금 측정되는 것 |
|---|---|---|
| /mcp 페이지 조회 | `mcp_page_view` | 예 — Cloudflare Web Analytics 페이지뷰(`requestPath` = `/mcp/`, `/ko/mcp/` …). `scripts/pulse.mjs`의 RUM 쿼리로 읽힌다 |
| 툴 페이지 "다음 단계" CTA 클릭 | `next_step_click:<step>` (step = bus, view, oneshot, modbus, frameterm, linktap, mcp) | 아니오 — 커스텀 이벤트 수단이 없다. 도착 페이지(/noctra/*, /apps/*, /mcp/)의 페이지뷰와 리퍼러로 간접 추정만 된다 |
| Noctra 대기 명단 클릭 | `waitlist_click:<bus|view|oneshot>` | 아니오. 실제 신청은 받은 메일 수로 센다(위 '문의') |
| 노트 검증 의뢰 클릭 | `verify_request_click` | 아니오. 받은 메일 수로 센다 |

클릭 이벤트를 붙이지 않은 이유는 BLOCKERS.md B-1에 있다. 요약하면, 기존 비콘을 쓰려면 CLAUDE.md §4 결정("본문은 툴 이름뿐")을 바꿔야 하므로 사람이 승인해야 한다.

## 읽는 주기

- 주간 pulse(월요일): /mcp·/noctra 페이지뷰는 기존 RUM 섹션에 이미 잡힌다.
- 월간 리뷰(4일): 위 표의 네 지표를 손으로 한 번 기록한다. 자동 수집 추가는 승인 후 별도 작업.
