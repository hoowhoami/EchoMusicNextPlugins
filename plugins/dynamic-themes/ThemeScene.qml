pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import EchoMusic.Theme
import "SceneData.mjs" as Data

Item {
    id: root
    objectName: "dynamicThemeScene"
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    required property string kind
    required property url poster
    required property url background
    readonly property bool effect: kind === "prism" || kind === "golden-ribbon"
    readonly property bool animated: page.active && visible && plugin.appearance.snapshot.motionEnabled && configuration.values.enabled && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    readonly property real speed: configuration.values.speed
    clip: true
    Loader {
        anchors.fill: parent
        sourceComponent: root.effect && GraphicsInfo.api !== GraphicsInfo.Software ? realtimeEffect : picture
    }
    Component {
        id: picture
        Image {
            objectName: "dynamicThemeBackgroundImage"
            source: root.effect ? root.poster : root.background
            sourceSize: Qt.size(Math.min(2760, Math.ceil(width * Screen.devicePixelRatio)), Math.min(1560, Math.ceil(height * Screen.devicePixelRatio)))
            fillMode: Image.PreserveAspectCrop
            asynchronous: true
        }
    }
    Component {
        id: realtimeEffect
        ShaderEffect {
            objectName: "dynamicThemeRealtimeEffect"
            property real phase: 0
            property vector2d viewportSize: Qt.vector2d(Math.max(1, width), Math.max(1, height))
            property real controlVariable: root.kind === "prism" ? 1 - Math.cos(phase + Math.PI / 2) : 2200 * Math.sin(phase)
            fragmentShader: root.kind === "prism" ? "shaders/prism.frag.qsb" : "shaders/golden-ribbon.frag.qsb"
            NumberAnimation on phase {
                objectName: "dynamicThemeEffectClock"
                from: 0
                to: 2 * Math.PI
                duration: (root.kind === "prism" ? 36000 : 30000) / root.speed
                loops: Animation.Infinite
                running: root.animated
            }
        }
    }
    Loader {
        anchors.fill: parent
        active: root.kind === "autumn"
        sourceComponent: FallingLeaves {
            animated: root.animated
            speed: root.speed
        }
    }
    Loader {
        anchors.fill: parent
        active: !root.effect && root.kind !== "autumn"
        sourceComponent: SpriteScene {
            animated: root.animated
            speed: root.speed
            atlas: "assets/" + root.kind + "/sprites.png"
            layers: Data.scenes[root.kind]
        }
    }
}
