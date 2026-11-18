pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme
import "../preview"

ColumnLayout {
    id: root
    required property EchoPluginContext plugin
    required property var settings
    property string source: "builtin"
    property bool paused: false
    property int sampleIndex: 0
    property bool live: true
    property var frozenCapture: null
    property bool capturePending: false
    property int captureRevision: 0
    property real sampleResumeTime: NaN
    property var lifetime: ({
            active: true
        })
    readonly property string pictureKey: JSON.stringify([source, sampleIndex, settings])
    readonly property var preview: previewHost.item
    readonly property bool renderReady: !!preview && preview.renderReady
    readonly property string errorString: preview ? preview.errorString : ""
    function freeze(): void {
        if (!paused || !preview || !preview.visible || !renderReady || capturePending)
            return;
        if (source === "builtin" && preview.sampleClock)
            sampleResumeTime = preview.sampleClock.timeSeconds;
        capturePending = true;
        const revision = ++captureRevision, target = preview, guard = lifetime;
        target.grabToImage(result => {
            if (!guard.active || revision !== root.captureRevision)
                return;
            root.capturePending = false;
            if (!root.paused || target !== root.preview)
                return;
            root.frozenCapture = result;
            target.visible = false;
        });
    }
    function thaw(): void {
        ++captureRevision;
        capturePending = false;
        if (preview)
            preview.visible = true;
        if (!paused)
            frozenCapture = null;
    }
    onPausedChanged: paused ? freeze() : thaw()
    onPictureKeyChanged: if (paused) {
        thaw();
        freezeLater.restart();
    }
    onRenderReadyChanged: if (paused)
        freeze()
    Component.onDestruction: lifetime.active = false
    Timer {
        id: freezeLater
        interval: 0
        onTriggered: root.freeze()
    }
    spacing: 8
    RowLayout {
        Layout.fillWidth: true
        EchoTabBar {
            objectName: "foliaStudioPreviewSource"
            Layout.preferredWidth: 200
            labels: [qsTr("示例"), qsTr("正在播放")]
            currentIndex: root.source === "live" ? 1 : 0
            compact: true
            colors: Theme.floating
            onPicked: index => root.source = index === 1 ? "live" : "builtin"
        }
        Item {
            Layout.fillWidth: true
        }
        EchoIconButton {
            objectName: "foliaStudioPreviewPause"
            glyph: root.paused ? "play" : "pause"
            text: root.paused ? qsTr("继续预览") : qsTr("暂停预览")
            onClicked: root.paused = !root.paused
        }
    }
    Rectangle {
        Layout.fillWidth: true
        Layout.fillHeight: true
        Layout.minimumHeight: 170
        color: Theme.floating.card
        radius: Theme.cardRadius
        clip: true
        Loader {
            id: previewHost
            objectName: "foliaStudioPreviewHost"
            anchors.fill: parent
            active: root.live && root.plugin.active && root.visible && root.Window.window && root.Window.window.visible && root.Window.window.opacity > 0 && root.Window.window.visibility !== Window.Minimized
            sourceComponent: root.source === "live" ? livePreview : samplePreview
        }
        Image {
            anchors.fill: parent
            source: root.frozenCapture ? root.frozenCapture.url : ""
            visible: root.paused && root.frozenCapture !== null
            fillMode: Image.PreserveAspectFit
            cache: false
        }
    }
    Label {
        Layout.fillWidth: true
        text: root.errorString || (root.source === "live" ? (root.plugin.player.hasTrack ? root.plugin.player.title : qsTr("当前没有正在播放的歌曲")) : qsTr("自撰示例歌词 · 模拟预览音频"))
        color: root.errorString ? Theme.floating.dangerText : Theme.floatingSecondaryText
        font: Theme.font(12, 400)
        wrapMode: Text.Wrap
    }
    Component {
        id: samplePreview
        PreviewPlayground {
            plugin: root.plugin
            settings: root.settings
            paused: root.paused
            initialTime: root.sampleResumeTime
            sampleIndex: root.sampleIndex
            showControls: false
        }
    }
    Component {
        id: livePreview
        LivePreview {
            plugin: root.plugin
            settings: root.settings
            paused: root.paused
        }
    }
}
