import type { Metadata } from "next";
import { McpBody } from "@/components/pages/McpBody";
import { MCP_PAGE } from "@/content/mcp-i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: MCP_PAGE.en.metaTitle,
  description: MCP_PAGE.en.metaDesc,
  alternates: sharedAlternates("mcp", "en"),
  openGraph: { url: "/mcp/", images: ["/og/default.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <McpBody locale="en" />;
}
