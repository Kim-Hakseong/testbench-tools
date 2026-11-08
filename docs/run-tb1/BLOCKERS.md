# RUN-TB1 — 막힌 것과 판단한 것

RUN-TB1은 "질문 금지, 막히면 여기 기록하고 다음으로" 조건이다. 아래 항목은 이번 런에서 하지 않았거나, CLAUDE.md와 충돌해 다르게 처리한 것이다. 우선순위는 CLAUDE.md > RUN-TB1로 두었다.

## B-1. CTA 클릭·대기 명단 클릭 이벤트 — 미구현 (§8)

> **RUN-TB2 (2026-11-08): 후보 1 적용으로 닫음.** `scripts/pulse.mjs`의 `collectCtaArrivals()`가 툴 페이지 리퍼러로 도착한 페이지로드를 센다. 사이트 내부 이동은 CF의 visits가 0이라 `count`(페이지로드)를 쓴다. 클라이언트 코드 변경 없음.

**상황.** 분석 도구는 있다. Cloudflare Web Analytics(쿠키 없는 RUM)와 1st-party 사용 카운터(`/hit` 비콘)다. 하지만 둘 다 클릭 이벤트에 이름을 붙이는 기능이 없다.
- CF Web Analytics는 커스텀 이벤트를 받지 않는다.
- 비콘은 CLAUDE.md §4 결정(2026-08-20)으로 "본문은 툴 이름뿐"이다. 여기에 이벤트 이름을 실으면 그 결정을 바꾸는 것이고, 하쿠 님 승인이 필요하다.

**후보 2개와 설정 방법.**

1. **사이트 코드 변경 없이 리퍼러 경로로 세기 (권장, 승인 불필요).**
   - CF RUM GraphQL의 `rumPageloadEventsAdaptiveGroups`에 `refererPath` 차원이 있다. 2026-11-07에 실제 쿼리가 오류 없이 행을 돌려주는 것을 확인했다(confirmed).
   - 도착 페이지(`/noctra/*`, `/apps/*`, `/mcp/`)를 `refererPath`가 `/tools/…`인 것만 골라 페이지로드 수(`count`)를 세면 "툴 페이지 CTA로 넘어온 수"의 근사치가 된다.
   - 한계: 같은 툴 페이지에 있는 다른 링크(관련 툴, 내비)와 구분되지 않는다. 그래서 도착 페이지별로만 의미가 있다. 표본 추출된 값이라 비율로 읽어야 한다(estimated).
   - 설정: `scripts/pulse.mjs`에 `rumGroups`를 `dimensions { requestPath refererPath }`, `filter: { refererHost: "testbench.tools" }`로 부르는 수집 함수 하나를 추가한다. T1 범위의 스크립트 변경이다.
2. **비콘에 이벤트 이름 허용 (CLAUDE.md §4 개정 필요).**
   - `sendBeacon("/hit", "evt:next_step_click:bus")`처럼 정해진 이벤트 이름 목록만 받도록 `worker/index.js`의 `SLUG` 정규식을 넓힌다. Analytics Engine 데이터셋은 같은 것을 쓴다.
   - 입력값·식별자·쿠키가 없다는 조건은 그대로 지킬 수 있다.
   - 설정: ① CLAUDE.md §4에 결정 추가 ② Worker 정규식과 허용 목록 ③ `NextStep`·대기 명단 링크에 `onClick` 비콘 ④ `pulse.mjs` 쿼리에 `blob1 LIKE 'evt:%'` 집계.

이벤트 이름 후보는 METRICS.md 표에 적어 두었다.

## B-2. Noctra 대기 페이지의 스크린샷 자리 — 빈 슬롯으로 구현 (§6)

> **RUN-TB2: 비움 유지(열림, 사람 작업).**

RUN-TB1은 "스크린샷 자리(플레이스홀더, 사람이 교체)"를 요구한다. 하지만 CLAUDE.md §5.4는 placeholder 콘텐츠를 금지한다. 그래서 광고 슬롯과 같은 규칙으로 구현했다. `apps/web/content/noctra.ts`의 `screenshot` 값이 비어 있으면 아무것도 그리지 않는다.
- 교체 방법: 이미지를 `apps/web/public/noctra/<slug>.png`에 넣고, 해당 항목의 `screenshot`에 `"/noctra/<slug>.png"`를 적는다.

## B-3. Noctra 제품 이름 — 임시 (§6)

> **RUN-TB2 (2026-11-08): 닫음.** Haku 확정 — Noctra Bus / Noctra View / Noctra OneShot. 코드의 표기가 이미 일치해 변경 없음.

RUN-TB1은 페이지 경로(`/noctra/bus`, `/view`, `/oneshot`)와 한 줄 정의만 준다. 페이지 제목에는 "Noctra Bus", "Noctra View", "Noctra OneShot"을 임시로 썼다. 정식 이름과 브랜드 철자(Noctra) 확정은 사람이 결정한다. 수정할 곳은 `apps/web/content/noctra.ts` 한 곳과 `apps/web/components/tool/NextStep.tsx`의 `label` 세 개다.

## B-4. Noctra 페이지와 노트 문구는 영어만 (§6, §7)

> **RUN-TB2 (2026-11-08): 닫음.** Noctra 페이지 4장을 한국어로 추가(`/ko/noctra/…`). hreflang은 en·ko 쌍만. 노트 하단 줄은 노트가 영어 전용이라 그대로.

RUN-TB1은 5개 언어를 `/mcp`와 내비게이션에만 요구한다. Noctra 페이지 4장과 노트 하단 검증 의뢰 줄은 영어로만 만들었다. 노트 자체가 영어 전용(content/notes.ts의 원칙)이고, Noctra 제품 문구는 정식 이름이 정해지면 한 번에 번역하는 편이 낫다고 판단했다.

## B-5. 모바일에서는 내비게이션 항목이 보이지 않음 (§4, 기존 구조)

헤더 내비게이션은 원래부터 `md` 폭(768px) 미만에서 숨겨진다. 그래서 새 MCP 항목과 Noctra 칩도 휴대폰에서는 보이지 않는다. 이번 런은 기존 구조를 바꾸지 않았다. 휴대폰 사용자가 /mcp에 닿는 경로는 툴 페이지 하단의 "다음 단계" CTA(체크섬·변환·임베디드·센서 툴)다.

## B-6. npm 퍼블리시·원격 배포 — 금지 항목이라 하지 않음 (§3)

- 로컬 서버는 `pnpm link --global`로 검증했다. RUN-TB1은 `npm link`를 지시하지만, CLAUDE.md §4가 pnpm만 허용하므로 동등한 pnpm 명령을 썼다. 검증 뒤 전역 링크는 제거했다.
- 원격 서버는 `wrangler dev`(로컬)로 검증했다.
- 배포 명령은 DEPLOY.md에 있다.

## B-7. bench-core가 페이지 표시와 다른 점 (§2, 동작 차이 아님)

계산 결과는 페이지와 같다(G2-2). 다만 출력 형식이 다른 곳이 있다.
- 페이지가 화면 표시용으로 반올림하는 값(`toFixed`, `toPrecision`)을 툴은 전체 정밀도로 돌려준다.
- 페이지에서 경고만 띄우는 입력(빈 사양, 범위 밖 값)은 툴에서 오류로 돌려준다.
- 파일 툴은 JSON 입력이라 바이너리를 base64로 받고, 응답 크기에 상한(행 수, 바이트 수)과 `truncated` 표시가 있다.

툴별 세부 차이는 각 `packages/bench-core/src/tools/*.ts` 정의와 REPORT.md에 있다.
