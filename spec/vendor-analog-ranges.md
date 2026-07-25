# vendor-analog-ranges.md — PLC 아날로그 raw 범위 근거 (사람 검증 게이트)
구현 규칙: 아래 표에 출처가 기재된 항목만 프리셋으로 구현한다. (CLAUDE.md §5-3)

| 벤더/계열 | raw 범위 (정격) | 출처 | 상태 |
|---|---|---|---|
| Siemens S7 (S7-1200/1500 아날로그 정격) | 0 .. 27648 | Siemens S7 아날로그 모듈 매뉴얼 (Haku 확인 완료 표기 필요) | ✅ 구현 가 |
| Allen-Bradley | (미기재) | 매뉴얼 확인 후 기재 | ⛔ 구현 금지 |
| Mitsubishi | (미기재) | 〃 | ⛔ 구현 금지 |
| LS ELECTRIC | (미기재) | 〃 | ⛔ 구현 금지 |
