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
    property string selectedHandle: ""
    readonly property var selectedAsset: store.assets.find(asset => asset.handle === selectedHandle) || (!selectedHandle && store.assets.length ? store.assets[0] : null)
    readonly property string errorString: store.errorString || imageError(preview.item)
    function imageError(target: var): string {
        return target ? target.errorString || "" : "";
    }
    signal selected(string handle)
    signal emptied
    spacing: 8
    AssetCollection {
        id: store
        plugin: root.plugin
        collection: root.collection
        live: root.visible
        onImported: added => {
            if (added.length) {
                root.selected(added[0].handle);
                retainOnly(added[0].handle);
            }
        }
        onEmptied: root.emptied()
    }
    Label {
        text: root.title
        color: Theme.floatingText
    }
    RowLayout {
        EchoButton {
            objectName: root.collection + "Import"
            text: qsTr("导入图片")
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
            text: store.busy ? qsTr("正在处理…") : root.selectedAsset ? root.selectedAsset.name : qsTr("未导入图片")
            color: Theme.floatingSecondaryText
            Layout.fillWidth: true
            elide: Text.ElideMiddle
            textFormat: Text.PlainText
        }
    }
    Loader {
        id: preview
        active: root.visible && !store.busy && root.selectedAsset !== null
        Layout.preferredWidth: 96
        Layout.preferredHeight: 96
        sourceComponent: AssetImage {
            assetsService: root.plugin.assets
            source: root.selectedAsset ? root.selectedAsset.url : ""
            sourceSize: Qt.size(192, 192)
            fillMode: Image.PreserveAspectFit
            asynchronous: true
            autoTransform: true
            cache: false
            playing: root.visible && !store.busy
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
}
