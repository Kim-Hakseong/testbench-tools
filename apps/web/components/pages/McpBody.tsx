import Link from "next/link";
import { TOOLS as MCP_TOOLS, callTool } from "@testbench/bench-core";
import { CopyButton } from "@/components/CopyButton";
import { CATEGORIES } from "@/content/tools-meta";
import { CATEGORY_NAMES, type SiteLocale } from "@/content/i18n";
import { MCP_LOCAL_PACKAGE, MCP_PAGE, MCP_REMOTE_URL } from "@/content/mcp-i18n";

interface Example {
  ask: Record<SiteLocale, string>;
  tool: string;
  args: Record<string, unknown>;
  /** Result keys worth showing; the full JSON is longer than the point. */
  show: string[];
}

// Each result is computed by bench-core while the page is statically built, so
// the page cannot quote a value the tool would not return.
export const MCP_EXAMPLES: Example[] = [
  {
    ask: {
      en: "Check this Modbus frame's CRC: 01 03 00 00 00 0A C5 CD",
      ko: "이 Modbus 프레임 CRC 맞는지 확인해 줘: 01 03 00 00 00 0A C5 CD",
      ja: "この Modbus フレームの CRC を確認して：01 03 00 00 00 0A C5 CD",
      de: "Prüf die CRC dieses Modbus-Frames: 01 03 00 00 00 0A C5 CD",
      zh: "检查这个 Modbus 帧的 CRC：01 03 00 00 00 0A C5 CD",
    },
    tool: "crc.modbus16",
    args: { data: "01 03 00 00 00 0A" },
    show: ["crc", "bytesLittleEndian"],
  },
  {
    ask: {
      en: "Decode the MIL-STD-1553 command word 0x0C22",
      ko: "MIL-STD-1553 커맨드 워드 0x0C22 디코드해 줘",
      ja: "MIL-STD-1553 のコマンドワード 0x0C22 をデコードして",
      de: "Dekodiere das MIL-STD-1553-Kommandowort 0x0C22",
      zh: "解码 MIL-STD-1553 命令字 0x0C22",
    },
    tool: "mil1553.decode_command",
    args: { word: "0x0C22" },
    show: ["rtAddress", "direction", "subaddress", "wordCount"],
  },
  {
    ask: {
      en: "Which word and bit is LS XGT address P00105?",
      ko: "LS XGT 주소 P00105 는 몇 번 워드의 몇 번 비트야?",
      ja: "LS XGT のアドレス P00105 は何ワードの何ビット？",
      de: "Welches Wort und Bit ist die LS-XGT-Adresse P00105?",
      zh: "LS XGT 地址 P00105 是第几个字的第几位？",
    },
    tool: "plc.xgt_address",
    args: { address: "P00105" },
    show: ["deviceName", "word", "bit", "bitFromStartOfArea"],
  },
];

function pick(result: unknown, keys: string[]): unknown {
  if (!keys.length || typeof result !== "object" || result === null) return result;
  const r = result as Record<string, unknown>;
  return Object.fromEntries(keys.filter((k) => k in r).map((k) => [k, r[k]]));
}

function Command({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-btn border border-line-soft bg-well px-3 py-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-ink">{text}</code>
      <CopyButton text={text} />
    </div>
  );
}

export function McpBody({ locale }: { locale: SiteLocale }) {
  const t = MCP_PAGE[locale];
  const remote = `claude mcp add --transport http testbench ${MCP_REMOTE_URL}`;
  const local = `claude mcp add testbench -- npx -y ${MCP_LOCAL_PACKAGE}`;
  const config = JSON.stringify({ mcpServers: { testbench: { type: "http", url: MCP_REMOTE_URL } } }, null, 2);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{t.h1}</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-body">{t.lead}</p>
      <p className="mt-4 max-w-2xl rounded-btn border border-ok/40 px-3 py-2 font-mono text-xs leading-relaxed text-ok">{t.stateless}</p>

      <h2 className="tb-display mt-12 text-2xl">{t.installH}</h2>
      <div className="mt-4 space-y-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-mute">{t.remoteLabel}</div>
          <Command text={remote} />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-mute">{t.localLabel}</div>
          <Command text={local} />
          <p className="mt-2 text-xs text-mute">{t.remoteNote}</p>
        </div>
      </div>

      <h3 className="mt-8 text-sm font-medium text-ink">{t.configH}</h3>
      <pre className="mt-2 overflow-x-auto rounded-btn border border-line-soft bg-well px-3 py-2 font-mono text-xs text-ink">{config}</pre>
      <p className="mt-2 text-xs text-mute">{t.configNote}</p>

      <h2 className="tb-display mt-12 text-2xl">{t.examplesH}</h2>
      <p className="mt-2 text-sm text-mute">{t.examplesLead}</p>
      <div className="mt-4 space-y-4">
        {MCP_EXAMPLES.map((ex) => {
          const r = callTool(ex.tool, ex.args);
          if (!r.ok) throw new Error(`MCP example ${ex.tool} failed at build: ${r.error}`);
          return (
            <div key={ex.tool} className="rounded-card border border-line-soft bg-surface p-4">
              <div className="text-[11px] uppercase tracking-wide text-mute">{t.youAsk}</div>
              <p className="mt-1 text-[15px] text-ink">“{ex.ask[locale]}”</p>
              <div className="mt-3 text-[11px] uppercase tracking-wide text-mute">{t.toolCalled}</div>
              <code className="mt-1 block overflow-x-auto font-mono text-xs text-body">{ex.tool} {JSON.stringify(ex.args)}</code>
              <div className="mt-3 text-[11px] uppercase tracking-wide text-mute">{t.toolReturns}</div>
              <pre className="mt-1 overflow-x-auto font-mono text-xs text-ink">{JSON.stringify(pick(r.result, ex.show), null, 2)}</pre>
            </div>
          );
        })}
      </div>

      <h2 className="tb-display mt-12 text-2xl">{t.listH} ({MCP_TOOLS.length})</h2>
      <p className="mt-2 text-sm text-mute">{t.listLead}</p>
      {CATEGORIES.map((c) => {
        const tools = MCP_TOOLS.filter((x) => x.category === c.id);
        if (!tools.length) return null;
        return (
          <section key={c.id} className="mt-6">
            <h3 className="text-sm font-medium text-ink">{CATEGORY_NAMES[locale][c.id]}</h3>
            <ul className="mt-2 divide-y divide-line-soft rounded-btn border border-line-soft">
              {tools.map((x) => (
                <li key={x.name} className="px-3 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <code className="font-mono text-xs text-ink">{x.name}</code>
                    <Link href={`/tools/${x.slug}/`} className="font-mono text-[11px] text-mute underline decoration-line-strong underline-offset-2 hover:text-body">
                      /tools/{x.slug}/
                    </Link>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-body">{x.description}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
