// Explicit four-line preview. Its clock and rows never enter the playback page.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import QtQuick.Controls.Basic
import EchoMusic.PluginSdk
import "../shared"
import "../shared/typography.mjs" as Typography
import "samples.mjs" as Samples

Item {
    id: root
    required property EchoPluginContext plugin
    property var settings: ({})
    property var styles: plugin.ui.state.styles || []
    property var appearance: plugin.appearance.snapshot
    property size viewportSize: Qt.size(1100, 820)
    property bool live: true
    property bool paused: false
    property bool motionEnabled: true
    property int sampleIndex: 0
    readonly property string previewLabel: qsTr("预览示例 · 自撰文案与封面 · 模拟音频")
    readonly property bool presentationActive: live && visible && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    readonly property bool nativeGraphicsAvailable: GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null && GraphicsInfo.api !== GraphicsInfo.Software
    readonly property var sample: Samples.samples[Math.max(0, Math.min(Samples.samples.length - 1, sampleIndex))]
    readonly property var previewScene: sceneLoader.item
    readonly property var sampleClock: previewScene ? previewScene.clock : null
    readonly property bool renderReady: !!previewScene && previewScene.renderReady
    readonly property string errorString: presentationActive && !nativeGraphicsAvailable ? qsTr("预览需要原生图形后端") : previewScene ? previewScene.errorString : ""
    implicitHeight: 340
    implicitWidth: 520
    function fontFor(translation: bool): font {
        return plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(settings, translation), plugin.fonts.families));
    }
    readonly property font lyricFont: fontFor(false)
    readonly property font subtitleFont: fontFor(true)

    Row {
        id: controls
        height: 34
        spacing: 8
        ComboBox {
            objectName: "foliaPreviewSampleChoice"
            width: Math.max(120, Math.min(190, root.width - pauseButton.width - 16))
            model: Samples.samples
            textRole: "title"
            currentIndex: root.sampleIndex
            onActivated: index => root.sampleIndex = index
        }
        Button {
            id: pauseButton
            objectName: "foliaPreviewPause"
            text: root.paused ? qsTr("继续预览") : qsTr("暂停预览")
            onClicked: root.paused = !root.paused
        }
    }
    Loader {
        id: sceneLoader
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: controls.bottom
        anchors.topMargin: 6
        anchors.bottom: label.top
        anchors.bottomMargin: 6
        active: root.presentationActive && root.nativeGraphicsAvailable
        sourceComponent: Component {
            PreviewScene {
                plugin: root.plugin
                sample: root.sample
                settings: root.settings
                styles: root.styles
                appearance: root.appearance
                baseFont: root.lyricFont
                subtitleFont: root.subtitleFont
                viewportSize: root.viewportSize
                paused: root.paused
                motionEnabled: root.motionEnabled
                customAvatarImages: avatars.assets
                customEmojiImages: emojis.assets
                customPortraitImages: root.settings.monetPortraitAsset ? portraits.assets.filter(asset => asset.handle === root.settings.monetPortraitAsset) : portraits.assets.slice(0, 1)
                customLayerImages: layers.assets
                customBackgroundImages: backgrounds.assets
            }
        }
    }
    Text {
        id: label
        objectName: "foliaPreviewLabel"
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        text: root.errorString || root.previewLabel
        font: root.plugin.fonts.build([], 12)
        color: root.errorString ? "#f56565" : root.appearance.secondaryText
        wrapMode: Text.Wrap
    }
    AssetCollection { id: fonts; plugin: root.plugin; collection: "folia.fonts"; fonts: true; live: root.presentationActive }
    AssetCollection { id: avatars; plugin: root.plugin; collection: "cappella.avatars"; live: root.presentationActive && root.settings.mode === 'cappella' }
    AssetCollection { id: emojis; plugin: root.plugin; collection: "cappella.emojis"; live: root.presentationActive && root.settings.mode === 'cappella' }
    AssetCollection { id: portraits; plugin: root.plugin; collection: "monet.portraits"; live: root.presentationActive && root.settings.mode === 'monet' }
    AssetCollection { id: layers; plugin: root.plugin; collection: "tempera.images"; live: root.presentationActive && root.settings.mode === 'tempera' }
    AssetCollection { id: backgrounds; plugin: root.plugin; collection: "background.global"; live: root.presentationActive && root.settings.mode !== 'still' && ['monet', 'nomand'].indexOf(root.settings.backgroundMode) >= 0 }
}
