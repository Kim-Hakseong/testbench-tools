import type { SiteLocale } from "@/content/i18n";

/**
 * /mcp page copy. Commands, tool names and JSON stay in English in every
 * locale — they are what the reader types.
 */
export interface McpStrings {
  nav: string;
  metaTitle: string;
  metaDesc: string;
  h1: string;
  lead: string;
  stateless: string;
  installH: string;
  remoteLabel: string;
  localLabel: string;
  remoteNote: string;
  configH: string;
  configNote: string;
  examplesH: string;
  examplesLead: string;
  youAsk: string;
  toolCalled: string;
  toolReturns: string;
  listH: string;
  listLead: string;
}

export const MCP_PAGE: Record<SiteLocale, McpStrings> = {
  en: {
    nav: "MCP",
    metaTitle: "TestBench.tools MCP server — CRC, protocol, PLC and sensor tools inside Claude",
    metaDesc: "Use TestBench.tools calculators from Claude Code and other MCP clients: CRCs, Modbus/NMEA/CAN frames, MIL-STD-1553, ARINC 429, PLC addresses, RTD and thermocouple maths. Stateless — inputs are never stored.",
    h1: "TestBench.tools in your AI assistant",
    lead: "Every calculator on this site is also an MCP server, so Claude Code — or any MCP client — can call the same tested functions directly instead of doing the arithmetic in its head.",
    stateless: "100% stateless: each call is computed and discarded. Inputs are not stored, not logged and not used for anything else — the server has no storage to put them in.",
    installH: "Install in one line",
    remoteLabel: "Remote (nothing to install)",
    localLabel: "Local (runs on your machine, works offline)",
    remoteNote: "The local server needs Node.js 18 or newer. Nothing leaves your computer when you use it.",
    configH: "Or add it to a project's .mcp.json",
    configNote: "Commit this file and everyone who opens the project in Claude Code gets the tools.",
    examplesH: "Three things to ask",
    examplesLead: "Each result below was produced by the tool itself when this page was built — not typed in by hand.",
    youAsk: "You ask",
    toolCalled: "Tool called",
    toolReturns: "Returns",
    listH: "All tools",
    listLead: "Names are prefixed by area. Each one mirrors the page of the same name on this site.",
  },
  ko: {
    nav: "MCP",
    metaTitle: "TestBench.tools MCP 서버 — Claude 안에서 쓰는 CRC·프로토콜·PLC·센서 툴",
    metaDesc: "Claude Code 등 MCP 클라이언트에서 TestBench.tools 계산기를 바로 호출: CRC, Modbus/NMEA/CAN 프레임, MIL-STD-1553, ARINC 429, PLC 주소, RTD·열전대 계산. 무상태 — 입력은 저장되지 않습니다.",
    h1: "AI 어시스턴트 안의 TestBench.tools",
    lead: "이 사이트의 모든 계산기는 MCP 서버로도 제공됩니다. Claude Code나 다른 MCP 클라이언트가 계산을 추측하지 않고, 검증된 같은 함수를 직접 호출합니다.",
    stateless: "100% 무상태: 호출은 계산 후 바로 버려집니다. 입력은 저장·기록되지 않고 다른 용도로 쓰이지 않습니다 — 서버에 저장 공간 자체가 없습니다.",
    installH: "한 줄로 설치",
    remoteLabel: "원격 (설치 불필요)",
    localLabel: "로컬 (내 컴퓨터에서 실행, 오프라인 동작)",
    remoteNote: "로컬 서버는 Node.js 18 이상이 필요합니다. 사용 중 어떤 데이터도 컴퓨터 밖으로 나가지 않습니다.",
    configH: "또는 프로젝트의 .mcp.json 에 추가",
    configNote: "이 파일을 커밋하면 Claude Code로 프로젝트를 여는 모든 사람이 툴을 쓸 수 있습니다.",
    examplesH: "이렇게 물어보세요",
    examplesLead: "아래 결과는 이 페이지를 빌드할 때 툴이 직접 계산한 값입니다. 손으로 적은 값이 아닙니다.",
    youAsk: "질문",
    toolCalled: "호출된 툴",
    toolReturns: "결과",
    listH: "전체 툴",
    listLead: "이름 앞부분은 분야입니다. 각 툴은 이 사이트의 같은 이름 페이지와 같은 계산을 합니다.",
  },
  ja: {
    nav: "MCP",
    metaTitle: "TestBench.tools MCP サーバー — Claude で使える CRC・プロトコル・PLC・センサーツール",
    metaDesc: "Claude Code などの MCP クライアントから TestBench.tools の計算機を直接呼び出し：CRC、Modbus/NMEA/CAN フレーム、MIL-STD-1553、ARINC 429、PLC アドレス、RTD・熱電対計算。ステートレス — 入力は保存されません。",
    h1: "AI アシスタントの中の TestBench.tools",
    lead: "このサイトのすべての計算機は MCP サーバーとしても提供されます。Claude Code などの MCP クライアントが、暗算ではなく、検証済みの同じ関数を直接呼び出します。",
    stateless: "100% ステートレス：各呼び出しは計算後すぐに破棄されます。入力は保存・記録されず、他の目的にも使われません — サーバーには保存先自体がありません。",
    installH: "1 行でインストール",
    remoteLabel: "リモート（インストール不要）",
    localLabel: "ローカル（自分のマシンで実行、オフライン動作）",
    remoteNote: "ローカルサーバーには Node.js 18 以上が必要です。使用中、データがコンピューターの外に出ることはありません。",
    configH: "またはプロジェクトの .mcp.json に追加",
    configNote: "このファイルをコミットすれば、Claude Code でプロジェクトを開く全員がツールを使えます。",
    examplesH: "こう聞いてください",
    examplesLead: "以下の結果は、このページのビルド時にツール自身が計算したものです。手で書いた値ではありません。",
    youAsk: "質問",
    toolCalled: "呼び出されたツール",
    toolReturns: "結果",
    listH: "全ツール",
    listLead: "名前の先頭は分野です。各ツールはこのサイトの同名ページと同じ計算をします。",
  },
  de: {
    nav: "MCP",
    metaTitle: "TestBench.tools MCP-Server — CRC-, Protokoll-, SPS- und Sensor-Tools in Claude",
    metaDesc: "TestBench.tools-Rechner direkt aus Claude Code und anderen MCP-Clients: CRCs, Modbus/NMEA/CAN-Frames, MIL-STD-1553, ARINC 429, SPS-Adressen, RTD- und Thermoelement-Rechnung. Zustandslos — Eingaben werden nie gespeichert.",
    h1: "TestBench.tools in Ihrem KI-Assistenten",
    lead: "Jeder Rechner dieser Seite ist auch ein MCP-Server: Claude Code oder jeder andere MCP-Client ruft dieselben getesteten Funktionen direkt auf, statt im Kopf zu rechnen.",
    stateless: "100 % zustandslos: Jeder Aufruf wird berechnet und verworfen. Eingaben werden weder gespeichert noch protokolliert noch anderweitig verwendet — der Server hat gar keinen Speicher dafür.",
    installH: "Installation in einer Zeile",
    remoteLabel: "Remote (keine Installation)",
    localLabel: "Lokal (läuft auf Ihrem Rechner, auch offline)",
    remoteNote: "Der lokale Server braucht Node.js 18 oder neuer. Bei der Nutzung verlassen keine Daten Ihren Computer.",
    configH: "Oder in die .mcp.json eines Projekts eintragen",
    configNote: "Committen Sie die Datei, und jeder, der das Projekt in Claude Code öffnet, hat die Tools.",
    examplesH: "Drei Fragen zum Ausprobieren",
    examplesLead: "Jedes Ergebnis unten hat das Tool selbst beim Erstellen dieser Seite berechnet — nicht von Hand eingetragen.",
    youAsk: "Sie fragen",
    toolCalled: "Aufgerufenes Tool",
    toolReturns: "Ergebnis",
    listH: "Alle Tools",
    listLead: "Das Präfix nennt den Bereich. Jedes Tool rechnet wie die gleichnamige Seite dieser Website.",
  },
  zh: {
    nav: "MCP",
    metaTitle: "TestBench.tools MCP 服务器 — 在 Claude 中使用 CRC、协议、PLC 与传感器工具",
    metaDesc: "在 Claude Code 等 MCP 客户端中直接调用 TestBench.tools 计算器：CRC、Modbus/NMEA/CAN 帧、MIL-STD-1553、ARINC 429、PLC 地址、RTD 与热电偶计算。无状态 — 输入从不保存。",
    h1: "AI 助手里的 TestBench.tools",
    lead: "本站的每个计算器同时也是 MCP 服务器：Claude Code 或任何 MCP 客户端都能直接调用同一套经过测试的函数，而不是靠心算。",
    stateless: "100% 无状态：每次调用计算完即丢弃。输入不保存、不记录，也不用于任何其他用途 — 服务器根本没有存储空间。",
    installH: "一行安装",
    remoteLabel: "远程（无需安装）",
    localLabel: "本地（在你的电脑上运行，可离线）",
    remoteNote: "本地服务器需要 Node.js 18 或更高版本。使用时没有任何数据离开你的电脑。",
    configH: "或加入项目的 .mcp.json",
    configNote: "提交此文件后，任何用 Claude Code 打开该项目的人都能使用这些工具。",
    examplesH: "可以这样问",
    examplesLead: "以下每个结果都是构建本页时由工具本身计算得出的，而不是手写的。",
    youAsk: "提问",
    toolCalled: "调用的工具",
    toolReturns: "返回",
    listH: "全部工具",
    listLead: "名称前缀表示领域。每个工具与本站同名页面的计算相同。",
  },
};

/** Where the remote server will live. Replaced at deploy time — see docs/run-tb1/DEPLOY.md. */
export const MCP_REMOTE_URL = "https://mcp.testbench.tools/mcp";
export const MCP_LOCAL_PACKAGE = "@testbench-tools/mcp";
