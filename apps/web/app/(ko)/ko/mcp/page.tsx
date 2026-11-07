import type { Metadata } from "next";
import { McpBody } from "@/components/pages/McpBody";
import { MCP_PAGE } from "@/content/mcp-i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: MCP_PAGE.ko.metaTitle,
  description: MCP_PAGE.ko.metaDesc,
  alternates: sharedAlternates("mcp", "ko"),
  openGraph: { url: "/ko/mcp/", images: ["/og/default.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <McpBody locale="ko" />;
}
