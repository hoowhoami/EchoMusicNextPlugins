// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key != 'symbol' ? key + '' : key, value);
const opensOwnPath = (cmd) => {
  if (cmd.type === 'fill') return !0;
  if (cmd.length <= 0) return !1;
  const first = cmd.path.find((p) => p.type !== 'rect_hint');
  return (first == null ? void 0 : first.type) === 'moveTo';
};
class AnimatedGraphics {
  constructor(pixi) {
    __publicField(this, 'display');
    __publicField(this, 'commands', []);
    __publicField(this, 'currentPath', []);
    __publicField(this, 'currentLength', 0);
    __publicField(this, 'lastX', 0);
    __publicField(this, 'lastY', 0);
    __publicField(this, 'staggerScheduled', !1);
    __publicField(this, 'drawnProgress', Number.NaN);
    __publicField(this, 'drawnCommandCount', -1);
    this.display = new pixi.Graphics();
  }
  get rotation() {
    return this.display.rotation;
  }
  set rotation(v) {
    this.display.rotation = v;
  }
  get mask() {
    return this.display.mask;
  }
  set mask(v) {
    this.display.mask = v;
  }
  moveTo(x, y) {
    return (
      this.currentPath.push({ type: 'moveTo', x, y }),
      (this.lastX = x),
      (this.lastY = y),
      this
    );
  }
  lineTo(x, y) {
    const len = Math.hypot(x - this.lastX, y - this.lastY);
    return (
      this.currentPath.push({ type: 'lineTo', x, y, len, lastX: this.lastX, lastY: this.lastY }),
      (this.currentLength += len),
      (this.lastX = x),
      (this.lastY = y),
      this
    );
  }
  quadraticCurveTo(cx, cy, tx, ty) {
    const len = Math.hypot(cx - this.lastX, cy - this.lastY) + Math.hypot(tx - cx, ty - cy);
    return (
      this.currentPath.push({
        type: 'quadraticCurveTo',
        cx,
        cy,
        tx,
        ty,
        len,
        lastX: this.lastX,
        lastY: this.lastY,
      }),
      (this.currentLength += len),
      (this.lastX = tx),
      (this.lastY = ty),
      this
    );
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, tx, ty) {
    const len =
      Math.hypot(c1x - this.lastX, c1y - this.lastY) +
      Math.hypot(c2x - c1x, c2y - c1y) +
      Math.hypot(tx - c2x, ty - c2y);
    return (
      this.currentPath.push({
        type: 'bezierCurveTo',
        c1x,
        c1y,
        c2x,
        c2y,
        tx,
        ty,
        len,
        lastX: this.lastX,
        lastY: this.lastY,
      }),
      (this.currentLength += len),
      (this.lastX = tx),
      (this.lastY = ty),
      this
    );
  }
  arc(cx, cy, r, start, end, anticlockwise = !1) {
    let diff = end - start;
    anticlockwise && diff > 0
      ? (diff -= Math.PI * 2)
      : !anticlockwise && diff < 0 && (diff += Math.PI * 2);
    const len = Math.abs(diff) * r;
    return (
      this.currentPath.push({ type: 'arc', cx, cy, r, start, end, anticlockwise, len, diff }),
      (this.currentLength += len),
      (this.lastX = cx + Math.cos(end) * r),
      (this.lastY = cy + Math.sin(end) * r),
      this
    );
  }
  circle(x, y, r) {
    const start = Math.random() * Math.PI * 2,
      anticlockwise = Math.random() > 0.5,
      diff = anticlockwise ? -Math.PI * 2 : Math.PI * 2,
      len = Math.PI * 2 * r,
      startX = x + Math.cos(start) * r,
      startY = y + Math.sin(start) * r;
    return (
      this.moveTo(startX, startY),
      this.currentPath.push({
        type: 'arc',
        cx: x,
        cy: y,
        r,
        start,
        end: start + diff,
        anticlockwise,
        len,
        diff,
      }),
      (this.currentLength += len),
      (this.lastX = x + Math.cos(start + diff) * r),
      (this.lastY = y + Math.sin(start + diff) * r),
      this
    );
  }
  rect(x, y, w, h) {
    return (
      this.currentPath.push({ type: 'rect_hint', x, y, w, h }),
      this.moveTo(x, y)
        .lineTo(x + w, y)
        .lineTo(x + w, y + h)
        .lineTo(x, y + h)
        .lineTo(x, y),
      this
    );
  }
  stroke(options) {
    return (
      this.currentPath.length > 0 &&
        (this.commands.push({
          type: 'stroke',
          path: [...this.currentPath],
          length: this.currentLength,
          options,
        }),
        (this.currentPath = []),
        (this.currentLength = 0)),
      this
    );
  }
  fill(options) {
    return (
      this.currentPath.length > 0 &&
        (this.commands.push({
          type: 'fill',
          path: [...this.currentPath],
          length: this.currentLength,
          options,
        }),
        (this.currentPath = []),
        (this.currentLength = 0)),
      this
    );
  }
  scheduleStagger() {
    const GOLDEN = 0.6180339887498949;
    let strokeIndex = 0,
      fillIndex = 0;
    for (const cmd of this.commands) {
      const isStroke = cmd.type === 'stroke',
        index = isStroke ? strokeIndex++ : fillIndex++,
        slot = (index * GOLDEN) % 1,
        jitter = ((index * 2654435761) >>> 0) / 4294967296,
        delay = slot * (isStroke ? 0.5 : 0.45),
        span = isStroke ? 0.32 + jitter * 0.26 : 0.4 + jitter * 0.25;
      ((cmd.staggerDelay = delay), (cmd.staggerSpan = Math.min(span, 1 - delay)));
    }
    this.staggerScheduled = !0;
  }
  update(rawProgress) {
    var _a;
    const key = Math.min(1, Math.max(0, rawProgress));
    if (!(key === this.drawnProgress && this.commands.length === this.drawnCommandCount)) {
      ((this.drawnProgress = key),
        (this.drawnCommandCount = this.commands.length),
        this.display.clear(),
        this.staggerScheduled || this.scheduleStagger());
      for (let index = 0; index < this.commands.length; index++) {
        const cmd = this.commands[index];
        if (!(
          rawProgress <= cmd.staggerDelay &&
          opensOwnPath(cmd) &&
          (index + 1 >= this.commands.length || opensOwnPath(this.commands[index + 1]))
        )) {
          if (cmd.type === 'fill') {
            this.display.moveTo(0, 0);
            const localRaw = Math.min(
                1,
                Math.max(0, (rawProgress - cmd.staggerDelay) / cmd.staggerSpan)
              ),
              localProgress = 1 - Math.pow(1 - localRaw, 3);
            let isRectWipe = !1;
            if (cmd.path.length === 6 && cmd.path[0].type === 'rect_hint') {
              isRectWipe = !0;
              const r = cmd.path[0];
              this.display.rect(r.x, r.y, r.w * localProgress, r.h);
            }
            if (!isRectWipe)
              for (const p of cmd.path)
                p.type !== 'rect_hint' &&
                  (p.type === 'moveTo'
                    ? this.display.moveTo(p.x, p.y)
                    : p.type === 'lineTo'
                      ? this.display.lineTo(p.x, p.y)
                      : p.type === 'circle'
                        ? this.display.circle(p.x, p.y, p.r)
                        : p.type === 'arc'
                          ? this.display.arc(p.cx, p.cy, p.r, p.start, p.end, p.anticlockwise)
                          : p.type === 'quadraticCurveTo'
                            ? this.display.quadraticCurveTo(p.cx, p.cy, p.tx, p.ty)
                            : p.type === 'bezierCurveTo' &&
                              this.display.bezierCurveTo(p.c1x, p.c1y, p.c2x, p.c2y, p.tx, p.ty));
            const alphaProgress = 1 - Math.pow(1 - Math.min(1, localRaw * 2), 3),
              alpha = ((_a = cmd.options.alpha) != null ? _a : 1) * alphaProgress;
            this.display.fill(__spreadProps(__spreadValues({}, cmd.options), { alpha }));
          } else if (cmd.type === 'stroke') {
            if (cmd.length <= 0) continue;
            const localRaw = Math.min(
                1,
                Math.max(0, (rawProgress - cmd.staggerDelay) / cmd.staggerSpan)
              ),
              localProgress = 1 - Math.pow(1 - localRaw, 3),
              targetLen = cmd.length * localProgress;
            let currentLen = 0;
            for (const p of cmd.path)
              if (p.type !== 'rect_hint')
                if (p.type === 'moveTo') this.display.moveTo(p.x, p.y);
                else {
                  if (currentLen >= targetLen) break;
                  if (currentLen + p.len <= targetLen)
                    (p.type === 'lineTo'
                      ? this.display.lineTo(p.x, p.y)
                      : p.type === 'circle'
                        ? this.display.circle(p.x, p.y, p.r)
                        : p.type === 'arc'
                          ? this.display.arc(p.cx, p.cy, p.r, p.start, p.end, p.anticlockwise)
                          : p.type === 'quadraticCurveTo'
                            ? this.display.quadraticCurveTo(p.cx, p.cy, p.tx, p.ty)
                            : p.type === 'bezierCurveTo' &&
                              this.display.bezierCurveTo(p.c1x, p.c1y, p.c2x, p.c2y, p.tx, p.ty),
                      (currentLen += p.len));
                  else {
                    const ratio = (targetLen - currentLen) / p.len;
                    if (p.type === 'lineTo') {
                      const x = p.lastX + (p.x - p.lastX) * ratio,
                        y = p.lastY + (p.y - p.lastY) * ratio;
                      this.display.lineTo(x, y);
                    } else if (p.type === 'circle')
                      this.display.arc(p.x, p.y, p.r, 0, Math.PI * 2 * ratio);
                    else if (p.type === 'arc')
                      this.display.arc(
                        p.cx,
                        p.cy,
                        p.r,
                        p.start,
                        p.start + p.diff * ratio,
                        p.anticlockwise
                      );
                    else if (p.type === 'quadraticCurveTo') {
                      const newCpX = p.lastX + ratio * (p.cx - p.lastX),
                        newCpY = p.lastY + ratio * (p.cy - p.lastY),
                        newTx =
                          (1 - ratio) * (1 - ratio) * p.lastX +
                          2 * (1 - ratio) * ratio * p.cx +
                          ratio * ratio * p.tx,
                        newTy =
                          (1 - ratio) * (1 - ratio) * p.lastY +
                          2 * (1 - ratio) * ratio * p.cy +
                          ratio * ratio * p.ty;
                      this.display.quadraticCurveTo(newCpX, newCpY, newTx, newTy);
                    } else if (p.type === 'bezierCurveTo') {
                      const q0x = p.lastX + ratio * (p.c1x - p.lastX),
                        q0y = p.lastY + ratio * (p.c1y - p.lastY),
                        q1x = p.c1x + ratio * (p.c2x - p.c1x),
                        q1y = p.c1y + ratio * (p.c2y - p.c1y),
                        q2x = p.c2x + ratio * (p.tx - p.c2x),
                        q2y = p.c2y + ratio * (p.ty - p.c2y),
                        r0x = q0x + ratio * (q1x - q0x),
                        r0y = q0y + ratio * (q1y - q0y),
                        r1x = q1x + ratio * (q2x - q1x),
                        r1y = q1y + ratio * (q2y - q1y),
                        bx = r0x + ratio * (r1x - r0x),
                        by = r0y + ratio * (r1y - r0y);
                      this.display.bezierCurveTo(q0x, q0y, r0x, r0y, bx, by);
                    }
                    currentLen = targetLen;
                    break;
                  }
                }
            this.display.stroke(cmd.options);
          }
        }
      }
    }
  }
}
export { AnimatedGraphics };
