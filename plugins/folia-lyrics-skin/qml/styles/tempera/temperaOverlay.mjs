// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { destroyPixiContainerChildren } from './display-resources.mjs';
class TemperaOverlay {
  constructor(pixi) {
    __publicField(this, 'pixi', pixi);
    __publicField(this, 'container');
    __publicField(this, 'wipeGraphics', null);
    /** The size and colour the wipe geometry was last built for. */
    __publicField(this, 'wipeKey', '');
    this.container = new pixi.Container();
  }
  draw(width, height, tuning, theme) {
    destroyPixiContainerChildren(this.container);
    this.wipeGraphics = new this.pixi.Graphics();
    this.wipeGraphics.visible = false;
    this.wipeKey = '';
    this.container.addChild(this.wipeGraphics);
    if (!tuning.showCornerMarks) return;
    const g = new this.pixi.Graphics();
    const primary = this.pixi.Color.shared.setValue(theme.primaryColor).toNumber();
    const paddingX = Math.max(28, width * 0.045);
    const paddingY = Math.max(28, height * 0.045);
    g.moveTo(paddingX, paddingY + 14)
      .lineTo(paddingX, paddingY)
      .lineTo(paddingX + 14, paddingY)
      .stroke({ color: primary, width: 1.5, alpha: 0.5 });
    g.moveTo(width - paddingX - 14, height - paddingY)
      .lineTo(width - paddingX, height - paddingY)
      .lineTo(width - paddingX, height - paddingY - 14)
      .stroke({ color: primary, width: 1.5, alpha: 0.5 });
    this.container.addChild(g);
  }
  // Slides a screen-sized block along `angle`. `travel` runs 0..2: at 1 the block covers the
  // frame exactly, which is the instant the scene underneath is allowed to swap.
  drawWipe(travel, angle, width, height, color) {
    const wipe = this.wipeGraphics;
    if (!wipe) return;
    if (travel <= 1e-3 || travel >= 1.999) {
      wipe.visible = false;
      return;
    }
    const span = Math.hypot(width, height);
    const notch = span * 0.08;
    const length = span + notch * 2;
    const key = `${width}x${height}|${color}`;
    if (key !== this.wipeKey) {
      this.wipeKey = key;
      const start = -span / 2 - notch;
      const end = start + length;
      const half = span / 2;
      wipe.clear();
      wipe
        .poly([start, -half, end, -half, end + notch, 0, end, half, start, half, start + notch, 0])
        .fill({ color: this.pixi.Color.shared.setValue(color).toNumber() });
    }
    const offset = (travel - 1) * length;
    wipe.pivot.set(0, 0);
    wipe.position.set(width / 2 + Math.cos(angle) * offset, height / 2 + Math.sin(angle) * offset);
    wipe.rotation = angle;
    wipe.scale.set(1, 1);
    wipe.visible = true;
  }
  /** Forgets the wipe block; its Graphics goes down with the stage in app.destroy. */
  release() {
    this.wipeGraphics = null;
  }
}
export { TemperaOverlay };
