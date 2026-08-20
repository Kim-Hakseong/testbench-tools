"use client";

import { useMemo, useState } from "react";
import {
  buildNmea,
  nmeaDate,
  nmeaLatitude,
  nmeaLongitude,
  nmeaTime,
  parseNmea,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

type Kind = "GGA" | "RMC" | "custom";

const KINDS: { id: Kind; label: string }[] = [
  { id: "GGA", label: "GGA — fix data" },
  { id: "RMC", label: "RMC — recommended minimum" },
  { id: "custom", label: "Custom body" },
];

/** GNSS talkers in the order people meet them. */
const TALKERS = ["GP", "GN", "GL", "GA", "BD"];

const FIX_QUALITIES = [
  "0 — invalid",
  "1 — GPS fix",
  "2 — DGPS fix",
  "4 — RTK fixed",
  "5 — RTK float",
  "6 — dead reckoning",
];

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

export function NmeaGeneratorTool() {
  const t = useToolText();
  const [kind, setKind] = useState<Kind>("GGA");
  const [talker, setTalker] = useState("GP");
  const [latText, setLatText] = useState("37.5665");
  const [lonText, setLonText] = useState("126.9780");
  const [timeText, setTimeText] = useState("02:30:00");
  const [dateText, setDateText] = useState("2026-08-20");
  const [quality, setQuality] = useState(1);
  const [satsText, setSatsText] = useState("8");
  const [hdopText, setHdopText] = useState("0.9");
  const [altText, setAltText] = useState("38.0");
  const [speedText, setSpeedText] = useState("0.0");
  const [courseText, setCourseText] = useState("0.0");
  const [customBody, setCustomBody] = useState("PTBT,1,hello");

  const built = useMemo(() => {
    if (kind === "custom") {
      const body = customBody.replace(/^\$/, "").trim();
      if (body === "") return { ok: false as const, error: t("Enter the sentence body without the leading $") };
      return { ok: true as const, sentence: buildNmea(body), conversions: [] as string[] };
    }

    const lat = num(latText);
    const lon = num(lonText);
    if (lat === null || lon === null) return { ok: false as const, error: t("Enter latitude and longitude in decimal degrees") };
    const encLat = nmeaLatitude(lat);
    const encLon = nmeaLongitude(lon);
    if (!encLat.ok) return { ok: false as const, error: `${t("Latitude")}: ${encLat.error}` };
    if (!encLon.ok) return { ok: false as const, error: `${t("Longitude")}: ${encLon.error}` };

    const tm = /^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(timeText.trim());
    const time = tm ? nmeaTime(Number(tm[1]), Number(tm[2]), Number(tm[3])) : null;
    if (time === null) return { ok: false as const, error: t("Time must be hh:mm:ss UTC") };

    const conversions = [
      `${lat}° → ${encLat.value.field},${encLat.value.hemisphere}`,
      `${lon}° → ${encLon.value.field},${encLon.value.hemisphere}`,
    ];

    if (kind === "GGA") {
      const sats = num(satsText);
      const hdop = num(hdopText);
      const alt = num(altText);
      if (sats === null || !Number.isInteger(sats) || sats < 0 || sats > 99) {
        return { ok: false as const, error: t("Satellites must be a whole number 0–99") };
      }
      const body =
        `${talker}GGA,${time},${encLat.value.field},${encLat.value.hemisphere},` +
        `${encLon.value.field},${encLon.value.hemisphere},${quality},` +
        `${String(sats).padStart(2, "0")},${hdop ?? ""},${alt ?? ""},M,,M,,`;
      return { ok: true as const, sentence: buildNmea(body), conversions };
    }

    const dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateText.trim());
    const date = dm ? nmeaDate(Number(dm[3]), Number(dm[2]), Number(dm[1])) : null;
    if (date === null) return { ok: false as const, error: t("Date must be YYYY-MM-DD") };
    const speed = num(speedText) ?? 0;
    const course = num(courseText) ?? 0;
    const body =
      `${talker}RMC,${time},A,${encLat.value.field},${encLat.value.hemisphere},` +
      `${encLon.value.field},${encLon.value.hemisphere},` +
      `${speed.toFixed(1)},${course.toFixed(1)},${date},,,A`;
    return { ok: true as const, sentence: buildNmea(body), conversions };
  }, [kind, talker, latText, lonText, timeText, dateText, quality, satsText, hdopText, altText, speedText, courseText, customBody, t]);

  // Round-trip through our own decoder, so a generator bug shows itself here
  // instead of on someone's bus.
  const back = useMemo(() => {
    if (!built.ok) return null;
    const r = parseNmea(built.sentence);
    return r.ok ? r.sentence : null;
  }, [built]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ng-kind" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Sentence")}
              </label>
              <select id="ng-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={fieldCls}>
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>{t(k.label)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ng-talker" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Talker")}
              </label>
              <select id="ng-talker" value={talker} onChange={(e) => setTalker(e.target.value)}
                className={fieldCls} disabled={kind === "custom"}>
                {TALKERS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>

          {kind === "custom" ? (
            <div>
              <label htmlFor="ng-body" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Body (between $ and *)")}
              </label>
              <input id="ng-body" value={customBody} onChange={(e) => setCustomBody(e.target.value)}
                spellCheck={false} className={fieldCls} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ng-lat" className="text-xs font-medium uppercase tracking-wide text-mute">
                    {t("Latitude (decimal °)")}
                  </label>
                  <input id="ng-lat" value={latText} onChange={(e) => setLatText(e.target.value)}
                    spellCheck={false} inputMode="decimal" className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="ng-lon" className="text-xs font-medium uppercase tracking-wide text-mute">
                    {t("Longitude (decimal °)")}
                  </label>
                  <input id="ng-lon" value={lonText} onChange={(e) => setLonText(e.target.value)}
                    spellCheck={false} inputMode="decimal" className={fieldCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ng-time" className="text-xs font-medium uppercase tracking-wide text-mute">
                    {t("UTC time (hh:mm:ss)")}
                  </label>
                  <input id="ng-time" value={timeText} onChange={(e) => setTimeText(e.target.value)}
                    spellCheck={false} className={fieldCls} />
                </div>
                {kind === "RMC" ? (
                  <div>
                    <label htmlFor="ng-date" className="text-xs font-medium uppercase tracking-wide text-mute">
                      {t("Date (YYYY-MM-DD)")}
                    </label>
                    <input id="ng-date" value={dateText} onChange={(e) => setDateText(e.target.value)}
                      spellCheck={false} className={fieldCls} />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="ng-quality" className="text-xs font-medium uppercase tracking-wide text-mute">
                      {t("Fix quality")}
                    </label>
                    <select id="ng-quality" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className={fieldCls}>
                      {FIX_QUALITIES.map((q) => (
                        <option key={q} value={Number(q.split(" ")[0])}>{q}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {kind === "GGA" ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="ng-sats" className="text-xs font-medium uppercase tracking-wide text-mute">
                      {t("Satellites")}
                    </label>
                    <input id="ng-sats" value={satsText} onChange={(e) => setSatsText(e.target.value)}
                      spellCheck={false} inputMode="numeric" className={fieldCls} />
                  </div>
                  <div>
                    <label htmlFor="ng-hdop" className="text-xs font-medium uppercase tracking-wide text-mute">
                      HDOP
                    </label>
                    <input id="ng-hdop" value={hdopText} onChange={(e) => setHdopText(e.target.value)}
                      spellCheck={false} inputMode="decimal" className={fieldCls} />
                  </div>
                  <div>
                    <label htmlFor="ng-alt" className="text-xs font-medium uppercase tracking-wide text-mute">
                      {t("Altitude (m)")}
                    </label>
                    <input id="ng-alt" value={altText} onChange={(e) => setAltText(e.target.value)}
                      spellCheck={false} inputMode="decimal" className={fieldCls} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ng-speed" className="text-xs font-medium uppercase tracking-wide text-mute">
                      {t("Speed (knots)")}
                    </label>
                    <input id="ng-speed" value={speedText} onChange={(e) => setSpeedText(e.target.value)}
                      spellCheck={false} inputMode="decimal" className={fieldCls} />
                  </div>
                  <div>
                    <label htmlFor="ng-course" className="text-xs font-medium uppercase tracking-wide text-mute">
                      {t("Course (° true)")}
                    </label>
                    <input id="ng-course" value={courseText} onChange={(e) => setCourseText(e.target.value)}
                      spellCheck={false} inputMode="decimal" className={fieldCls} />
                  </div>
                </div>
              )}
            </>
          )}

          {!built.ok && (
            <p className="font-mono text-xs text-err" role="alert">{built.error}</p>
          )}
        </div>

        <div className="space-y-2.5">
          {built.ok && (
            <>
              <ResultCard label={t("Sentence")} value={built.sentence} size="lg" />
              {built.conversions.map((c) => (
                <ResultCard key={c} label={t("Coordinate encoding")} value={c} />
              ))}
              {back && (
                <ResultCard
                  label={t("Decodes back as")}
                  value={`${back.address} · ${back.fields.length} ${t("fields")} · ${t("checksum")} ${back.valid ? "OK" : "FAIL"}`}
                />
              )}
            </>
          )}
        </div>
      </div>

      {built.ok && (
        <p className="mt-4 rounded-btn border border-line-soft px-3 py-2 text-xs text-mute" role="status">
          {t("The checksum is computed here — XOR of every character between $ and * — so an invalid sentence cannot be produced. Coordinates are encoded as degrees and decimal minutes (ddmm.mmmm), which is the field format receivers expect.")}
        </p>
      )}
    </div>
  );
}
