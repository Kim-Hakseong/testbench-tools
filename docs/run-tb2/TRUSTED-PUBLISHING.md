# npm Trusted Publishing 연결 (사람이 할 일)

목적: 2027-01 토큰 퍼블리시 폐지에 대비해, `@testbench-tools/mcp`를 저장된 토큰 없이 GitHub Actions의 OIDC로만 퍼블리시한다. 워크플로 `.github/workflows/publish-mcp.yml`은 커밋만 했고 한 번도 실행하지 않았다.

## 순서

1. **첫 퍼블리시는 사람이 한 번 한다.** npm의 Trusted Publisher 설정은 패키지 설정 페이지에 있다. 그래서 패키지가 레지스트리에 한 번은 존재해야 한다. 2026-11-08 기준 `@testbench-tools/mcp`는 404(미존재)다. 아래 중 하나를 고른다.
   - 토큰으로 한 번: `NPM_TOKEN`을 내보낸 셸에서 BLOCKERS.md R-2의 명령(또는 RUN-TB2 §4)을 실행한다.
   - 직접 한 번: `npm login` 뒤 `cd packages/bench-mcp-local && pnpm build && npm publish --access public`.
2. npmjs.com → `@testbench-tools/mcp` → **Settings** → **Trusted Publisher** → **GitHub Actions**를 고르고 다음을 입력한다.
   | 칸 | 값 |
   |---|---|
   | Organization or user | `Kim-Hakseong` |
   | Repository | `testbench-tools` |
   | Workflow filename | `publish-mcp.yml` (경로 없이 파일 이름만) |
   | Environment name | 비움 (워크플로가 environment를 쓰지 않는다) |
3. 같은 Settings 페이지의 **Publishing access**를 "Require two-factor authentication and disallow tokens"로 바꾼다. 이렇게 해야 토큰 경로가 닫히고 OIDC만 남는다. 권장 사항이다.
4. 이후 릴리스 방법:
   ```bash
   # packages/bench-mcp-local/package.json 의 version 을 올리고 커밋한 뒤
   git tag mcp-v0.1.1 && git push origin mcp-v0.1.1
   ```
   태그와 `version`이 다르면 워크플로가 첫 단계에서 실패한다. 엉뚱한 버전이 나가는 것을 막기 위해서다.

## 워크플로가 하는 일

- 트리거: `mcp-v*` 태그를 푸시할 때만 돈다. main 푸시(사이트 배포)와는 무관하다.
- 권한: `contents: read`, `id-token: write`만 쓴다. 저장소 시크릿은 쓰지 않는다.
- 단계: 태그와 버전 일치 확인 → `pnpm install --frozen-lockfile` → engine·bench-core·stdio 서버 테스트 → 빌드 → npm 11 설치(Trusted Publishing에 11.5.1 이상 필요) → `npm publish --provenance --access public`.
- provenance는 공개 저장소에서만 붙는다. `Kim-Hakseong/testbench-tools`는 2026-11-08 기준 PUBLIC이다.

## 주의

- `package.json`의 `repository.url`이 이 저장소를 가리켜야 provenance 검증이 통과한다. RUN-TB2에서 이미 넣었다.
- 저장소를 다른 계정으로 옮기면(CLAUDE.md §3, 매각 대비) 2번의 Organization 값을 바꾸고 `repository.url`도 함께 고친다.
