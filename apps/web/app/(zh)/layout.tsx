import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://testbench.tools"),
  title: {
    default: "TestBench.tools — 工程师免费计算与转换工具",
    template: "%s · TestBench.tools",
  },
  description:
    "面向测试测量、嵌入式与工业自动化工程师的免费浏览器工具。CRC、Modbus、PLC 换算、PT100、TDMS 转换 — 100% 浏览器本地运行。",
};

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="zh">{children}</RootShell>;
}
