# Reddit 초안 (게시 전 사람 검토)

본문은 두 글 모두 150단어 이내다(제목 포함 122·118단어). URL은 RUN-TB2 확정값(`https://mcp.testbench.tools/mcp`, `https://testbench.tools/mcp/`)이다. 게시 순서: r/ClaudeAI 먼저, 3~4일 뒤 r/embedded. 게시 전 확인할 것:
- ~~DEPLOY.md 1번(원격 서버)이 끝나 `https://mcp.testbench.tools/mcp`가 응답하는지~~ — 2026-11-10 확인
- 각 서브레딧의 자기 홍보 규칙. r/embedded는 자기 홍보 비율 규칙이 엄격하므로, 평소 활동 없이 링크만 올리면 삭제될 수 있다

---

## r/ClaudeAI

**Title:** I turned 58 embedded/industrial calculators into an MCP server — CRCs, Modbus frames, MIL-STD-1553, PLC addresses

I keep a free site of engineering calculators (testbench.tools). Claude is good at explaining a Modbus CRC and bad at computing one in its head, so every calculator is now also an MCP server.

Add it to Claude Code in one line:

`claude mcp add --transport http testbench https://mcp.testbench.tools/mcp`

Then ask "check the CRC of 01 03 00 00 00 0A C5 CD" or "decode 1553 command word 0x0C22". Claude calls the same tested function the website runs. Every tool is checked against the site's own page logic.

It is stateless: nothing you send is stored or logged. A local stdio version runs fully offline.

https://testbench.tools/mcp/


---

## r/embedded

**Title:** Free MCP server for the arithmetic we keep getting wrong: CRC variants, Modbus/NMEA/CAN frames, endianness, timer prescalers

If you use Claude Code (or any MCP client) while writing firmware, here are 58 tools it can call instead of guessing:
- CRC-8/16/32 and custom CRCs, plus CRC algorithm identification
- Modbus RTU, NMEA 0183, CAN and MC-protocol frame decoding
- IEEE 754 word orders, Q-format and two's complement
- STM32 timer prescalers, UART baud error and CAN bit timing
- struct padding

Each tool mirrors a page on testbench.tools and is regression-tested against it, so the answer in your editor matches the one in your browser.

No accounts and no storage. The stdio version runs offline, which matters on air-gapped benches.

Setup: https://testbench.tools/mcp/

