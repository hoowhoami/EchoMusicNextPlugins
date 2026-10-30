pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    required property var descriptor
    property bool live: true
    readonly property var output: texture
    readonly property bool ready: texture.sourceBytes > 0 && !texture.errorString
    readonly property string errorString: texture.errorString
    readonly property real cacheBytes: texture.cacheBytes + texture.sourceBytes
    readonly property var renderers: []
    FloatTexture {
        id: texture
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
    Component.onCompleted: texture.uploadPacked(descriptor.width, descriptor.height, descriptor.pixels)
}
