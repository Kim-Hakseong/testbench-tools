// The usage counter. This is the entire server side of the site.
//
// The client sends navigator.sendBeacon("/hit", "<tool-slug>") once per page
// load, on the first real interaction with a tool. The body is the slug and
// nothing else — no input values, no identifiers, no cookies — so what lands
// here is "crc-32 was used once", which cannot be traced back to anyone even
// by us. That is the deal recorded in CLAUDE.md §4 and on the privacy page.
//
// Counts go to Workers Analytics Engine (free tier, ~90-day retention).
// Reading them back needs the SQL API:
//
//   curl -s "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql" \
//     -H "Authorization: Bearer <API_TOKEN>" \
//     -d "SELECT blob1 AS tool, SUM(_sample_interval) AS uses
//         FROM testbench_tool_usage WHERE timestamp > NOW() - INTERVAL '7' DAY
//         GROUP BY tool ORDER BY uses DESC"
//
// GET/HEAD requests never reach this script — the static assets answer them —
// so this only ever sees the beacon's POSTs and stray probes.

/** Same shape the catalogue enforces; anything else is a probe, not a tool. */
const SLUG = /^[a-z0-9-]{1,64}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/hit") {
      const slug = (await request.text()).trim();
      if (SLUG.test(slug)) {
        // Non-blocking by design: a lost data point is preferable to making
        // any user wait on telemetry.
        env.TOOL_USAGE?.writeDataPoint({
          blobs: [slug],
          doubles: [1],
          indexes: [slug],
        });
      }

      // 204 either way. A probe learns nothing from the response, and the
      // beacon never reads it.
      return new Response(null, { status: 204 });
    }

    return new Response("Not found", { status: 404 });
  },
};
