// Ordered native source Graphics primitives. No bitmap/canvas surrogate.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Shapes
import "scene-graph.mjs" as Graph

Item {
    id: root
    property var paths: []
    property bool live: true
    property color tint: "#ffffff"
    property var _actors: []
    property bool _completed: false
    function clear(): void {
        const previous = _actors;
        _actors = [];
        for (const actor of previous) {
            actor.visible = false;
            actor.destroy();
        }
    }
    function sync(): void {
        if (!_completed)
            return;
        if (!live || !visible) {
            clear();
            return;
        }
        const actors = _actors.slice();
        while (actors.length > paths.length) {
            const actor = actors.pop();
            actor.visible = false;
            actor.destroy();
        }
        while (actors.length < paths.length) {
            const actor = pathComponent.createObject(root, {modelData: paths[actors.length]});
            if (!actor)
                throw Error("Native vector path creation failed");
            actors.push(actor);
        }
        for (let index = 0; index < actors.length; ++index) {
            actors[index].z = index;
            actors[index].modelData = paths[index];
        }
        _actors = actors;
    }
    onPathsChanged: sync()
    onLiveChanged: sync()
    onVisibleChanged: sync()
    Component.onCompleted: { _completed = true; sync(); }
    Component.onDestruction: clear()
    function tinted(value) {
        const css = typeof value === "string" && /^rgba?\(([^)]+)\)$/.exec(value);
        const parts = css ? css[1].split(",").map(Number) : null;
        const c = parts ? Qt.rgba(parts[0] / 255, parts[1] / 255, parts[2] / 255, parts.length > 3 ? parts[3] : 1) : Qt.color(value);
        return Qt.rgba(c.r * tint.r, c.g * tint.g, c.b * tint.b, c.a);
    }
    readonly property int pathCount: live && visible ? paths.length : 0
    readonly property int geometryBytes: {
        if (!live || !visible)
            return 0;
        let sum = 0;
        for (const p of paths)
            sum += p.path.length * 2;
        return sum;
    }
    Component {
        id: pathComponent
        Shape {
            id: shape
            objectName: "foliaNativeVectorPath"
            required property var modelData
            width: 1
            height: 1
            preferredRendererType: Shape.CurveRenderer
            opacity: modelData.alpha
            property var gradient: null
            property var _stops: []
            property bool _ready: false
            function rebuildGradient() {
                if (!_ready)
                    return;
                const input = modelData.gradient;
                if (!input) {
                    const previous = gradient;
                    gradient = null;
                    _stops = [];
                    if (previous)
                        previous.destroy();
                    return;
                }
                if (input.type && input.type !== "linear")
                    throw new Error("Unsupported native source gradient type");
                const b = modelData.bounds, start = input.start, end = input.end;
                if (!gradient)
                    gradient = gradientComponent.createObject(shape);
                gradient.x1 = b.x + start.x * b.width;
                gradient.y1 = b.y + start.y * b.height;
                gradient.x2 = b.x + end.x * b.width;
                gradient.y2 = b.y + end.y * b.height;
                const stops = _stops.slice();
                const oldCount = stops.length;
                while (stops.length > input.colorStops.length)
                    stops.pop().destroy();
                while (stops.length < input.colorStops.length)
                    stops.push(stopComponent.createObject(gradient));
                for (let index = 0; index < stops.length; ++index) {
                    stops[index].position = input.colorStops[index].offset;
                    stops[index].color = root.tinted(Graph.color(input.colorStops[index].color));
                }
                if (oldCount !== stops.length)
                    gradient.stops = stops;
                _stops = stops;
            }
            Connections {
                target: root
                function onTintChanged() {
                    shape.rebuildGradient();
                }
            }
            onModelDataChanged: rebuildGradient()
            Component.onCompleted: { _ready = true; rebuildGradient(); }
            ShapePath {
                strokeColor: root.tinted(shape.modelData.stroke)
                strokeWidth: shape.modelData.width
                fillColor: root.tinted(shape.modelData.fill)
                fillGradient: shape.gradient
                fillRule: ShapePath.WindingFill
                capStyle: shape.modelData.cap === "round" ? ShapePath.RoundCap : shape.modelData.cap === "square" ? ShapePath.SquareCap : ShapePath.FlatCap
                joinStyle: shape.modelData.join === "round" ? ShapePath.RoundJoin : shape.modelData.join === "bevel" ? ShapePath.BevelJoin : ShapePath.MiterJoin
                miterLimit: shape.modelData.miterLimit === undefined ? 10 : shape.modelData.miterLimit
                PathSvg {
                    path: shape.modelData.path
                }
            }
        }
    }
    Component {
        id: gradientComponent
        LinearGradient {}
    }
    Component {
        id: stopComponent
        GradientStop { objectName: "foliaNativeVectorGradientStop" }
    }
}
