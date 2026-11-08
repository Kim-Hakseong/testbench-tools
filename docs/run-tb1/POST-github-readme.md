# 공개 저장소 README 상단 MCP 블록 (초안)

testbench-frameterm, -modbus-workbench, -tdms-converter, -linktap README의 제목 바로 아래, 또는 MCP 서버를 공개 저장소로 낼 경우 그 README 맨 위에 붙인다. 원격 URL(`https://mcp.testbench.tools/mcp`)과 패키지명(`@testbench-tools/mcp`)은 RUN-TB2에서 확정값으로 맞췄다. 이 저장소(testbench-tools) README에는 RUN-TB2에서 삽입했다.

---

```markdown
> **Use these calculators from Claude Code.** Every tool on [TestBench.tools](https://testbench.tools) is also an
> [MCP](https://modelcontextprotocol.io) server — 58 tools for CRCs, Modbus/NMEA/CAN frames, MIL-STD-1553,
> ARINC 429, PLC addresses, RTD/thermocouple maths and embedded timing.
>
> ```bash
> # remote, nothing to install
> claude mcp add --transport http testbench https://mcp.testbench.tools/mcp
> # or local and offline (Node 18+)
> claude mcp add testbench -- npx -y @testbench-tools/mcp
> ```
>
> Stateless: inputs are computed and discarded, never stored. Each tool is regression-tested against the
> website's own page logic. → [testbench.tools/mcp](https://testbench.tools/mcp/)
```
