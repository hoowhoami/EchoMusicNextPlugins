pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Theme
import EchoMusic.Controls

ColumnLayout {
    id: root
    required property EchoPluginContext plugin
    required property string collection
    required property string title
    property bool fonts: false
    signal imported(var assets)
    signal emptied
    readonly property var assets: store.assets
    readonly property string errorString: store.errorString || previewError()
    function imageError(target: var): string {
        return target ? target.errorString || "" : "";
    }
    function previewError(): string {
        for (const entry of rows.contentItem.children) {
            if (entry && entry.imageError)
                return entry.imageError;
        }
        return "";
    }
    spacing: 8
    AssetCollection {
        id: store
        plugin: root.plugin
        collection: root.collection
        fonts: root.fonts
        live: root.visible
        onImported: added => root.imported(added)
        onEmptied: root.emptied()
    }
    Label {
        text: root.title
        color: Theme.floatingText
    }
    RowLayout {
        EchoButton {
            objectName: root.collection + "Import"
            text: qsTr("导入")
            enabled: !store.busy
            colors: Theme.floating
            onClicked: store.importFiles()
        }
        EchoButton {
            objectName: root.collection + "Clear"
            text: qsTr("清空")
            enabled: !store.busy && store.assets.length > 0
            colors: Theme.floating
            onClicked: store.clear()
        }
        Label {
            text: store.busy ? qsTr("正在处理…") : qsTr("%1 个文件").arg(store.assets.length)
            color: Theme.floatingSecondaryText
        }
    }
    Label {
        Layout.fillWidth: true
        visible: root.errorString.length > 0
        text: root.errorString
        color: Theme.floating.dangerText
        wrapMode: Text.Wrap
        textFormat: Text.PlainText
    }
    // Only visible rows and a bounded reuse pool own delegates or image decoders.
    ListView {
        id: rows
        Layout.fillWidth: true
        Layout.preferredHeight: Math.min(6, count) * 48
        model: store.assets
        clip: true
        reuseItems: true
        cacheBuffer: 0
        delegate: RowLayout {
            id: entry
            required property var modelData
            required property int index
            property bool pooled: false
            ListView.onPooled: pooled = true
            ListView.onReused: pooled = false
            readonly property string imageError: root.imageError(preview.item)
            width: rows.width
            height: 48
            Loader {
                id: preview
                active: !root.fonts && !entry.pooled && entry.modelData.kind === "image" && root.visible && !store.busy
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                sourceComponent: AssetImage {
                    assetsService: root.plugin.assets
                    source: entry.modelData.url
                    sourceSize: Qt.size(80, 80)
                    fillMode: Image.PreserveAspectFit
                    asynchronous: true
                    autoTransform: true
                    cache: false
                    playing: root.visible && !store.busy
                }
            }
            Label {
                Layout.fillWidth: true
                text: entry.modelData.name
                color: Theme.floatingText
                elide: Text.ElideMiddle
                textFormat: Text.PlainText
            }
            EchoButton {
                text: qsTr("移除")
                enabled: !store.busy
                colors: Theme.floating
                onClicked: store.remove(entry.modelData.handle)
            }
        }
    }
}
