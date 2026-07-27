import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { StructPaddingTool } from "@/components/tool/StructPaddingTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/struct-padding/" },
  title: "Struct Padding Visualizer — offsets, padding, sizeof",
  description:
    "Free online C struct layout visualizer: paste members and see offsets, padding bytes and total sizeof for 32/64-bit natural alignment, with a byte map. 100% in your browser.",
  openGraph: { title: "Struct Padding Visualizer — offsets, padding, sizeof", description: "Paste C struct members and see offsets, padding and sizeof for 32/64-bit alignment.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does the compiler insert padding at all?",
    a: "Because most CPUs load an N-byte value fastest (or only correctly) from an address divisible by N. The compiler aligns each member to its natural boundary and pads the struct's tail so arrays of it stay aligned — trading bytes for guaranteed-safe access.",
  },
  {
    q: "How do I minimize padding?",
    a: "Order members from largest to smallest alignment. The example struct {uint8_t; uint32_t; uint16_t;} occupies 12 bytes, but reordering to {uint32_t; uint16_t; uint8_t;} drops it to 8 — the visualizer's byte map makes such wins visible immediately.",
  },
  {
    q: "Which alignment rules does this tool assume?",
    a: "Natural alignment as used by System V-style ABIs (GCC/Clang on x86-64, ARM EABI): each member aligns to its own size, long is 4 bytes on 32-bit and 8 on 64-bit (LP64), pointers match the word size. Note MSVC on Windows keeps long at 4 bytes even on 64-bit, and #pragma pack changes everything.",
  },
  {
    q: "Why does struct layout matter for protocols and file formats?",
    a: "Casting a raw byte buffer onto a struct only works when both sides agree on layout — padding silently shifts fields. For wire formats, either serialize field by field, or use packed structs knowingly and accept the unaligned-access cost.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Parsing and layout run locally in your browser.",
  },
];

const C_SNIPPET = `#include <stddef.h>   /* offsetof */

struct sample {
    uint8_t  flags;   /* offset 0            */
    uint32_t count;   /* offset 4 (3 pad)    */
    uint16_t id;      /* offset 8            */
};                    /* sizeof = 12 (2 tail pad) */

_Static_assert(offsetof(struct sample, count) == 4, "layout");
_Static_assert(sizeof(struct sample) == 12, "size");`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Struct Padding Visualizer", description: metadata.description!, slug: "struct-padding", faqs: FAQS })} />
      <ToolShell slug="struct-padding">
        <StructPaddingTool />
        <AdSlot id="struct-padding-results" />

        <AnswerBox>
          This tool lays out a C struct the way a natural-alignment compiler
          does: paste the members and read each field&apos;s offset, the padding
          inserted before it, and the final <code>sizeof</code> — for 32- or
          64-bit targets, with a byte map that paints padding amber. The demo
          struct wastes 5 of its 12 bytes; reordering reclaims them.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Under natural alignment each member must start at an offset
            divisible by its own size (capped at the word size), so the
            compiler inserts invisible bytes before misaligned members. The
            struct&apos;s total size then rounds up to the largest member
            alignment, so that consecutive array elements stay aligned too.
            This tool applies exactly those rules — long as 4/8 bytes per
            LP64, pointers at word size — and reports every inserted byte.
          </p>
          <p>
            Because padding is invisible in source code, it is a classic source
            of surprises: structs that don&apos;t match wire formats, memcmp
            comparing garbage bytes, and doubled memory footprints from
            unlucky member ordering.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            uint8_t flags; uint32_t count; uint16_t id; (32-bit)
            <br />
            offsets: flags 0 · count <span className="text-warn">4 (+3 pad)</span> · id 8
            <br />
            sizeof = <span className="text-ok">12</span> (5 bytes padding) — reordered largest-first: 8
          </DataWell>
        </Section>

        <AdSlot id="struct-padding-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Rule", value: "offset % min(size, word) == 0", note: "natural alignment" },
              { name: "Tail padding", value: "size rounds to max align", note: "keeps arrays aligned" },
              { name: "long", value: "4 B (32-bit) / 8 B (64-bit LP64)", note: "MSVC differs: always 4" },
              { name: "Pointers", value: "word size", note: "4 / 8 bytes" },
              { name: "Supported", value: "stdint types, char/short/int/long, float/double, arrays, pointers" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["bit-field-extractor", "endianness-converter", "hex-file-viewer"]} />
      </ToolShell>
    </>
  );
}
