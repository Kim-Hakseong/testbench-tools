// Compile engine + bench-core + this server to CommonJS in dist/ with the
// TypeScript compiler alone (no bundler: CLAUDE.md §4 allows typescript and
// nothing else), then point the two workspace imports at the compiled files.
// tsc keeps `paths` aliases verbatim in its output, so that last step is ours.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const PKG = resolve(import.meta.dirname, "..");
const DIST = join(PKG, "dist");
rmSync(DIST, { recursive: true, force: true });
execFileSync(join(PKG, "node_modules/.bin/tsc"), ["-p", join(PKG, "tsconfig.build.json")], { stdio: "inherit" });

const TARGETS = {
  "@testbench/engine": join(DIST, "engine/src/index.js"),
  "@testbench/bench-core": join(DIST, "bench-core/src/index.js"),
};

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js")) {
      let src = readFileSync(p, "utf8");
      for (const [spec, target] of Object.entries(TARGETS)) {
        let rel = relative(dirname(p), target);
        if (!rel.startsWith(".")) rel = "./" + rel;
        src = src.replaceAll(`require("${spec}")`, `require("${rel}")`);
      }
      writeFileSync(p, src);
    }
  }
}
walk(DIST);
writeFileSync(join(DIST, "package.json"), '{ "type": "commonjs" }\n');
console.log("built", relative(process.cwd(), DIST));
