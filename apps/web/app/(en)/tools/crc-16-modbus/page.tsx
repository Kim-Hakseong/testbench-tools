import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CrcTool } from "@/components/tool/CrcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "CRC-16 Modbus Calculator — online, instant",
  description:
    "Free online CRC-16/MODBUS calculator for hex or ASCII data. Live result with little-endian byte order for Modbus RTU frames. 100% in your browser.",
  openGraph: { title: "CRC-16 Modbus Calculator — online, instant", description: "Free online CRC-16/MODBUS calculator for hex or ASCII data. Live result with little-endian byte order for Modbus RTU frames. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which byte goes first in a Modbus RTU frame — CRC low or high?",
    a: "The low byte is transmitted first. For the request 01 03 00 00 00 0A the CRC value is 0xCDC5, so the frame ends with C5 CD. Use the little-endian result row when appending the CRC to a frame.",
  },
  {
    q: "What parameters define CRC-16/MODBUS?",
    a: "Width 16, polynomial 0x8005, initial value 0xFFFF, input and output both reflected, and no final XOR. In reflected implementations the polynomial appears as 0xA001.",
  },
  {
    q: "Why does my CRC match the calculator but the device still rejects the frame?",
    a: "The most common causes are byte order (the CRC must be appended low byte first) and including or excluding the wrong bytes — the CRC covers every byte of the RTU frame from the address up to, but not including, the CRC itself.",
  },
  {
    q: "How can I verify this calculator?",
    a: "The standard check value for the ASCII string 123456789 is 0x4B37. Type it in ASCII mode and compare. This value is pinned in this site's automated test suite.",
  },
  {
    q: "Is my data uploaded anywhere?",
    a: "No. The calculation runs entirely in your browser in JavaScript. Nothing you type ever leaves your machine.",
  },
];

const C_SNIPPET = `#include <stdint.h>
#include <stddef.h>

/* CRC-16/MODBUS: poly 0x8005 (reflected 0xA001), init 0xFFFF,
 * refin/refout, no final XOR. Append low byte first. */
uint16_t crc16_modbus(const uint8_t *data, size_t len)
{
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (int b = 0; b < 8; b++)
            crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
    return crc; /* "123456789" -> 0x4B37 */
}`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "CRC-16 Modbus Calculator",
          description: metadata.description!,
          slug: "crc-16-modbus",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="crc-16-modbus">
        <CrcTool presetNames={["CRC-16/MODBUS"]} />
        <AdSlot id="crc-16-modbus-results" />

        <AnswerBox>
          This tool computes the CRC-16/MODBUS checksum used by every Modbus RTU
          frame. Paste hex bytes or ASCII text and the 16-bit CRC appears
          instantly, together with the little-endian byte pair you append to the
          frame. The reference check: ASCII <code>123456789</code> →{" "}
          <code>0x4B37</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            CRC-16/MODBUS is a cyclic redundancy check with width 16, polynomial{" "}
            <code>0x8005</code>, initial register value <code>0xFFFF</code>,
            reflected input and output, and no final XOR. Because both input and
            output are reflected, practical implementations process the register
            right-to-left with the reversed polynomial <code>0xA001</code>: XOR
            each message byte into the low byte of the register, then for each of
            the eight bits shift right and XOR with <code>0xA001</code> whenever
            a 1 falls out.
          </p>
          <p>
            The CRC covers every byte of the RTU frame — slave address, function
            code and data — and is appended to the frame low byte first. A
            receiver recomputes the CRC over the same bytes and compares.
          </p>
        </Section>

        <Section title="Worked example">
          <p>
            A master reads 10 holding registers from unit 1 starting at address
            0. The frame before the CRC is six bytes:
          </p>
          <DataWell>
            frame&nbsp;&nbsp;: 01 03 00 00 00 0A
            <br />
            CRC-16 : 0xCDC5
            <br />
            on wire: 01 03 00 00 00 0A <span className="text-ok">C5 CD</span>{" "}
            (low byte first)
          </DataWell>
          <p>
            And the standard check value over the nine ASCII characters{" "}
            <code>123456789</code> (bytes <code>31 32 33 34 35 36 37 38 39</code>)
            is <code>0x4B37</code> — try both in the calculator above.
          </p>
        </Section>

        <AdSlot id="crc-16-modbus-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Width", value: "16" },
              { name: "Polynomial", value: "0x8005", note: "0xA001 in reflected form" },
              { name: "Init", value: "0xFFFF" },
              { name: "RefIn / RefOut", value: "true / true" },
              { name: "XorOut", value: "0x0000" },
              { name: "Check (“123456789”)", value: "0x4B37" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["modbus-frame-decoder", "crc-16-ccitt", "custom-crc"]} />
      </ToolShell>
    </>
  );
}
