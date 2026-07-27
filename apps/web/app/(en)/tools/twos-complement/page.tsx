import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TwosComplementTool } from "@/components/tool/TwosComplementTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/twos-complement/" },
  title: "Two's Complement Converter — signed ↔ hex, 8/16/32-bit",
  description:
    "Free online two's complement converter: signed decimal ↔ raw hex at 8, 16 and 32-bit widths, with unsigned and binary views. 100% in your browser.",
  openGraph: { title: "Two's Complement Converter — signed ↔ hex, 8/16/32-bit", description: "Signed decimal ↔ raw hex at 8/16/32-bit widths, with unsigned and binary views.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does my register read 65526 when the sensor says -10?",
    a: "Because the register is being read as unsigned. The 16-bit pattern 0xFFF6 is 65526 unsigned but −10 in two's complement. Reading signed values as unsigned (or vice versa) is one of the most common Modbus and PLC integration bugs — this converter shows both interpretations of the same bits side by side.",
  },
  {
    q: "How does two's complement encode negative numbers?",
    a: "A negative number −x is stored as 2ᴺ − x for an N-bit word. Equivalently: invert every bit of x and add one. The top bit doubles as the sign indicator, and arithmetic works with the same adder hardware as unsigned math — which is why virtually every CPU uses it.",
  },
  {
    q: "What are the value ranges per width?",
    a: "8-bit: −128 … 127. 16-bit: −32768 … 32767. 32-bit: −2147483648 … 2147483647. The asymmetry (one more negative value than positive) comes from zero occupying a non-negative pattern.",
  },
  {
    q: "How do I sign-extend a 16-bit value to 32 bits?",
    a: "Copy the sign bit into all upper bits: 0xFFF6 becomes 0xFFFFFFF6, which is still −10. Convert your value at 16-bit here, then re-enter the decimal at 32-bit to see the extended pattern.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All conversion happens locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>

/* Reinterpret a raw 16-bit register as signed (two's complement). */
int16_t as_signed16(uint16_t raw)
{
    return (int16_t)raw;      /* 0xFFF6 -> -10 */
}

/* Portable form without implementation-defined casts: */
int32_t to_signed(uint32_t v, int bits)
{
    uint32_t sign = 1u << (bits - 1);
    return (v & sign) ? (int32_t)(v - (1u << bits)) : (int32_t)v;
}`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Two's Complement Converter", description: metadata.description!, slug: "twos-complement", faqs: FAQS })} />
      <ToolShell slug="twos-complement">
        <TwosComplementTool />
        <AdSlot id="twos-complement-results" />

        <AnswerBox>
          This tool converts between signed decimal integers and their raw
          two&apos;s-complement representation at 8, 16 or 32-bit width — with
          unsigned and binary views of the same bit pattern. The reference
          case: <code>0xFFF6</code> read as a signed 16-bit value is{" "}
          <code>−10</code>, while the same bits read unsigned are 65526.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Two&apos;s complement stores a negative number −x as{" "}
            <code>2ᴺ − x</code> in an N-bit word — equivalently, invert all bits
            of x and add one. The most significant bit then acts as the sign:
            patterns with it set decode as <code>value − 2ᴺ</code>. The genius
            of the scheme is that addition, subtraction and comparison against
            zero all work with plain unsigned adder hardware, so every
            mainstream CPU and PLC uses it for signed integers.
          </p>
          <p>
            Problems appear at the boundaries between systems: a Modbus
            register is just 16 bits, and whether those bits mean 65526 or −10
            is purely a matter of interpretation the protocol does not carry.
            Editing either field here updates the other, so you can check both
            directions instantly.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            width 16 · decimal −10
            <br />
            |−10| = 0x000A → invert → 0xFFF5 → +1 → <span className="text-ok">0xFFF6</span>
            <br />
            unsigned reading: 65526 · binary: 1111 1111 1111 0110
          </DataWell>
        </Section>

        <AdSlot id="twos-complement-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "8-bit range", value: "−128 … 127", note: "0x80 … 0x7F" },
              { name: "16-bit range", value: "−32 768 … 32 767", note: "0x8000 … 0x7FFF" },
              { name: "32-bit range", value: "−2 147 483 648 … 2 147 483 647" },
              { name: "Negation", value: "invert bits, add 1" },
              { name: "Sign bit", value: "most significant bit" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["number-base-converter", "endianness-converter", "ieee-754-float"]} />
      </ToolShell>
    </>
  );
}
