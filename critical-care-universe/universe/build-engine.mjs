/* Splices the readable case engine (order-catalogue.js, case-pool.js, case-engine.js) into the app bundle.
   Run:  node critical-care-universe/universe/build-engine.mjs   (add --check to verify without writing) */
import fs from "fs";
import crypto from "crypto";
const here = new URL(".", import.meta.url), app = new URL("../assets/app.js", import.meta.url);
const START = "var bp=[{id:`intensivist`", END = "var Fp=`ABCDEFGH";
const read = (f) => fs.readFileSync(new URL(f, here), "utf8");
const strip = (s) => s.replace(/^import .*$/gm, "").replace(/^export \{[^}]*\};?$/gm, "").replace(/^export (const|function|class|let|var) /gm, "$1 ");

export function buildSegment(oldSegment) {
  const cut = ["function Ep(", "/*ccu-engine:"].map((m) => oldSegment.indexOf(m)).filter((i) => i >= 0)[0];
  const header = oldSegment.slice(0, cut);
  const body = [strip(read("order-catalogue.js")), strip(read("case-pool.js")), strip(read("case-engine.js"))].join("\n");
  const sig = crypto.createHash("sha1").update(body).digest("hex").slice(0, 12);
  return `${header}/*ccu-engine:${sig}*/var __ccuEngine=(()=>{${body}\nreturn {Dp,Np,Pp,Op,mdtHour,CASES,eligibleCases,caseWeights,pickCase,COVER,BY_ID,CATALOGUE,canon,labelOf,specName};})();var Dp=__ccuEngine.Dp,Np=__ccuEngine.Np,Pp=__ccuEngine.Pp,Op=__ccuEngine.Op,mdtHour=__ccuEngine.mdtHour;`;
}
if (process.argv[1] && process.argv[1].endsWith("build-engine.mjs")) {
  const s = fs.readFileSync(app, "utf8"), a = s.indexOf(START), b = s.indexOf(END);
  if (a < 0 || b < 0) throw new Error("engine markers not found in app.js");
  const next = buildSegment(s.slice(a, b));
  if (process.argv.includes("--check")) { console.log(s.slice(a, b) === next ? "engine in app.js is current" : "engine in app.js is STALE"); process.exit(s.slice(a, b) === next ? 0 : 1); }
  fs.writeFileSync(app, s.slice(0, a) + next + s.slice(b));
  console.log("engine spliced:", next.length, "bytes");
}
