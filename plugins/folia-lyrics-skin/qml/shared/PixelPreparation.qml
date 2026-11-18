// Bounded one-time native pixels for original glyph/snow preparation, never animation.
pragma ComponentBehavior: Bound
import QtQuick
import "pixel-blur.mjs" as Blur

Item {
    id: root
    signal finished(var results)
    signal failed(string message)
    property var _queries: []
    property var _results: []
    property int _cursor: 0
    property var _query: null
    property int _bytes: 0
    function prepare(queries: var): void {
        _queries = queries;
        _results = [];
        _cursor = 0;
        _bytes = 0;
        next.restart();
    }
    function advance(): void {
        surface.active = false;
        if (_cursor >= _queries.length) {
            finished(_results);
            return;
        }
        _query = _queries[_cursor];
        _bytes += _query.width * _query.height * 4;
        if (_queries.length > 4096 || _bytes > 16 * 1024 * 1024 || _query.width < 1 || _query.height < 1 || _query.width * _query.height > 1024 * 1024) {
            failed('Native preparation pixel budget exceeded');
            return;
        }
        surface.active = true;
    }
    Timer {
        id: next
        interval: 0
        onTriggered: root.advance()
    }
    Loader {
        id: surface
        active: false
        sourceComponent: Canvas {
            width: root._query.width
            height: root._query.height
            opacity: 0
            renderTarget: Canvas.Image
            renderStrategy: Canvas.Immediate
            function style(context: var, value: var): var {
                if (typeof value === 'string') {
                    if (value.startsWith('hsl(')) {
                        const m = /hsl\(([\d.]+)deg ([\d.]+)% ([\d.]+)%\)/.exec(value);
                        if (m)
                            return Qt.hsla(Number(m[1]) / 360, Number(m[2]) / 100, Number(m[3]) / 100, 1);
                    }
                    return value;
                }
                const p = value.points, gradient = value.type === 'radial' ? context.createRadialGradient(...p) : context.createLinearGradient(...p);
                for (const stop of value.stops)
                    gradient.addColorStop(stop.position, style(context, stop.color));
                return gradient;
            }
            function matrix(context: var, values: var): void {
                context.setTransform(values[0], values[3], values[1], values[4], values[2], values[5]);
            }
            function path(context: var, parts: var): void {
                context.beginPath();
                for (const part of parts) {
                    const kind = part[0], p = part.slice(1);
                    if (kind === 'svg')
                        context.path = p[0];
                    else if (kind === 'roundRect') {
                        const x = p[0], y = p[1], w = p[2], h = p[3], r = Math.min(Array.isArray(p[4]) ? p[4][0] : p[4] || 0, Math.abs(w) / 2, Math.abs(h) / 2);
                        context.moveTo(x + r, y);
                        context.lineTo(x + w - r, y);
                        context.quadraticCurveTo(x + w, y, x + w, y + r);
                        context.lineTo(x + w, y + h - r);
                        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                        context.lineTo(x + r, y + h);
                        context.quadraticCurveTo(x, y + h, x, y + h - r);
                        context.lineTo(x, y + r);
                        context.quadraticCurveTo(x, y, x + r, y);
                        context.closePath();
                    } else if (kind === 'ellipse') {
                        context.save();
                        context.translate(p[0], p[1]);
                        context.rotate(p[4]);
                        context.scale(p[2], p[3]);
                        context.arc(0, 0, 1, p[5], p[6], p[7] || false);
                        context.restore();
                    } else if (typeof context[kind] === 'function')
                        context[kind](...p);
                    else
                        throw new Error('Unsupported immutable canvas path: ' + kind);
                }
            }

            onAvailableChanged: if (available)
                requestPaint()
            onPaint: {
                try {
                    const context = getContext('2d');
                    context.reset();
                    context.clearRect(0, 0, width, height);
                    for (const command of root._query.commands) {
                        const s = command.style;
                        context.save();
                        for (const clip of s.clips || []) {
                            matrix(context, clip.matrix);
                            path(context, clip.path);
                            context.clip();
                        }
                        matrix(context, s.matrix);
                        context.globalAlpha = s.globalAlpha;
                        context.globalCompositeOperation = s.globalCompositeOperation;
                        context.fillStyle = style(context, s.fillStyle);
                        context.strokeStyle = style(context, s.strokeStyle);
                        context.lineWidth = s.lineWidth;
                        context.lineCap = s.lineCap;
                        context.lineJoin = s.lineJoin;
                        context.shadowColor = s.shadowColor || 'transparent';
                        context.shadowBlur = s.shadowBlur || 0;
                        context.shadowOffsetX = s.shadowOffsetX || 0;
                        context.shadowOffsetY = s.shadowOffsetY || 0;
                        if (command.kind === 'text') {
                            context.font = s.font;
                            context.textAlign = s.textAlign || 'left';
                            context.textBaseline = s.textBaseline;
                            if (command.stroke)
                                context.strokeText(command.text, command.x, command.y);
                            else
                                context.fillText(command.text, command.x, command.y);
                        } else if (command.kind === 'rect')
                            context.fillRect(command.x, command.y, command.width, command.height);
                        else if (command.kind === 'clear')
                            context.clearRect(command.x, command.y, command.width, command.height);
                        else {
                            path(context, command.path);
                            if (command.stroke)
                                context.stroke();
                            else
                                context.fill();
                        }
                        context.restore();
                    }

                    const image = context.getImageData(0, 0, width, height);
                    root._results.push({
                        key: root._query.key,
                        pixels: Blur.blur(Array.from(image.data), width, height, root._query.blur || 0)
                    });
                    ++root._cursor;
                    next.restart();
                } catch (error) {
                    root.failed(String(error.message || error));
                }
            }
        }
    }
}
