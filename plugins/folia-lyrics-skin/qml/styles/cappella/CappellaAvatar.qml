// Cover uses the source 3x3 crop; built-in/custom images use a full circular crop.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import EchoMusic.PluginSdk
import "../../shared"
import "kernel.mjs" as Chat

Item {
    id: root
    objectName: "cappellaAvatar"
    property url imageUrl
    property EchoPluginAssets assetsService: null
    property int avatarIndex: 0
    property bool useGrid: false
    property bool live: true
    property bool motionEnabled: true
    property color primaryColor: "white"
    property color accentColor: "#8b5cf6"
    property color secondaryColor: "#333333"
    readonly property var crop: Chat.avatarCrop(avatarIndex)
    readonly property string errorString: portrait.errorString
    width: 40
    height: 40
    Rectangle {
        anchors.fill: parent
        radius: 20
        color: root.secondaryColor
        layer.enabled: true
        layer.effect: MultiEffect {
            shadowEnabled: true
            shadowColor: "#50000000"
            shadowBlur: .4
            shadowVerticalOffset: 5
        }
    }
    Item {
        id: content
        anchors.fill: parent
        visible: false
        Rectangle {
            anchors.fill: parent
            color: root.secondaryColor
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop {
                    position: 0
                    color: root.primaryColor
                }
                GradientStop {
                    position: 1
                    color: root.accentColor
                }
            }
        }
        AssetImage {
            id: portrait
            objectName: "cappellaAvatarImage"
            source: root.imageUrl
            assetsService: root.assetsService
            prepareFrames: root.assetsService && root.useGrid || !!source && !/\.(png|jpe?g|svg)(?:[?#]|$)/i.test(String(source))
            live: root.live
            asynchronous: true
            autoTransform: true
            cache: false
            playing: root.live && root.visible && root.motionEnabled
            width: root.useGrid ? 120 : 40
            height: root.useGrid ? 120 : 40
            x: root.useGrid ? -40 * root.crop.column : 0
            y: root.useGrid ? -40 * root.crop.row : 0
            fillMode: Image.PreserveAspectCrop
            sourceSize.width: root.useGrid ? 240 : 80
            sourceSize.height: root.useGrid ? 240 : 80
        }
    }
    Rectangle {
        id: mask
        anchors.fill: parent
        radius: 20
        visible: false
        layer.enabled: true
    }
    MultiEffect {
        anchors.fill: parent
        source: content
        maskEnabled: true
        maskSource: mask
        autoPaddingEnabled: false
    }
    Rectangle {
        anchors.fill: parent
        radius: 20
        color: "transparent"
        border.width: 1
        border.color: "#3dffffff"
    }
}
