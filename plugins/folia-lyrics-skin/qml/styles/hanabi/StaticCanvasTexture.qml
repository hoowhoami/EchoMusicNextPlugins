// Immutable source texture preparation. Dynamic frames never repaint this Canvas.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property var texture
    property font baseFont
    property bool live: true
    property bool retainProvider: false
    property bool ready: false
    property string errorString: ""
    property int paintCount: 0
    property bool _capture: false
    property int _captureCompletions: 0
    readonly property var output: ready ? capture.item : null
    readonly property real cacheBytes: (capture.item ? texture.pixelWidth * texture.pixelHeight * 4 : 0) + (canvas.item ? texture.pixelWidth * texture.pixelHeight * 4 : 0)
    width: texture.width
    height: texture.height
    function reset(): void {
        ready = false;
        _capture = false;
        _captureCompletions = 0;
        errorString = "";
        canvas.active = false;
        if (!live || !visible)
            return;
        if (texture.pixelWidth < 1 || texture.pixelHeight < 1 || texture.pixelWidth > 8192 || texture.pixelHeight > 8192 || texture.pixelWidth * texture.pixelHeight * 8 > 128 * 1024 * 1024) {
            errorString = "Hanabi static texture exceeds preparation budget";
            return;
        }
        canvas.active = true;
    }
    onTextureChanged: reset()
    onLiveChanged: reset()
    Component.onCompleted: reset()
    Item {
        id: contents
        width: root.width
        height: root.height
        Loader {
            id: canvas
            active: false
            sourceComponent: Canvas {
                width: root.texture.pixelWidth
                height: root.texture.pixelHeight
                scale: 1 / root.texture.resolution
                transformOrigin: Item.TopLeft
                renderTarget: Canvas.Image
                renderStrategy: Canvas.Threaded
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
                        for (const command of root.texture.commands) {
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
                        ++root.paintCount;
                    } catch (error) {
                        root.errorString = String(error.message || error);
                    }
                }
                onPainted: if (!root.errorString && !root._capture) {
                    root._capture = true;
                    if (capture.item)
                        capture.item.scheduleUpdate();
                }
            }
        }
    }
    Loader {
        id: capture
        active: root.live && (canvas.active || root.ready)
        onLoaded: item.scheduleUpdate()
        sourceComponent: ShaderEffectSource {
            sourceItem: contents
            sourceRect: Qt.rect(0, 0, root.width, root.height)
            textureSize: Qt.size(root.texture.pixelWidth, root.texture.pixelHeight)
            hideSource: true
            visible: false
            live: !root.ready
            smooth: true
            onScheduledUpdateCompleted: {
                if (!root._capture)
                    return;
                // Complete a fresh capture after Canvas.painted; an earlier
                // scheduled capture may have completed in the same event turn.
                if (++root._captureCompletions < 2) {
                    scheduleUpdate();
                    return;
                }
                root.ready = true;
                retire.restart();
            }
        }
    }
    Timer {
        id: retire
        interval: 0
        onTriggered: if (!root.retainProvider)
            canvas.active = false
    }
    Loader {
        active: (!root.ready || root.retainProvider) && capture.item !== null
        x: root.parent ? root.parent.width / 2 : 0
        y: root.parent ? root.parent.height / 2 : 0
        sourceComponent: ShaderEffect {
            width: 1
            height: 1
            property var source: capture.item
            property real outputAlpha: 0
            fragmentShader: Qt.resolvedUrl('../lumiere/glyph-prime.frag.qsb')
        }
    }
}
