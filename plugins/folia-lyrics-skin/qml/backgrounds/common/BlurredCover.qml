// Source 320px buffer, 640px input and CSS blur(40px) followed by scale(1.5).
// Gaussian FBOs update only for cover/size; colour blending remains GPU uniforms.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property url source
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property bool live: true
    readonly property int bufferWidth: 320
    readonly property int bufferHeight: Math.max(1, Math.round(320 * height / Math.max(1, width)))
    readonly property real sigma: 60 * 320 / Math.max(1, width)
    readonly property int padding: Math.ceil(3 * sigma)
    readonly property int expandedWidth: bufferWidth + 2 * padding
    readonly property int expandedHeight: bufferHeight + 2 * padding
    // Logical RGBA8 texture/decode bounds; driver copies and allocator RSS are separate.
    readonly property real plannedBytes: (expandedWidth * expandedHeight + bufferWidth * bufferHeight + 640 * 640) * 4
    readonly property bool sizeAccepted: padding <= 256 && expandedWidth <= 4096 && expandedHeight <= 4096 && plannedBytes <= 32 * 1024 * 1024
    readonly property bool ready: live && _ready && !errorString
    readonly property var renderer: graph.item
    readonly property string errorString: !sizeAccepted ? "Common cover exceeds static blur texture budget" : cover.status === Image.Error ? "Common cover image decode failed" : renderer ? renderer.errorString : ""
    readonly property real fboBytes: graph.item ? (expandedWidth * expandedHeight + bufferWidth * bufferHeight) * 4 : 0
    property int bakeCount: 0
    property bool _ready: false
    property bool _completed: false
    property int _pendingFrames: 0
    function queueBake(): void {
        if (_completed)
            refresh.restart();
    }
    function bake(): void {
        if (!_completed || !live || !sizeAccepted || cover.status !== Image.Ready || !graph.item)
            return;
        _ready = false;
        renderer.updateTextures();
        ++bakeCount;
        _pendingFrames = 2;
    }
    onWidthChanged: queueBake()
    onHeightChanged: queueBake()
    onLiveChanged: {
        if (live)
            queueBake();
        else {
            refresh.stop();
            _pendingFrames = 0;
            _ready = false;
        }
    }
    Component.onCompleted: {
        _completed = true;
        queueBake();
    }
    Timer {
        id: refresh
        interval: 0
        onTriggered: root.bake()
    }
    Image {
        id: cover
        source: root.live ? root.source : ""
        sourceSize: Qt.size(640, 640)
        asynchronous: true
        autoTransform: true
        cache: false
        visible: false
        onStatusChanged: {
            root._ready = false;
            if (status === Image.Ready)
                root.queueBake();
        }
    }
    FrameAnimation {
        running: root.live && root._pendingFrames > 0
        onTriggered: {
            --root._pendingFrames;
            if (!root._pendingFrames)
                root._ready = true;
        }
    }
    Loader {
        id: graph
        anchors.fill: parent
        active: root.live && root.sizeAccepted && cover.status === Image.Ready
        onLoaded: root.bake()
        sourceComponent: Item {
            readonly property string errorString: horizontal.status === ShaderEffect.Error ? horizontal.log : vertical.status === ShaderEffect.Error ? vertical.log : overlay.status === ShaderEffect.Error ? overlay.log : ""
            function updateTextures(): void {
                horizontalTexture.scheduleUpdate();
                verticalTexture.scheduleUpdate();
            }
            ShaderEffect {
                id: horizontal
                width: root.expandedWidth
                height: root.expandedHeight
                property var source: cover
                property vector2d bufferSize: Qt.vector2d(root.bufferWidth, root.bufferHeight)
                property vector2d expandedSize: Qt.vector2d(root.expandedWidth, root.expandedHeight)
                property vector2d imageSize: Qt.vector2d(Math.max(1, cover.implicitWidth), Math.max(1, cover.implicitHeight))
                property real padding: root.padding
                property real sigma: root.sigma
                property real vertical: 0
                fragmentShader: "blur.frag.qsb"
            }
            ShaderEffectSource {
                id: horizontalTexture
                sourceItem: horizontal
                textureSize: Qt.size(root.expandedWidth, root.expandedHeight)
                hideSource: true
                live: false
                visible: false
                smooth: true
            }
            ShaderEffect {
                id: vertical
                width: root.bufferWidth
                height: root.bufferHeight
                property var source: horizontalTexture
                property vector2d bufferSize: horizontal.bufferSize
                property vector2d expandedSize: horizontal.expandedSize
                property vector2d imageSize: horizontal.imageSize
                property real padding: root.padding
                property real sigma: root.sigma
                property real vertical: 1
                fragmentShader: "blur.frag.qsb"
            }
            ShaderEffectSource {
                id: verticalTexture
                sourceItem: vertical
                textureSize: Qt.size(root.bufferWidth, root.bufferHeight)
                hideSource: true
                live: false
                visible: false
                smooth: true
            }
            ShaderEffect {
                id: overlay
                anchors.fill: parent
                property var source: verticalTexture
                property color primaryColor: root.primaryColor
                property color secondaryColor: root.secondaryColor
                fragmentShader: "overlay.frag.qsb"
            }
        }
    }
}
