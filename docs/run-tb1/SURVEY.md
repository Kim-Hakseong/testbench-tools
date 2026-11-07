# RUN-TB1 §1 — 현황 파악

조사 시점: 2026-11-07, 기준 커밋 811a1c0 (main). 이 문서는 조사 결과만 담는다. 쓰기 작업은 §2부터다.

## 저장소·빌드

| 항목 | 내용 | 라벨 |
|---|---|---|
| 구조 | pnpm 워크스페이스: `apps/web`(사이트), `packages/engine`(계산 엔진), `worker/`(사용 카운터 Worker), `scripts/`(수집·빌드 보조) | confirmed |
| 패키지 매니저 | pnpm 9.15.9 (`packageManager` 필드) | confirmed |
| 프레임워크 | Next.js 14.2.30 App Router, `output: "export"`(정적), `trailingSlash: true` | confirmed |
| 스타일 | Tailwind 3.4, 토큰은 CSS 변수(`--tb-*`) → `tailwind.config.ts` | confirmed |
| 테스트 | vitest 2.1.9 (`packages/engine`, 22개 파일 697 테스트, 골든 벡터 `packages/engine/vectors/*.json`) | confirmed |
| 빌드 | `pnpm build` = `make-lastmod.mjs` → `next build`. 게이트 스크립트 `check-tool-i18n.mjs`, `check-og.mjs` | confirmed |
| 호스팅 | Cloudflare Workers 정적 자산 + Worker 1개(`wrangler.jsonc`), main push 시 자동 배포 | confirmed |
| 의존성 정책 | CLAUDE.md §4: next, react(-dom), tailwind(+peer), vitest, typescript 계열만 허용, 그 외 추가 금지 | confirmed |

## 툴 구현 패턴

- 툴 페이지 = `apps/web/app/(en)/tools/<slug>/page.tsx`(서버 컴포넌트: 메타데이터·AEO 본문·FAQ) + `apps/web/components/tool/<Name>Tool.tsx`(클라이언트 위젯).
- 계산은 전부 `packages/engine/src/*.ts`의 순수 함수다(DOM·네트워크 없음). 위젯이 하는 일은 입력 파싱(hex/ASCII 텍스트 → 바이트), 엔진 호출, 결과 포맷(hex 문자열·소수 자리)뿐이다.
- 예외는 없다: 58개 페이지 위젯 모두 엔진 import로 계산한다. 무거운 탐색(CRC identifier의 전수 탐색)만 Web Worker(`apps/web/workers/crc-search.worker.ts`)에서 같은 엔진 함수를 돌린다.
- 툴 수: 허브에 노출되는 툴 **57개**(RUN-TB1 작성 시점 56개 + 11-07 신설 frame-workbench) + 허브 비노출 보조 페이지 1개(`ascii-to-hex`, `hubHidden: true`, hex-to-ascii와 같은 위젯) = **페이지 58개**. 아래 표는 페이지 기준.
- 한국어 전용 툴 페이지 5개(`apps/web/app/(ko)/ko/tools/`: pt100, 4-20ma, adc, bcd, plc-analog-scaling)는 같은 위젯을 쓰는 한국어 판이다.

## 메타데이터·다국어·분석

| 항목 | 위치 | 라벨 |
|---|---|---|
| 카테고리·툴 카탈로그 | `apps/web/content/tools-meta.ts` (`CATEGORIES` 8개, `TOOLS`) | confirmed |
| 사이트 크롬 문자열 | `apps/web/content/i18n.ts` (`CHROME`, `CATEGORY_NAMES`, `CARD_DESC`, `APP_DESC` 등, 5개 언어) | confirmed |
| 툴 위젯 문자열 | `apps/web/content/tool-i18n/*.ts` — 영어 원문을 키로 쓰는 사전, `useToolText()`로 방문자 언어 적용. `check-tool-i18n.mjs`가 누락 검사 | confirmed |
| 언어 라우트 | 영어 루트 + `/ko/ /ja/ /de/ /zh/` (허브·about·contact·privacy·apps). 툴 본문 페이지는 영어(+ko 5개) | confirmed |
| 분석 | ① Cloudflare Web Analytics(쿠키 없는 RUM, 페이지뷰·리퍼러) ② 1st-party 사용 카운터 `sendBeacon("/hit", slug)` → Worker → Analytics Engine(툴 첫 상호작용 1회, 슬러그만) ③ 오프라인 수집 GSC·Bing Webmaster(`scripts/pulse.mjs`, `monthly.mjs`) | confirmed |
| 커스텀 이벤트 | 없음. CF Web Analytics는 커스텀 이벤트를 받지 않고, 비콘은 CLAUDE.md §4 결정으로 "툴 슬러그만" 보낸다 | confirmed |

## 툴별 — 순수 함수 분리 가능 여부

전부 **confirmed**: 각 위젯이 import하는 엔진 함수가 계산 전부를 하고, 위젯 코드는 입력 파싱·포맷만 한다(위젯을 열어 확인). 분리 불가 툴 없음.

| # | 툴 (slug) | 카테고리 | UI 컴포넌트 (줄) | 사용하는 엔진 함수 (packages/engine) | 순수 함수 분리 |
|---|---|---|---|---|---|
| 1 | 4-20ma-scaling | plc-industrial | FourTwentyTool (132) | `scale` `scaleCurrent` | confirmed |
| 2 | ab-slc-address-converter | plc-industrial | AbAddressTool (114) | `AB_DEFAULT_FILES` `AB_TYPE_NAME` `abDefaultFile` `abFlatBitIndex` `formatAbAddress` `parseAbAddress` | confirmed |
| 3 | adc-calculator | sensor-signal | AdcTool (132) | `adcToVoltage` `voltageToAdc` | confirmed |
| 4 | arinc-429-builder | avionics-databus | Arinc429BuilderTool (201) | `buildArinc429` `parseArinc429` `SSM_BCD` `SSM_BNR` `SSM_DISCRETE` | confirmed |
| 5 | arinc-429-decoder | avionics-databus | Arinc429Tool (223) | `applyBnrScale` `parseArinc429` `ssmMeaning` | confirmed |
| 6 | ascii-to-hex | data-converters | HexAsciiTool (74) | `asciiToBytes` `bytesToAscii` `bytesToHex` `parseHex` | confirmed |
| 7 | bcd-converter | plc-industrial | BcdTool (124) | `bcdToDecimal` `decimalToBcd` | confirmed |
| 8 | bit-field-extractor | embedded-mcu | BitFieldTool (140) | `extractFields` | confirmed |
| 9 | can-bit-timing | embedded-mcu | CanBitTimingTool (97) | `canBitTiming` | confirmed |
| 10 | can-frame-decoder | protocol-decoders | CanFrameTool (94) | `analyzeCanFrame` `bytesToHex` `parseHex` | confirmed |
| 11 | crc-16-ccitt | checksum-crc | CrcTool (108) | `asciiToBytes` `bytesToHex` `crc` `crcBytes` `getPreset` `parseHex` | confirmed |
| 12 | crc-16-modbus | checksum-crc | CrcTool (108) | `asciiToBytes` `bytesToHex` `crc` `crcBytes` `getPreset` `parseHex` | confirmed |
| 13 | crc-32 | checksum-crc | CrcTool (108) | `asciiToBytes` `bytesToHex` `crc` `crcBytes` `getPreset` `parseHex` | confirmed |
| 14 | crc-8 | checksum-crc | CrcTool (108) | `asciiToBytes` `bytesToHex` `crc` `crcBytes` `getPreset` `parseHex` | confirmed |
| 15 | crc-identifier | checksum-crc | CrcIdentifierTool (298) | `asciiToBytes` `identifyFromCatalog` `matchPresetName` `parseHex` | confirmed |
| 16 | csv-waveform-plotter | file-tools | CsvPlotterTool (172) | `parseCsvNumeric` | confirmed |
| 17 | custom-crc | checksum-crc | CustomCrcTool (182) | `asciiToBytes` `bytesToHex` `crc` `crcBytes` `CRC_PRESETS` `parseHex` | confirmed |
| 18 | db-dbm | sensor-signal | DbDbmTool (146) | `dbFromPowerRatio` `dbFromVoltageRatio` `dbmFromWatts` `powerRatioFromDb` `voltageRatioFromDb` `vrmsFromPower` `wattsFromDbm` | confirmed |
| 19 | endianness-converter | data-converters | EndiannessTool (63) | `bytesToHex` `parseHex` `reverseBytes` `swapBytesInWords` `swapWords` | confirmed |
| 20 | frame-workbench | protocol-decoders | FrameWorkbenchTool (402) | `FRAME_CHECKSUM_PRESETS` `FRAME_FIELD_TYPES` `checksumByteCount` `decodeFrame` `decodeLayout` `encodeLayout` `ftprojToLayout` `layoutToFtproj` `parseHex` `validateLayout` | confirmed |
| 21 | hex-file-viewer | file-tools | HexViewerTool (83) | `hexDumpLines` | confirmed |
| 22 | hex-srec-bin | file-tools | HexSrecBinTool (187) | `parseIntelHex` `parseSrec` `segmentsToBin` `toIntelHex` `toSrec` | confirmed |
| 23 | hex-to-ascii | data-converters | HexAsciiTool (74) | `asciiToBytes` `bytesToAscii` `bytesToHex` `parseHex` | confirmed |
| 24 | i2c-pullup | embedded-mcu | I2cPullupTool (93) | `i2cPullup` `nearestValue` | confirmed |
| 25 | ieee-754-float | data-converters | FloatConverterTool (160) | `float32ToRegisters` `registersToFloat32` `WORD_ORDERS` | confirmed |
| 26 | loop-burden | plc-industrial | LoopBurdenTool (85) | `loopBudget` | confirmed |
| 27 | ls-xgt-address-converter | plc-industrial | XgtAddressTool (109) | `formatXgtAddress` `parseXgtAddress` `XGT_DEVICES` `xgtFlatBitIndex` `xgtNextBits` | confirmed |
| 28 | mc-protocol-decoder | protocol-decoders | McProtocolTool (159) | `parseMcFrame` | confirmed |
| 29 | measurement-accuracy | sensor-signal | AccuracyTool (435) | `formatSpec` `halfDigitMaxCounts` `instrumentPreset` `INSTRUMENT_PRESETS` `measurementAccuracy` | confirmed |
| 30 | mil-1553-command-word | avionics-databus | Mil1553CommandTool (126) | `decodeCommandWord` `encodeCommandWord` | confirmed |
| 31 | mil-1553-message-decoder | avionics-databus | Mil1553MessageTool (94) | `decodeMessage` | confirmed |
| 32 | mil-1553-mode-codes | avionics-databus | Mil1553ModeCodesTool (67) | `MODE_CODES` | confirmed |
| 33 | mil-1553-status-word | avionics-databus | Mil1553StatusTool (85) | `decodeStatusWord` | confirmed |
| 34 | mitsubishi-address-converter | plc-industrial | MelsecAddressTool (142) | `convertSeries` `deviceRadix` `MELSEC_SERIES` `nextAddresses` `parseMelsecAddress` `radixBase` | confirmed |
| 35 | modbus-address-converter | plc-industrial | ModbusAddressTool (92) | `ENTITY_LABEL` `modbusAddressViews` `parseDataModelAddress` | confirmed |
| 36 | modbus-frame-decoder | protocol-decoders | ModbusDecoderTool (171) | `bytesToHex` `decodeModbus` `parseHex` `sniff` | confirmed |
| 37 | nmea-0183-decoder | protocol-decoders | NmeaDecoderTool (89) | `checksumHex` `NMEA_FIELD_LABELS` `parseNmea` | confirmed |
| 38 | nmea-0183-generator | protocol-decoders | NmeaGeneratorTool (275) | `buildNmea` `nmeaDate` `nmeaLatitude` `nmeaLongitude` `nmeaTime` `parseNmea` | confirmed |
| 39 | nmea-checksum | checksum-crc | NmeaChecksumTool (69) | `buildNmea` `checksumHex` `parseNmea` | confirmed |
| 40 | ntc-thermistor-calculator | sensor-signal | ThermistorTool (716) | `NTC_REFERENCE_CURVES` `ntcBetaFromTwoPoints` `ntcBetaLabel` `ntcBetaResistance` `ntcBetaTemperature` `ntcCheckAgainstTable` `ntcDividerReading` `ntcFitSteinhartHart` `ntcModelDeviation` `ntcSteinhartResistance` `ntcSteinhartTemperature` `ntcSweepTemperatures` | confirmed |
| 41 | number-base-converter | data-converters | NumberBaseTool (80) | `formatInBase` `parseInBase` | confirmed |
| 42 | plc-analog-scaling | plc-industrial | PlcScalingTool (183) | `ANALOG_PRESETS` `scale` | confirmed |
| 43 | pt100-calculator | sensor-signal | Pt100Tool (136) | `rtdResistance` `rtdTemperature` | confirmed |
| 44 | q-format | data-converters | QFormatTool (148) | `decodeQ` `encodeQ` `qInfo` | confirmed |
| 45 | rms-peak | sensor-signal | RmsPeakTool (77) | `sineLevels` | confirmed |
| 46 | s7-address-converter | plc-industrial | S7AddressTool (194) | `absoluteBitIndex` `allocate` `byteSpan` `collidingAddresses` `coveredBytes` `formatS7` `overlaps` `parseS7Address` `widthBytes` | confirmed |
| 47 | signal-converter | plc-industrial | SignalConverterTool (98) | `scale` | confirmed |
| 48 | stm32-timer | embedded-mcu | TimerCalcTool (86) | `timerSolutions` | confirmed |
| 49 | struct-padding | embedded-mcu | StructPaddingTool (114) | `layoutStruct` `parseStructBody` | confirmed |
| 50 | tdms-to-csv | file-tools | TdmsToCsvTool (202) | `TdmsParser` `tdmsToCsv` `tdmsTypeName` | confirmed |
| 51 | tdms-viewer | file-tools | TdmsViewerTool (130) | `TdmsParser` `tdmsTypeName` | confirmed |
| 52 | thermocouple-calculator | sensor-signal | ThermocoupleTool (230) | `tcTemperature` `tcVoltage` `tcWithColdJunction` `THERMOCOUPLE_TYPES` | confirmed |
| 53 | two-point-calibration | plc-industrial | TwoPointCalTool (90) | `applyCal` `invertCal` `twoPointCal` | confirmed |
| 54 | twos-complement | data-converters | TwosComplementTool (111) | `fromSigned` `toSigned` | confirmed |
| 55 | uart-baud-error | embedded-mcu | UartBaudTool (114) | `uartBaudError` | confirmed |
| 56 | voltage-divider | sensor-signal | VoltageDividerTool (141) | `dividerOptions` `dividerVout` | confirmed |
| 57 | xgt-cnet-builder | plc-industrial | XgtCnetBuilderTool (163) | `buildXgtFrame` | confirmed |
| 58 | xgt-cnet-decoder | plc-industrial | XgtCnetDecoderTool (150) | `parseXgtFrame` `xgtDataTypeName` | confirmed |
