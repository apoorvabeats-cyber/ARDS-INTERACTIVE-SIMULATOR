/* Whole-body patient model (front view, patient's right on the viewer's left). Every lab lights the regions its disease reaches. */
const P = (id, d, cls) => `<path id="b-${id}" class="rg ${cls || ""}" d="${d}"/>`;
const E = (id, cx, cy, rx, ry, cls) => `<ellipse id="b-${id}" class="rg ${cls || ""}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const mirror = (d) => d.replace(/([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g, (m, c, x, y) => `${c}${200 - +x} ${y}`);

export function bodySVG() {
  const armR = "M56 88 L44 92 L28 188 L25 254 L39 256 L51 198 L62 142 Z", legR = "M62 254 L99 254 L97 332 L95 442 L78 444 L72 342 Z";
  const armL = armR.replace(/([ML])(\d+) (\d+)/g, (m, c, x, y) => `${c}${200 - x} ${y}`), legL = legR.replace(/([ML])(\d+) (\d+)/g, (m, c, x, y) => `${c}${200 - x} ${y}`);
  return `<svg class="body" viewBox="0 0 200 462" role="img" aria-label="Whole-body patient model">
<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
${P("face-R", "M100 12 A26 26 0 0 0 100 64 Z")}${P("face-L", "M100 12 A26 26 0 0 1 100 64 Z")}
${P("neck", "M92 64 L108 64 L110 80 L90 80 Z")}
${P("chest", "M58 84 Q100 70 142 84 L145 160 L55 160 Z")}${P("abdomen", "M55 160 L145 160 Q142 206 138 254 L62 254 Q58 206 55 160 Z")}
${P("arm-R", armR)}${P("arm-L", armL)}${P("leg-R", legR)}${P("leg-L", legL)}
<g id="organs">
${E("brain", 100, 36, 17, 14, "org")}
${E("lung-R", 80, 119, 15, 29, "org")}${E("lung-L", 120, 119, 15, 29, "org")}
${P("heart", "M100 112 Q110 104 119 112 Q123 126 108 144 Q96 130 100 112 Z", "org")}
${E("liver", 78, 166, 21, 9, "org")}
${E("bowel", 100, 219, 27, 13, "org")}
${P("pancreas", "M84 182 Q96 172 108 178 Q120 184 130 176 Q132 184 122 190 Q106 192 96 190 Q86 192 84 182 Z", "org")}
${E("kidney-R", 80, 196, 6, 12, "org")}${E("kidney-L", 120, 196, 6, 12, "org")}${E("bladder", 100, 238, 8, 7, "org")}
${P("veins-R", "M82 262 Q80 330 82 420", "ven")}${P("veins-L", "M118 262 Q120 330 118 420", "ven")}
</g>
<g id="marks" class="marks"><path id="mk-gaze" d="M88 34 L74 34 M74 34 L79 30 M74 34 L79 38" class="mk"/><path id="mk-pain" d="M126 96 Q150 110 150 150 Q146 190 134 200" class="mk pain"/>
<text id="mk-speech" x="100" y="6" text-anchor="middle" class="mt">SPEECH</text><text id="mk-neglect" x="150" y="40" class="mt">NEGLECT</text><text id="mk-field" x="150" y="52" class="mt">FIELD</text></g>
<text x="14" y="14" class="lr">PT RIGHT</text><text x="186" y="14" text-anchor="end" class="lr">PT LEFT</text></svg>`;
}
/* map: { regionId: level }  level 0..3 = none, mild, moderate, severe; "rec:n" = recovering (green), "info" = highlighted. marks: { gaze:'R'|'L'|null, speech, neglect, field, pain } */
export function paintBody(root, map, marks) {
  root.querySelectorAll(".rg").forEach((el) => { el.setAttribute("class", "rg" + (el.id.match(/brain|lung|heart|pancreas|kidney|bladder|liver|bowel/) ? " org" : "")); });
  root.querySelectorAll(".ven").forEach((el) => el.setAttribute("class", "ven"));
  Object.entries(map || {}).forEach(([id, v]) => { const el = root.querySelector("#b-" + id); if (!el) return; const cls = typeof v === "string" ? v : "l" + v; el.classList.add(...cls.split(" ")); });
  const mk = marks || {}, set = (id, on) => { const el = root.querySelector("#mk-" + id); if (el) el.style.opacity = on ? 1 : 0; };
  set("gaze", !!mk.gaze); set("speech", !!mk.speech); set("neglect", !!mk.neglect); set("field", !!mk.field); set("pain", !!mk.pain);
  const g = root.querySelector("#mk-gaze"); if (g) g.setAttribute("transform", mk.gaze === "L" ? "translate(200 0) scale(-1 1)" : "");
  const sp = root.querySelector("#mk-speech"); if (sp && mk.speech) sp.textContent = mk.speech; const ng = root.querySelector("#mk-neglect"); if (ng && mk.neglect) ng.textContent = mk.neglect; const fd = root.querySelector("#mk-field"); if (fd && mk.field) fd.textContent = mk.field;
}
