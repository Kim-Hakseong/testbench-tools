import type { Metadata } from "next";
import { McpBody } from "@/components/pages/McpBody";
import { MCP_PAGE } from "@/content/mcp-i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: MCP_PAGE.ja.metaTitle,
  description: MCP_PAGE.ja.metaDesc,
  alternates: sharedAlternates("mcp", "ja"),
  openGraph: { url: "/ja/mcp/", images: ["/og/default.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <McpBody locale="ja" />;
}
