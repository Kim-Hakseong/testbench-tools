import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { FrameWorkbenchTool } from "@/components/tool/FrameWorkbenchTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/frame-workbench/" },
  title: "Binary Frame Decoder — custom protocol fields, CRC check, FrameTerm export",
  description:
    "Free online binary frame workbench: declare a custom protocol's fields (u8–s32, float, endianness) and checksum placement once, paste hex frames, and see every field decoded with OK/FAIL per frame. Exports a FrameTerm project. 100% in your browser.",
  openGraph: { url: "/tools/frame-workbench/",
    images: ["/og/frame-workbench.png"],
    siteName: "TestBench.tools",
    title: "Binary Frame Workbench",
    description: "Declare a frame layout once; decode fields and verify the checksum of every pasted frame.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "How do I decode a custom binary protocol frame?",
    a: "Write down the layout once — where each field starts, how many bytes it takes, whether it is signed, float or unsigned, and which byte comes first — plus where the checksum sits and which bytes it covers. Then every frame is just that layout applied to bytes. This tool takes the layout as a table, so pasting twenty frames decodes twenty rows instead of twenty sessions with a calculator.",
  },
  {
    q: "Why does my CRC fail when the bytes look right?",
    a: "Usually one of three settings, not the data: the byte order of the checksum in the frame (Modbus RTU sends the CRC low byte first, so 0xCDC5 travels as C5 CD), the coverage range (many protocols exclude a sync byte from the CRC), or the algorithm variant (CRC-16/MODBUS and CRC-16/CCITT-FALSE are both 'CRC-16' and give different answers). The selected frame shows the computed value, the value the frame carries and the exact byte range covered, so you can see which of the three it is.",
  },
  {
    q: "What do 'bytes from end' and 'coverage' mean?",
    a: "They place the checksum relative to the end of the frame, which is what makes one layout work for frames of different lengths. 'Bytes from end' = 2 means the checksum starts two bytes before the end. Coverage runs from 'coverage from byte' up to the coverage end — with the end set to 2, the checksum covers everything before itself. A protocol with a 7E sync byte the CRC skips sets coverage to start at byte 1.",
  },
  {
    q: "What is the difference between little-endian and big-endian fields?",
    a: "Byte order inside a multi-byte field. The bytes 34 12 read as a little-endian u16 are 0x1234 = 4660; read big-endian they are 0x3412 = 13330. Modbus registers and most network protocols are big-endian; x86, ARM Cortex-M and most binary structs on a microcontroller are little-endian. Getting it wrong never errors — it just produces a plausible wrong number, which is why the decoded value sits next to the coloured bytes it came from.",
  },
  {
    q: "Can I open this layout in FrameTerm?",
    a: "Yes. 'Export .ftproj' writes a FrameTerm project file with the same checksum and field definitions, and FrameTerm opens it directly — then the layout runs against live serial or TCP traffic instead of pasted frames. Importing a .ftproj works the other way, and keeps the project's framing, highlights and macros so exporting again loses nothing.",
  },
  {
    q: "Is anything uploaded when I share a link?",
    a: "No. A share link carries only the layout, never the frames, and it sits after the # in the URL — the part browsers keep to themselves and do not send to any server. Frames, imports and exports are all handled in your browser.",
  },
];

const PY_SNIPPET = `# The same decode in Python: FrameTerm's demo frame
import struct

frame = bytes.fromhex("A5 06 07 00 E1 01 18 0A")

def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc

body, carried = frame[:-2], struct.unpack("<H", frame[-2:])[0]
print("checksum", "OK" if crc16_modbus(body) == carried else "FAIL")
seq = frame[2]
temp = struct.unpack(">h", frame[3:5])[0]   # s16 big-endian
status = frame[5]
print(seq, temp, status)                    # 7 225 1`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Binary Frame Workbench", description: metadata.description!, slug: "frame-workbench", faqs: FAQS })} />
      <ToolShell slug="frame-workbench">
        <FrameWorkbenchTool />
        <AdSlot id="frame-workbench-results" />

        <AnswerBox>
          This workbench decodes binary frames from a custom protocol. Declare
          the layout once — typed fields at fixed offsets, and where the
          checksum sits and what it covers — then paste any number of hex
          frames: each one gets its fields decoded and its checksum marked OK
          or FAIL, with the bytes coloured by the field they belong to. The
          layout exports as a FrameTerm project, so the same definition runs
          against live serial traffic in the desktop app.
        </AnswerBox>

        <Section title="Worked example: FrameTerm's demo protocol">
          <p>
            FrameTerm&apos;s built-in demo sends 8-byte frames: a sync byte A5, a
            length byte, a sequence number, a temperature as a signed 16-bit
            big-endian value in tenths of a degree, a status byte, and a
            CRC-16/MODBUS sent low byte first. Every tenth frame is corrupted on
            purpose.
          </p>
          <DataWell>
            A5 06 07 00 E1 01 18 0A{"  "}→{"  "}OK{"    "}seq 7 · temp 225 · status 1
            <br />
            A5 06 08 00 EB 00 DC 7E{"  "}→{"  "}OK{"    "}seq 8 · temp 235 · status 0
            <br />
            A5 06 09 00 F5 00 2B DD{"  "}→{"  "}FAIL{"  "}seq 9 · temp 245 · status 0
          </DataWell>
          <p>
            Temperature 225 is 22.5 °C. These rows are not typed in by hand:
            they come from running FrameTerm&apos;s own engine on the same layout,
            and this page&apos;s decoder is tested against them.
          </p>
        </Section>

        <Section title="Why the checksum fails when the data is right">
          <p>
            A FAIL on a frame you believe is good is almost always the layout.
            Take the classic Modbus RTU request to read ten holding registers:
          </p>
          <DataWell>
            01 03 00 00 00 0A C5 CD
            <br />
            CRC-16/MODBUS over bytes 0–5 = 0xCDC5
            <br />
            little-endian (low byte first): frame carries 0xCDC5{"  "}→{"  "}OK
            <br />
            big-endian (high byte first):{"   "}frame carries 0xC5CD{"  "}→{"  "}FAIL
          </DataWell>
          <p>
            Same bytes, same algorithm, opposite verdict — only the checksum&apos;s
            byte order changed. The other two usual suspects are coverage (a
            sync byte the CRC skips) and the variant (CRC-16/MODBUS versus
            CRC-16/CCITT-FALSE). The selected frame always shows the value
            computed, the value carried and the byte range covered, so the
            mismatch is visible rather than guessed at.
          </p>
        </Section>

        <AdSlot id="frame-workbench-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Field types", value: "u8 · s8 · u16 · s16 · u32 · s32 · f32", note: "per-field byte order" },
              { name: "Checksums", value: "CRC-16/MODBUS · CRC-16/CCITT-FALSE · CRC-32 · CRC-8 · XOR8 · SUM8" },
              { name: "Placement", value: "bytes from end + coverage range", note: "one layout fits frames of any length" },
              { name: "Short frames", value: "field shows N/A", note: "only that field degrades" },
              { name: "Project files", value: ".ftproj import / export", note: "opens in FrameTerm" },
              { name: "Share", value: "layout in the URL fragment", note: "frames are never included" },
            ]}
          />
          <p className="mt-3">
            The layout model is FrameTerm&apos;s, deliberately: when pasted frames
            are not enough, <Link href="/apps/frameterm/" className="underline underline-offset-2">FrameTerm</Link>{" "}
            runs the exported layout on a live serial port or TCP link, with
            framing, highlight rules and a send composer.
          </p>
        </Section>

        <Section title="Python equivalent">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["custom-crc", "endianness-converter", "modbus-frame-decoder"]} />
      </ToolShell>
    </>
  );
}
