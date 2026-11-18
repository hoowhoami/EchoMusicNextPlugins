// Four bounded original procedural textures. Replays once per static command key.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    required property var texture
    property bool live: true
    readonly property var output: contents.item
    readonly property int paintCount: _paintCount
    readonly property real cacheBytes: contents.item ? texture.pixelWidth * texture.pixelHeight * 4 : 0
    readonly property real cpuBytes: cacheBytes
    readonly property string errorString: _error
    property int _paintCount: 0
    property string _key: ""
    property string _error: ""
    width: texture.width || 0
    height: texture.height || 0
    function sync() {
        try {
            if (texture.pixelWidth > 512 || texture.pixelHeight > 512 || texture.pixelWidth <= 0 || texture.pixelHeight <= 0)
                throw new Error('Lumiere procedural texture extent exceeded');
            for (const command of texture.commands)
                if (!['rect', 'path', 'clear'].includes(command.kind))
                    throw new Error('Lumiere procedural texture cannot draw text');
            const key = JSON.stringify([texture.pixelWidth, texture.pixelHeight, texture.commands]);
            if (key !== _key) {
                _key = key;
                if (contents.item)
                    contents.item.requestPaint();
            }
            _error = "";
        } catch (error) {
            _error = String(error.message || error);
        }
    }
    onTextureChanged: sync()
    Component.onCompleted: sync()
    Loader {
        id: contents
        active: root.live && root.visible && root._error.length === 0
        sourceComponent: Canvas {
            id: canvas
            width: root.texture.pixelWidth
            height: root.texture.pixelHeight
            visible: false
            renderStrategy: Canvas.Threaded
            renderTarget: Canvas.Image
            function paintStyle(context: var, value: var): var {
                if (typeof value === 'string')
                    return value;
                const p = value.points, gradient = value.type === 'radial' ? context.createRadialGradient(p[0], p[1], p[2], p[3], p[4], p[5]) : context.createLinearGradient(p[0], p[1], p[2], p[3]);
                for (const stop of value.stops)
                    gradient.addColorStop(stop.position, stop.color);
                return gradient;
            }
            onAvailableChanged: if (available)
                requestPaint()
            onPaint: {
                const context = getContext('2d');
                context.reset();
                context.clearRect(0, 0, width, height);
                for (const command of root.texture.commands) {
                    const style = command.style, m = style.matrix;
                    context.setTransform(m[0], m[3], m[1], m[4], m[2], m[5]);
                    context.globalAlpha = style.globalAlpha;
                    context.globalCompositeOperation = style.globalCompositeOperation;
                    context.fillStyle = paintStyle(context, style.fillStyle);
                    context.strokeStyle = paintStyle(context, style.strokeStyle);
                    context.lineWidth = style.lineWidth;
                    context.lineCap = style.lineCap;
                    context.lineJoin = style.lineJoin;
                    if (command.kind === 'rect')
                        context.fillRect(command.x, command.y, command.width, command.height);
                    else if (command.kind === 'clear')
                        context.clearRect(command.x, command.y, command.width, command.height);
                    else {
                        context.beginPath();
                        for (const part of command.path) {
                            const kind = part[0];
                            if (kind === 'closePath')
                                context.closePath();
                            else if (kind === 'moveTo')
                                context.moveTo(part[1], part[2]);
                            else if (kind === 'lineTo')
                                context.lineTo(part[1], part[2]);
                            else if (kind === 'arc')
                                context.arc(part[1], part[2], part[3], part[4], part[5], part[6]);
                            else
                                throw new Error('Unsupported Lumiere procedural path');
                        }
                        if (command.stroke)
                            context.stroke();
                        else
                            context.fill();
                    }
                }
                ++root._paintCount;
            }
        }
    }
}
