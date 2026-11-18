pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    property EchoPluginGraphics graphicsService: null
    required property var descriptor
    property bool live: true
    readonly property var output: texture
    readonly property bool ready: texture.sourceBytes > 0 && !texture.errorString
    readonly property string errorString: texture.errorString
    readonly property real cacheBytes: texture.cacheBytes + texture.sourceBytes
    readonly property var renderers: []
    FloatTexture {
        id: texture
        graphics: root.graphicsService
        width: 1
        height: 1
        active: root.live
    }
    Connections {
        target: root.Window.window
        function onVisibilityChanged() {
            if (root.live && root.Window.window.visibility !== Window.Hidden && root.Window.window.visibility !== Window.Minimized)
                texture.uploadPacked(root.descriptor.width, root.descriptor.height, root.descriptor.pixels);
        }
    }
    function upload(): void {
        if (live && graphicsService && Window.window && Window.window.visible)
            texture.uploadPacked(descriptor.width, descriptor.height, descriptor.pixels);
    }
    Timer {
        id: uploadLater
        interval: 0
        onTriggered: root.upload()
    }
    onGraphicsServiceChanged: uploadLater.restart()
    onLiveChanged: uploadLater.restart()
    onVisibleChanged: uploadLater.restart()
    Component.onCompleted: uploadLater.restart()
}
