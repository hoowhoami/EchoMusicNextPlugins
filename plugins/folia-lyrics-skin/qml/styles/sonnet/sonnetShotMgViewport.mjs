// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const resolveSonnetShotMgBleed = (width, height, radius) => ({
  x: Math.max(radius * 0.92, width * 0.64),
  y: Math.max(radius * 0.92, height * 0.64),
});
export { resolveSonnetShotMgBleed };
