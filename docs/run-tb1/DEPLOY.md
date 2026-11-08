# RUN-TB1 — 배포 (사람이 실행)

이 런에서는 아무것도 배포하지 않았다. 브랜치 `run-tb1`은 원격에 올리지 않았다. main에 푸시하면 Cloudflare가 사이트를 자동 배포하므로, 아래 순서대로 한 번에 하나씩 진행한다.

## 0. 사이트 반영 (/mcp, Noctra 페이지, 다음 단계 CTA, 노트 검증 의뢰)

```bash
cd ~/Projects/testbench-tools && git merge --ff-only run-tb1 && git push origin main
```

- 필요한 것: 없음. 기존 자동 배포를 그대로 쓴다.
- 확인: https://testbench.tools/mcp/ 와 /noctra/ 열기.
- 주의: 원격 MCP를 먼저 띄우지 않으면 /mcp 페이지의 원격 설치 명령(`https://mcp.testbench.tools/mcp`)은 아직 동작하지 않는다. 그 페이지를 공개하기 전에 1번을 먼저 하는 것이 좋다.

## 1. 원격 MCP 서버 (Cloudflare Worker `testbench-mcp`)

```bash
cd ~/Projects/testbench-tools/packages/bench-mcp-remote && wrangler deploy
```

- 필요한 것: 사이트와 같은 Cloudflare 계정에 `wrangler login`(이미 로그인돼 있으면 생략). 환경변수·시크릿·바인딩은 **없다**(무상태 설계라 저장소를 붙이지 않는다).
- 결과: `https://testbench-mcp.<계정 서브도메인>.workers.dev/mcp` 가 바로 동작한다.
- 커스텀 도메인 `mcp.testbench.tools`를 쓰려면 `packages/bench-mcp-remote/wrangler.jsonc`의 주석 처리된 `routes` 줄을 살리고 다시 `wrangler deploy` 한다. testbench.tools 존이 같은 계정에 있으면 DNS 레코드는 wrangler가 만든다.
- **URL을 바꾸는 경우**(workers.dev 주소를 그대로 쓰기로 할 때): `apps/web/content/mcp-i18n.ts`의 `MCP_REMOTE_URL` 한 줄을 바꾸고 0번을 다시 한다.
- 확인 명령:
  ```bash
  curl -s https://mcp.testbench.tools/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"crc.modbus16","arguments":{"data":"01 03 00 00 00 0A"}}}'
  ```
  `"crc": "0xCDC5"`가 나오면 정상이다.
- 비용: Workers 무료 티어는 하루 요청 10만 건까지다. 계산은 순수 함수라 CPU 시간이 짧다.

## 2. 로컬 MCP 서버 (npm 패키지 `@testbench-tools/mcp`)

npm 퍼블리시는 이번 런의 금지 항목이라 하지 않았다. 퍼블리시하기 전까지 /mcp 페이지의 `npx -y @testbench-tools/mcp` 명령은 동작하지 않는다.

```bash
cd ~/Projects/testbench-tools/packages/bench-mcp-local && pnpm build && npm publish --access public
```

- 필요한 것: npm 계정과 `@testbench` 스코프. 스코프가 없으면 npm 웹에서 organization `testbench`를 만든다. **이름 확정은 사람이 결정한다**: 스코프를 못 가지면 패키지 이름(`package.json`의 `name`)과 `apps/web/content/mcp-i18n.ts`의 `MCP_LOCAL_PACKAGE`를 함께 바꾼다.
- 퍼블리시 전에 `package.json`의 `"private": true`를 지워야 한다. 사고로 퍼블리시되지 않도록 일부러 넣어 둔 것이다.
- 퍼블리시 없이 써 보기: `cd packages/bench-mcp-local && pnpm build && npm link`를 하면 `testbench-mcp` 명령이 생긴다. 이번 런은 이 방법으로 검증했다(REPORT.md G3-3).

## 3. 공개 순서 제안

1. 원격 Worker 배포 → 확인 명령 통과
2. 사이트 머지·푸시
3. (선택) npm 퍼블리시
4. 홍보 초안(`POST-reddit.md`, `POST-github-readme.md`) 게시
