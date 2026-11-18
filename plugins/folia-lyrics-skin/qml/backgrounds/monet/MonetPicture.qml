pragma ComponentBehavior: Bound
import QtQuick
import "presentation.mjs" as Presentation
import "../../styles/classic/motion.mjs" as Motion

Item {
    id: root
    required property string pictureKey
    required property url source
    required property int sourceWidth
    required property int sourceHeight
    property bool processed: false
    property bool halfPane: false
    property real positionX: .5
    property real devicePixelRatio: 1
    property color backgroundColor: '#111111'
    property color accentColor: '#8fb7ff'
    property var driftPose: ({
            xPercent: 0,
            yPercent: 0,
            scale: 1
        })
    readonly property var decodeSize: Presentation.displayDecodeSize(sourceWidth, sourceHeight, width, height, devicePixelRatio)
    readonly property bool ready: image.status === Image.Ready && shader.item !== null && shader.item.status !== ShaderEffect.Error
    readonly property string errorString: image.status === Image.Error ? 'Monet presentation image decode failed' : shader.item && shader.item.status === ShaderEffect.Error ? shader.item.log : ''
    readonly property real plannedBytes: decodeSize.bytes
    readonly property real cacheBytes: image.status === Image.Ready ? decodeSize.bytes : 0
    property real progress: 1
    property real _from: 1
    property real _to: 1
    property bool _exiting: false
    signal exitFinished(var actor)
    opacity: _from + (_to - _from) * Motion.easeInOut(progress)
    function transition(target: real, immediate: bool): void {
        const current = opacity;
        fade.stop();
        _from = current;
        _to = target;
        progress = 0;
        if (immediate || current === target) {
            progress = 1;
            if (_exiting)
                exitFinished(root);
        } else
            fade.start();
    }
    function revive(target: real): void {
        const wasExiting = _exiting;
        _exiting = false;
        if (wasExiting || target !== _to)
            transition(target, false);
    }
    function retire(): void {
        if (_exiting)
            return;
        _exiting = true;
        transition(0, false);
    }
    Component.onDestruction: fade.stop()
    Image {
        id: image
        source: root.source
        sourceSize: Qt.size(root.decodeSize.width, root.decodeSize.height)
        asynchronous: true
        cache: false
        autoTransform: true
        visible: false
    }
    Loader {
        id: shader
        anchors.fill: parent
        active: image.status === Image.Ready
        sourceComponent: ShaderEffect {
            property var source: image
            property vector2d frameSize: Qt.vector2d(width, height)
            property vector2d imageSize: Qt.vector2d(root.sourceWidth, root.sourceHeight)
            property vector4d background: Qt.vector4d(root.backgroundColor.r, root.backgroundColor.g, root.backgroundColor.b, root.backgroundColor.a)
            property vector4d accent: Qt.vector4d(root.accentColor.r, root.accentColor.g, root.accentColor.b, root.accentColor.a)
            property vector3d drift: Qt.vector3d(root.driftPose.xPercent, root.driftPose.yPercent, root.driftPose.scale)
            property real positionX: root.positionX
            property real halfPane: root.halfPane ? 1 : 0
            property real rawImage: root.processed ? 0 : 1
            fragmentShader: Qt.resolvedUrl('picture.frag.qsb')
        }
    }
    NumberAnimation {
        id: fade
        target: root
        property: 'progress'
        from: 0
        to: 1
        duration: 800
        easing.type: Easing.Linear
        onFinished: if (root._exiting)
            root.exitFinished(root)
    }
}
