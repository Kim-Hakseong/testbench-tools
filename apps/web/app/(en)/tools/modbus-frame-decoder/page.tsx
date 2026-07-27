import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { ModbusDecoderTool } from "@/components/tool/ModbusDecoderTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/modbus-frame-decoder/" },
  title: "Modbus Frame Decoder — RTU & TCP, online",
  description:
    "Free online Modbus frame decoder for RTU and TCP. Paste hex bytes to see unit, function, addresses and data fields with CRC verification. 100% in your browser.",
  openGraph: { title: "Modbus Frame Decoder — RTU & TCP, online", description: "Free online Modbus frame decoder for RTU and TCP. Paste hex bytes to see unit, function, addresses and data fields with CRC verification. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How does auto-detect tell RTU from TCP?",
    a: "A Modbus TCP frame starts with a 7-byte MBAP header whose Protocol ID is always 0x0000 and whose Length field must equal the number of bytes that follow it. If the header is consistent the frame is treated as TCP; otherwise the last two bytes are checked as an RTU CRC-16. You can also force the protocol manually.",
  },
  {
    q: "Why does my frame show CRC FAIL?",
    a: "The decoder recomputes CRC-16/MODBUS over every byte except the last two and compares with the received value (transmitted low byte first). For example, changing the valid frame 11 03 00 6B 00 03 76 87 to end in 88 fails: the computed CRC is still 0x8776 but the received one is now 0x8876.",
  },
  {
    q: "What does a function code above 0x80 mean?",
    a: "It is an exception response: the device echoes the request's function code with the top bit set, followed by an exception code. For example 01 83 02 C0 F1 is unit 1 answering function 0x03 with exception 02, Illegal Data Address.",
  },
  {
    q: "Does Modbus TCP have a CRC?",
    a: "No. TCP already guarantees integrity at the transport layer, so the RTU CRC-16 is dropped; instead validity is judged by the MBAP header consistency.",
  },
  {
    q: "Is my frame data uploaded?",
    a: "No — decoding happens entirely in your browser.",
  },
];

const PY_SNIPPET = `# Verify a Modbus RTU frame's CRC (poly 0xA001 reflected form).
def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc

frame = bytes.fromhex("1103006B00037687")
assert crc16_modbus(frame[:-2]) == int.from_bytes(frame[-2:], "little")`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Modbus Frame Decoder",
          description: metadata.description!,
          slug: "modbus-frame-decoder",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="modbus-frame-decoder">
        <ModbusDecoderTool />
        <AdSlot id="modbus-frame-decoder-results" />

        <AnswerBox>
          This tool decodes Modbus RTU and Modbus TCP frames from raw hex
          bytes: unit address, function code, register addresses, quantities and
          data, with the RTU CRC-16 verified (or the MBAP header checked for
          TCP). Hover any field to highlight its bytes in the frame. Detection
          is automatic, and you can force RTU or TCP.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A Modbus RTU frame is <code>address + PDU + CRC-16</code>, where the
            PDU is the function code followed by its data. The CRC covers every
            byte before it and travels low byte first. A Modbus TCP frame
            replaces the address and CRC with a 7-byte MBAP header: transaction
            ID, protocol ID (always <code>0x0000</code>), a length field
            counting the bytes that follow it, and the unit ID; the same PDU
            comes after.
          </p>
          <p>
            Request and response PDUs share function codes, so the decoder
            infers direction from shape: a 4-byte body after a read function is
            an address + quantity request, while a body whose first byte equals
            the remaining length is a byte-count-prefixed response.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            RTU request: <span className="text-ok">11</span> 03 00 6B 00 03 76 87
            <br />
            → unit 0x11 (17) · Read Holding Registers (0x03)
            <br />
            → start address 0x006B (107) · quantity 3 · CRC valid
            <br />
            <br />
            Same request over TCP: 00 01 00 00 00 06 11 03 00 6B 00 03
            <br />
            → transaction 1 · protocol 0x0000 · length 6 · unit 0x11
          </DataWell>
        </Section>

        <AdSlot id="modbus-frame-decoder-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "RTU frame", value: "addr(1) + PDU + CRC16(2, LE)", note: "CRC-16/MODBUS over all preceding bytes" },
              { name: "TCP frame", value: "MBAP(7) + PDU", note: "no CRC — TCP transport handles integrity" },
              { name: "MBAP", value: "txn(2) proto(2)=0 len(2) unit(1)", note: "len = bytes after the length field" },
              { name: "Exception", value: "FC | 0x80, then code", note: "e.g. 02 = Illegal Data Address" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["crc-16-modbus", "ieee-754-float", "modbus-address-converter"]} />
      </ToolShell>
    </>
  );
}
