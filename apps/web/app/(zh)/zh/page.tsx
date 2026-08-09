import type { Metadata } from "next";
import { HubPage } from "@/components/HubPage";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "工程计算，一个标签页搞定 — 免费浏览器工具",
  description:
    "CRC 计算、报文解码、PLC 标定换算、传感器计算与文件转换 — 免费、即时、100% 浏览器本地运行。您的数据不会离开浏览器。",
  alternates: hubAlternates("zh"),
};

export default function Page() {
  return <HubPage locale="zh" />;
}
