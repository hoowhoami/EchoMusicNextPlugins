// Keep the source plugin's paths and compositing recipe, but submit vector
// commands to Qt Quick Shapes instead of rasterizing a Canvas.Image each frame.
import { paint, centered, mist, backdrop } from './drawing.js';

export function scene(width, height, frame, settings, kind, colors, time, display, pass = -1) {
  const commands = [];
  let path = '';
  let state = {
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: 'transparent',
  };
  const stack = [];
  const submit = (stroke) => {
    // The centered destination-in rectangle is a single GPU mask on the
    // completed group, including its backdrop, rather than a painted bitmap.
    if (state.globalCompositeOperation === 'destination-in') return;
    const brush = stroke ? state.strokeStyle : state.fillStyle;
    commands.push({
      path,
      stroke,
      color: typeof brush === 'string' ? brush : '#ffffff',
      gradient: typeof brush === 'string' ? null : brush,
      alpha: state.globalAlpha,
      lineWidth: state.lineWidth,
      shadowBlur: state.shadowBlur,
      shadowColor: state.shadowColor,
    });
  };
  const context = {
    save() {
      stack.push({ ...state });
    },
    restore() {
      state = stack.pop();
    },
    clearRect() {},
    beginPath() {
      path = '';
    },
    moveTo(x, y) {
      path += `M${x} ${y}`;
    },
    lineTo(x, y) {
      path += `L${x} ${y}`;
    },
    quadraticCurveTo(cx, cy, x, y) {
      path += `Q${cx} ${cy} ${x} ${y}`;
    },
    closePath() {
      path += 'Z';
    },
    fill() {
      submit(false);
    },
    stroke() {
      submit(true);
    },
    fillRect(x, y, w, h) {
      const previous = path;
      path = `M${x} ${y}h${w}v${h}h${-w}Z`;
      submit(false);
      path = previous;
    },
    createLinearGradient(x1, y1, x2, y2) {
      return {
        x1,
        y1,
        x2,
        y2,
        stops: [],
        addColorStop(at, color) {
          this.stops.push({ at, color });
        },
      };
    },
  };
  for (const key of [...Object.keys(state), 'lineJoin', 'lineCap'])
    Object.defineProperty(context, key, {
      get: () => state[key],
      set: (value) => {
        state[key] = value;
      },
    });
  if (pass >= 0) mist(context, width, height, frame, settings, kind, colors, time, pass);
  else if (pass === -2) backdrop(context, width, height, frame, settings, kind, colors);
  else if (settings.mode === 'centered')
    centered(context, width, height, frame, settings, kind, colors, display);
  else paint(context, width, height, frame, settings, kind, colors, time, display);
  return commands;
}
