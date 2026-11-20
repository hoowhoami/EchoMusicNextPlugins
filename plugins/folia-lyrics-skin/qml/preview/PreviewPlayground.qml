// Explicit four-line preview. Its clock and rows never enter the playback page.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import QtQuick.Controls.Basic
import EchoMusic.PluginSdk
import "../shared"
import "../shared/typography.mjs" as Typography
import "samples.mjs" as Samples
import "../shared/theme/project.mjs" as FoliaTheme

Item {
    id: root
    required property EchoPluginContext plugin
    property var settings: ({})
    property var styles: plugin.ui.state.styles || []
    property var appearance: FoliaTheme.appearance(plugin.appearance.snapshot, settings)
    property size viewportSize: Qt.size(1100, 820)
    property bool live: true
    property bool showErrors: true
    property bool _retrying: false
    property bool paused: false
    property real initialTime: NaN
    property bool motionEnabled: true
    property int sampleIndex: 0
    property bool showControls: true
    readonly property string previewLabel: qsTr("预览示例 · 自撰文案与封面 · 模拟音频")
    readonly property bool presentationActive: live && visible && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    readonly property bool nativeGraphicsAvailable: GraphicsInfo.shaderType === GraphicsInfo.RhiShader && GraphicsInfo.api !== GraphicsInfo.Null && GraphicsInfo.api !== GraphicsInfo.Software
    readonly property var sample: Samples.samples[Math.max(0, Math.min(Samples.samples.length - 1, sampleIndex))]
    readonly property var previewScene: sceneLoader.item
    readonly property var sampleClock: previewScene ? previewScene.clock : null
    readonly property bool renderReady: !!previewScene && previewScene.renderReady
    readonly property string errorString: presentationAssets.errorString || (presentationActive && !nativeGraphicsAvailable ? qsTr("预览需要原生图形后端") : previewScene ? previewScene.errorString : "")
    implicitHeight: 340
    implicitWidth: 520
    function fontFor(translation: bool): font {
        return plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(settings, translation), plugin.fonts.families));
    }
    readonly property font lyricFont: fontFor(false)
    readonly property font subtitleFont: fontFor(true)

    Row {
        id: controls
        visible: root.showControls
        height: visible ? 34 : 0
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
        active: root.presentationActive && !root._retrying && root.nativeGraphicsAvailable
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
                initialTime: root.initialTime
                motionEnabled: root.motionEnabled
                customAvatarImages: presentationAssets.avatarImages
                customEmojiImages: presentationAssets.emojiImages
                customPortraitImages: presentationAssets.portraitImages
                customLayerImages: presentationAssets.layerImages
                customBackgroundImages: presentationAssets.backgroundImages
            }
        }
    }
    Text {
        id: label
        objectName: "foliaPreviewLabel"
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        text: root.previewLabel
        font: root.plugin.fonts.build([], 12)
        color: root.appearance.secondaryText
        wrapMode: Text.Wrap
    }
    PresentationAssets {
        id: presentationAssets
        plugin: root.plugin
        settings: root.settings
        live: root.presentationActive && !root._retrying
    }
    PresentationFailure {
        anchors.centerIn: sceneLoader
        width: Math.max(160, Math.min(root.width - 16, 400))
        detail: root.showErrors ? root.errorString : ""
        mode: root.settings.mode
        message: qsTr("预览暂时无法显示")
        canRetry: root.nativeGraphicsAvailable && root.presentationActive
        showSettings: false
        onRetryRequested: {
            root._retrying = true;
            retryTask.restart();
        }
    }
    Timer {
        id: retryTask
        interval: 0
        onTriggered: root._retrying = false
    }
}
