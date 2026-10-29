// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
let known = /* @__PURE__ */ new Map(),
  pending = /* @__PURE__ */ new Map(),
  discover = !1,
  evaluate = null;
function configure(input = {}) {
  ((known = new Map((input.measurements || []).map((v) => [v.key, v]))),
    (pending = /* @__PURE__ */ new Map()),
    (discover = input.discovery === !0),
    (evaluate = input.evaluator || null));
}
function metricKey(font, text) {
  const m = /^(\d+) ([\d.]+)px (.+)$/.exec(font);
  if (!m) throw Error('Invalid Diorama font: ' + font);
  return JSON.stringify([+m[1], +m[2], m[3], String(text)]);
}
function measureText(font, text) {
  if (evaluate) return evaluate(font, text);
  const key = metricKey(font, text);
  if (known.has(key)) return known.get(key);
  if (!discover) throw Error('Missing native Diorama measurement: ' + key);
  if (!pending.has(key)) {
    const m = JSON.parse(key);
    pending.set(key, { key, text: m[3], weight: m[0], size: m[1], fontFamily: m[2] });
  }
  return { width: 0, advance: 0 };
}
function pendingMeasurements() {
  return Array.from(pending.values());
}
export { configure, measureText, metricKey, pendingMeasurements };
