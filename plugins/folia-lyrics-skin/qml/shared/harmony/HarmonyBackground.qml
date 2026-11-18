// Cached source radial gradient followed by CSS Gaussian sigma24, in a bounded GPU ROI.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property color backgroundColor: "#111111"
    property bool live: true
    readonly property int padding: 72
    readonly property real density: Screen.devicePixelRatio
    readonly property size pixels: Qt.size(Math.ceil((width + 2 * padding) * density), Math.ceil((height + 2 * padding) * density))
    readonly property bool accepted: pixels.width <= 4096 && pixels.height <= 8192 && pixels.width * pixels.height * 8 <= 64 * 1024 * 1024 && 24 * density * 3 <= 256
    readonly property real cacheBytes: graph.active ? pixels.width * pixels.height * 8 : 0
    readonly property BackgroundBuffers rendered: graph.item as BackgroundBuffers
    readonly property string errorString: !accepted ? "Harmony glow exceeds its bounded GPU ROI" : rendered ? rendered.errorString : ""
    property int bakeCount: 0
    property bool _completed: false
    function queue() {
        if (_completed && live)
            refresh.restart();
    }
    onWidthChanged: queue()
    onHeightChanged: queue()
    onBackgroundColorChanged: queue()
    onLiveChanged: if (live)
        queue()
    else
        refresh.stop()
    Component.onCompleted: {
        _completed = true;
        queue();
    }
    Component.onDestruction: {
        _completed = false;
        refresh.stop();
    }
    Timer {
        id: refresh
        interval: 0
        onTriggered: {
            if (root.rendered) {
                root.rendered.bake();
                ++root.bakeCount;
            }
        }
    }
    Loader {
        id: graph
        anchors.fill: parent
        active: root.live && root.visible && root.accepted && root.width > 0 && root.height > 0
        onLoaded: root.queue()
        sourceComponent: BackgroundBuffers {}
    }
    component BackgroundBuffers: Item {
        id: body
        readonly property string errorString: gradient.status === ShaderEffect.Error ? gradient.log : horizontal.status === ShaderEffect.Error ? horizontal.log : vertical.status === ShaderEffect.Error ? vertical.log : ""
        function bake() {
            input.scheduleUpdate();
            intermediate.scheduleUpdate();
        }
        ShaderEffect {
            id: gradient
            width: root.width + 2 * root.padding
            height: root.height + 2 * root.padding
            property vector2d extent: Qt.vector2d(width, height)
            property vector2d boxSize: Qt.vector2d(root.width, root.height)
            property real padding: root.padding
            property color background: root.backgroundColor
            fragmentShader: "glow.frag.qsb"
        }
        ShaderEffectSource {
            id: input
            sourceItem: gradient
            textureSize: root.pixels
            hideSource: true
            visible: false
            live: false
            smooth: true
        }
        ShaderEffect {
            id: horizontal
            width: gradient.width
            height: gradient.height
            property var source: input
            property vector2d extent: Qt.vector2d(width, height)
            property real density: root.density
            property real sigma: 24
            property real padding: root.padding
            property real vertical: 0
            property real outputOpacity: 1
            fragmentShader: "../../shaders/transition-blur.frag.qsb"
        }
        ShaderEffectSource {
            id: intermediate
            sourceItem: horizontal
            textureSize: root.pixels
            hideSource: true
            visible: false
            live: false
            smooth: true
        }
        ShaderEffect {
            id: vertical
            x: -root.padding
            y: -root.padding
            width: gradient.width
            height: gradient.height
            property var source: intermediate
            property vector2d extent: Qt.vector2d(width, height)
            property real density: root.density
            property real sigma: 24
            property real padding: root.padding
            property real vertical: 1
            property real outputOpacity: 1
            fragmentShader: "../../shaders/transition-blur.frag.qsb"
        }
    }
}
