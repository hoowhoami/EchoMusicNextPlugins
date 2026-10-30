// CSS backdrop-filter over its earlier paint prefix; all buffers are bounded GPU ROIs.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property var sources: []
    property real sigma: 8
    property real corner: 0
    property color baseColor: "#111111"
    property bool live: true
    readonly property int padding: Math.ceil(3 * sigma)
    readonly property real density: Screen.devicePixelRatio
    readonly property size expandedPixels: Qt.size(Math.ceil((width + 2 * padding) * density), Math.ceil((height + 2 * padding) * density))
    readonly property real plannedBytes: contents.item ? contents.item.plannedBytes : 0
    readonly property string errorString: sources.length > 6 ? "Backdrop supports at most six earlier source items" : sigma < 0 || sigma * density * 3 > 256 ? "Backdrop Gaussian kernel exceeds its GPU budget" : expandedPixels.width > 4096 || expandedPixels.height > 4096 ? "Backdrop extent exceeds its GPU budget" : contents.item ? contents.item.errorString : ""
    readonly property bool rendererActive: contents.active
    Loader {
        id: contents
        anchors.fill: parent
        active: root.live && root.visible && root.width > 0 && root.height > 0 && root.sources.length <= 6 && root.sigma >= 0 && root.sigma * root.density * 3 <= 256 && root.expandedPixels.width <= 4096 && root.expandedPixels.height <= 4096
        sourceComponent: Item {
            id: body
            property int count: 0
            readonly property real plannedBytes: {
                let sum = root.expandedPixels.width * root.expandedPixels.height * 8;
                for (let i = 0; i < captures.count; ++i)
                    if (body.captureAt(i))
                        sum += body.captureAt(i).plannedBytes;
                return sum;
            }
            readonly property string errorString: {
                if (plannedBytes > 64 * 1024 * 1024)
                    return "Backdrop buffers exceed their 64MiB GPU budget";
                for (let i = 0; i < captures.count; ++i)
                    if (body.captureAt(i) && body.captureAt(i).errorString)
                        return body.captureAt(i).errorString;
                const graph = output.item;
                return graph ? graph.errorString : "";
            }
            function captureAt(index: int): BackdropSource { return captures.itemAt(index) as BackdropSource; }
            function sync(): void {
                for (let i = 0; i < captures.count; ++i)
                    if (body.captureAt(i))
                        body.captureAt(i).sync();
            }
            Repeater {
                id: captures
                model: 6
                onItemAdded: ++body.count
                onItemRemoved: --body.count
                delegate: BackdropSource {
                    required property int index
                    inputItem: root.sources[index] || null
                    targetItem: root
                    padding: root.padding
                    live: root.live
                }
            }
            Timer { id: synchronize; interval: 0; onTriggered: body.sync() }
            FrameAnimation { running: root.live; onTriggered: synchronize.restart() }
            Connections {
                target: root
                function onWidthChanged() { body.sync(); }
                function onHeightChanged() { body.sync(); }
                function onSigmaChanged() { body.sync(); }
                function onSourcesChanged() { body.sync(); }
            }
            Loader {
                id: output
                anchors.fill: parent
                active: body.count === 6 && body.plannedBytes <= 64 * 1024 * 1024 && !Array.from({length:6},(_,i)=>body.captureAt(i)).some(item=>!item.accepted)
                sourceComponent: Item {
                    readonly property string errorString: composite.status === ShaderEffect.Error ? composite.log : horizontal.status === ShaderEffect.Error ? horizontal.log : vertical.status === ShaderEffect.Error ? vertical.log : ""
                    ShaderEffect {
                        id: composite
                        width: root.width + 2 * root.padding
                        height: root.height + 2 * root.padding
                        property vector2d extent: Qt.vector2d(width, height)
                        property real padding: root.padding
                        property color baseColor: root.baseColor
                        property var source0: body.captureAt(0).texture
                        property var source1: body.captureAt(1).texture
                        property var source2: body.captureAt(2).texture
                        property var source3: body.captureAt(3).texture
                        property var source4: body.captureAt(4).texture
                        property var source5: body.captureAt(5).texture
                        property matrix4x4 matrix0: body.captureAt(0).uvMatrix
                        property matrix4x4 matrix1: body.captureAt(1).uvMatrix
                        property matrix4x4 matrix2: body.captureAt(2).uvMatrix
                        property matrix4x4 matrix3: body.captureAt(3).uvMatrix
                        property matrix4x4 matrix4: body.captureAt(4).uvMatrix
                        property matrix4x4 matrix5: body.captureAt(5).uvMatrix
                        property real alpha0: body.captureAt(0).inputOpacity
                        property real alpha1: body.captureAt(1).inputOpacity
                        property real alpha2: body.captureAt(2).inputOpacity
                        property real alpha3: body.captureAt(3).inputOpacity
                        property real alpha4: body.captureAt(4).inputOpacity
                        property real alpha5: body.captureAt(5).inputOpacity
                        fragmentShader: "../shaders/backdrop-compose.frag.qsb"
                    }
                    ShaderEffectSource { id: prefix; sourceItem: composite; textureSize: root.expandedPixels; hideSource: true; visible: false; live: root.live; smooth: true }
                    ShaderEffect {
                        id: horizontal
                        width: composite.width
                        height: composite.height
                        property var source: prefix
                        property vector2d extent: composite.extent
                        property real density: root.density
                        property real sigma: root.sigma
                        property real padding: root.padding
                        property real corner: root.corner
                        property real vertical: 0
                        fragmentShader: "../shaders/backdrop-blur.frag.qsb"
                    }
                    ShaderEffectSource { id: horizontalTexture; sourceItem: horizontal; textureSize: root.expandedPixels; hideSource: true; visible: false; live: root.live; smooth: true }
                    ShaderEffect {
                        id: vertical
                        x: -root.padding
                        y: -root.padding
                        width: composite.width
                        height: composite.height
                        property var source: horizontalTexture
                        property vector2d extent: composite.extent
                        property real density: root.density
                        property real sigma: root.sigma
                        property real padding: root.padding
                        property real corner: root.corner
                        property real vertical: 1
                        fragmentShader: "../shaders/backdrop-blur.frag.qsb"
                    }
                }
            }
        }
    }
}
