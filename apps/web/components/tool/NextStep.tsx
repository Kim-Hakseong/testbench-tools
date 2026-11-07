import Link from "next/link";
import { TOOLS, type CategoryId } from "@/content/tools-meta";

// "Next step" — one sentence and one link at the foot of every tool page,
// pointing to the bigger version of the same problem (RUN-TB1 §5). Not an ad:
// no logo, no image, no superlatives, same quiet type as the page.

type Locale = "en" | "ko";

interface Step {
  href: (locale: Locale) => string;
  label: string;
  en: string;
  ko: string;
}

const app = (slug: string) => (l: Locale) => (l === "ko" ? `/ko/apps/${slug}/` : `/apps/${slug}/`);

const STEPS = {
  bus: { href: () => "/noctra/bus/", label: "Noctra Bus", en: "To watch hundreds of messages on a live 1553 or 429 bus instead of one word at a time:", ko: "한 워드씩이 아니라 실물 1553·429 버스에서 수백 개 메시지를 보려면:" },
  view: { href: () => "/noctra/view/", label: "Noctra View", en: "For multi-gigabyte measurement files, explored the way DIAdem does:", ko: "수 GB 측정 파일을 DIAdem처럼 탐색하려면:" },
  oneshot: { href: () => "/noctra/oneshot/", label: "Noctra OneShot", en: "To go from the drawing to an XG5000 ladder program automatically:", ko: "도면에서 XG5000 래더까지 자동으로 생성하려면:" },
  modbus: { href: app("modbus-workbench"), label: "Modbus Workbench", en: "To poll and write a real device, with a built-in simulator:", ko: "실제 장비를 폴링·쓰기하고 내장 시뮬레이터로 시험하려면:" },
  frameterm: { href: app("frameterm"), label: "FrameTerm", en: "To run this on live serial or TCP traffic, every frame parsed as it arrives:", ko: "실시간 시리얼·TCP 트래픽에서 들어오는 프레임마다 해석하려면:" },
  linktap: { href: app("linktap"), label: "LinkTap", en: "To capture a live serial or TCP link and decode NMEA as it passes:", ko: "실시간 시리얼·TCP 링크를 캡처하면서 NMEA를 바로 디코딩하려면:" },
  mcp: { href: (l) => (l === "ko" ? "/ko/mcp/" : "/mcp/"), label: "TestBench MCP", en: "To use this calculation from inside Claude Code, without leaving the editor:", ko: "에디터를 떠나지 않고 Claude Code 안에서 이 계산을 쓰려면:" },
} satisfies Record<string, Step>;

export type StepId = keyof typeof STEPS;

const XGT = new Set(["ls-xgt-address-converter", "xgt-cnet-builder", "xgt-cnet-decoder"]);

/** Category rules from RUN-TB1 §5, with the protocol decoders sent to the app that matches each protocol. */
export function nextStepFor(slug: string, category: CategoryId): StepId {
  if (category === "avionics-databus") return "bus";
  if (category === "file-tools") return "view";
  if (XGT.has(slug)) return "oneshot";
  if (slug.startsWith("modbus-")) return "modbus";
  if (category === "plc-industrial") return "modbus";
  if (category === "protocol-decoders") return slug.startsWith("nmea-") ? "linktap" : "frameterm";
  return "mcp";
}

export function stepHref(id: StepId, locale: Locale): string {
  return STEPS[id].href(locale);
}

export function NextStep({ slug, locale = "en" }: { slug: string; locale?: Locale }) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) return null;
  const id = nextStepFor(slug, tool.category);
  const step: Step = STEPS[id];
  return (
    <aside className="mt-12 border-t border-line-soft pt-5" data-next-step={id}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">{locale === "ko" ? "다음 단계" : "Next step"}</div>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-body">
        {locale === "ko" ? step.ko : step.en}{" "}
        <Link href={step.href(locale)} className="font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
          {step.label} →
        </Link>
      </p>
    </aside>
  );
}
