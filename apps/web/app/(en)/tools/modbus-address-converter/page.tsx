import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { ModbusAddressTool } from "@/components/tool/ModbusAddressTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/modbus-address-converter/" },
  title: "Modbus Address Converter — 40001 ↔ 0-based ↔ 1-based",
  description:
    "Free online Modbus address converter between data-model notation (40001, 30001…), 1-based and 0-based protocol addresses, for all four entity types. 100% in your browser.",
  openGraph: { url: "/tools/modbus-address-converter/",
    images: ["/og/modbus-address-converter.png"], siteName: "TestBench.tools", title: "Modbus Address Converter — 40001 ↔ 0-based ↔ 1-based", description: "Convert between 4xxxx data-model notation, 1-based and 0-based Modbus protocol addresses.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does register 40011 go on the wire as address 10?",
    a: "40011 is data-model notation: the leading 4 identifies a holding register and the remaining digits are a 1-based index (the 11th register). The protocol itself transmits a 0-based offset with the entity implied by the function code — so 40011 → offset 11−1 = 10, i.e. 0x000A in the request.",
  },
  {
    q: "What do the leading digits 0, 1, 3 and 4 mean?",
    a: "They encode the entity table: 0xxxx coils (read/write bits), 1xxxx discrete inputs (read-only bits), 3xxxx input registers (read-only 16-bit), 4xxxx holding registers (read/write 16-bit). The digit is a naming convention only — it never appears in the frame.",
  },
  {
    q: "Why do 5-digit and 6-digit notations both exist?",
    a: "5-digit notation (40001–49999) can only name 9999 registers, but the protocol allows 65536. Modern documentation therefore uses 6 digits (400001–465536). The tool shows both, and marks the 5-digit form unavailable when the offset exceeds 9998.",
  },
  {
    q: "My device documentation and my master are off by one — which side is wrong?",
    a: "Neither: one speaks 1-based (data model) and the other 0-based (protocol). Off-by-one is the single most common Modbus commissioning problem. Convert the documented address here and compare the 0-based value with what your master actually transmits.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Conversion happens locally in your browser.",
  },
];

const PY_SNIPPET = `# Data-model notation -> (entity, 0-based protocol address)
TABLES = {0: "coil", 1: "discrete input", 3: "input register", 4: "holding register"}

def parse_data_model(addr: str):
    table, offset = int(addr[0]), int(addr[1:])
    return TABLES[table], offset - 1        # 1-based -> 0-based

assert parse_data_model("40011") == ("holding register", 10)
assert parse_data_model("30001") == ("input register", 0)`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Modbus Address Converter", description: metadata.description!, slug: "modbus-address-converter", faqs: FAQS })} />
      <ToolShell slug="modbus-address-converter">
        <ModbusAddressTool />
        <AdSlot id="modbus-address-converter-results" />

        <AnswerBox>
          This tool translates between the three ways a Modbus register gets
          named: data-model notation (40011), 1-based addressing (11) and the
          0-based protocol address that actually travels on the wire (10). It
          understands all four entity tables — coils, discrete inputs, input
          registers and holding registers — in both 5- and 6-digit forms.
        </AnswerBox>

        <Section title="How it works">
          <p>
            The Modbus protocol transmits a plain 0-based offset; which of the
            four data tables it indexes is implied by the function code, not
            the address. Documentation, however, traditionally names points
            with a table prefix and a 1-based index: 4 for holding registers,
            3 for input registers, 1 for discrete inputs, 0 for coils. Both
            conventions describe the same register, shifted by one and dressed
            differently — and mixing them silently produces the infamous
            off-by-one errors.
          </p>
          <p>
            Paste a documented address like 40011 to get the wire offset, or go
            the other way from a captured request back to the documentation
            name. Offsets beyond 9998 only exist in the 6-digit notation, which
            the tool selects automatically.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            40011 → holding register · 1-based 11 · protocol offset <span className="text-ok">10</span> (0x000A)
            <br />
            30001 → input register · protocol offset 0
            <br />
            100005 → discrete input · protocol offset 4
          </DataWell>
        </Section>

        <AdSlot id="modbus-address-converter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "0xxxx", value: "coils", note: "read/write bits, FC 01/05/15" },
              { name: "1xxxx", value: "discrete inputs", note: "read-only bits, FC 02" },
              { name: "3xxxx", value: "input registers", note: "read-only 16-bit, FC 04" },
              { name: "4xxxx", value: "holding registers", note: "read/write 16-bit, FC 03/06/16" },
              { name: "Wire format", value: "0-based offset", note: "0 … 65535, table via function code" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["modbus-frame-decoder", "crc-16-modbus", "ieee-754-float"]} />
      </ToolShell>
    </>
  );
}
