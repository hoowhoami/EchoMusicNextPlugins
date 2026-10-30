// Folia a8da4437 Tempera pool editor: draft settings, original-byte ZIP exchange.
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
    property var entries: []
    property string depth: "back"
    property real frequency: .6
    property var commitPatch: null
    property bool commitBusy: false
    property string commitError: ""
    property bool commitActive: true
    signal patchRequested(var patch)
    readonly property string errorString: store.errorString
    readonly property var assets: store.assets
    readonly property bool busy: store.busy
    readonly property string notice: store.notice
    readonly property var orderedAssets: (store.opened ? store.draft.images : entries).map(entry => store.assets.find(asset => asset.handle === entry.id)).filter(Boolean)
    readonly property var draftImages: store.draft.images
    readonly property bool editorOpen: store.opened
    spacing: 12
    function open(): void {
        store.open();
    }
    function closeEditor(): bool {
        return store.close();
    }
    function commitBeforeClose(): bool {
        return store.commitBeforeClose();
    }
    function placement(asset: var): var {
        return store.draft.images.find(entry => entry.id === asset.handle);
    }
    function update(handle: string, patch: var): void {
        store.edit(handle, patch);
    }
    LayerImageDraft {
        id: store
        objectName: "temperaImageStore"
        service: root.plugin.assets
        entries: root.entries
        depth: root.depth
        frequency: root.frequency
        commitPatch: root.commitPatch
        commitBusy: root.commitBusy
        commitError: root.commitError
        commitActive: root.commitActive
        onCommitted: patch => root.patchRequested(patch)
    }
    RowLayout {
        Label {
            Layout.fillWidth: true
            text: qsTr("自定义图片池 · %1 / 16 张").arg(root.entries.length)
            color: Theme.floatingText
        }
        EchoButton {
            objectName: "tempera.imagesManage"
            colors: Theme.floating
            text: qsTr("管理图片池")
            enabled: !store.busy
            onClicked: root.open()
        }
    }
    Label {
        Layout.fillWidth: true
        text: root.errorString || root.notice
        visible: !!text
        color: root.errorString ? Theme.floating.dangerText : Theme.floatingSecondaryText
        wrapMode: Text.Wrap
        textFormat: Text.PlainText
    }
    readonly property QtObject dialogs: QtObject {
        property Dialog imageEditor: Dialog {
            id: editor
            objectName: "temperaImageDialog"
            parent: root.Overlay.overlay
            visible: store.opened
            modal: true
            closePolicy: Popup.NoAutoClose
            title: qsTr("画布图片池")
            width: Math.min(720, parent ? parent.width - 40 : 640)
            height: Math.min(700, parent ? parent.height - 40 : 600)
            anchors.centerIn: parent
            background: EchoFloatingSurface {
                radius: 12
                border.color: Theme.floating.surfaceOutline
            }
            Overlay.modal: Rectangle {
                color: "#88000000"
                MouseArea {
                    anchors.fill: parent
                    onClicked: root.closeEditor()
                }
            }
            contentItem: ScrollView {
                id: viewport
                clip: true
                contentWidth: availableWidth
                ColumnLayout {
                    width: viewport.availableWidth
                    spacing: 12
                    SettingsFields {
                        Layout.fillWidth: true
                        enabled: !store.busy
                        settings: {
                            return {
                                depth: store.draft.depth,
                                frequency: store.draft.frequency
                            };
                        }
                        fields: [
                            {
                                key: "depth",
                                title: qsTr("图层位置"),
                                kind: "select",
                                options: [
                                    {
                                        label: qsTr("文字后方"),
                                        value: "back"
                                    },
                                    {
                                        label: qsTr("文字前方"),
                                        value: "front"
                                    }
                                ]
                            },
                            {
                                key: "frequency",
                                title: qsTr("出现频率"),
                                kind: "range",
                                from: 0,
                                to: 1,
                                step: .05
                            }
                        ]
                        onPatchRequested: patch => store.setTuning(patch)
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 64
                        radius: 8
                        color: imageDrop.containsDrag ? Theme.floating.hover : "transparent"
                        border.color: Theme.floating.surfaceOutline
                        EchoPluginImageDropArea {
                            id: imageDrop
                            objectName: "tempera.imagesDrop"
                            anchors.fill: parent
                            assets: root.plugin.assets
                            collection: "tempera.images"
                            maxCount: 16 - store.draft.images.length
                            archiveJsonPaths: ["meta.json", "pool.json"]
                            enabled: store.opened && !store.busy
                            onImportStarted: operation => store.acceptDrop(operation)
                            onArchiveDropped: archive => store.acceptArchiveDrop(archive)
                        }
                        Label {
                            anchors.centerIn: parent
                            text: store.busy ? qsTr("正在处理…") : store.draft.images.length >= 16 ? qsTr("图片池已满 · 仍可拖入 ZIP 查看导入结果") : qsTr("拖入图片或 ZIP，或点击下方添加图片")
                            color: Theme.floatingSecondaryText
                            textFormat: Text.PlainText
                        }
                    }
                    Flow {
                        Layout.fillWidth: true
                        spacing: 8
                        EchoButton {
                            objectName: "tempera.imagesImport"
                            colors: Theme.floating
                            text: qsTr("添加图片")
                            enabled: !store.busy && store.draft.images.length < 16
                            onClicked: store.add()
                        }
                        EchoButton {
                            objectName: "tempera.archiveAppend"
                            colors: Theme.floating
                            text: qsTr("追加导入 ZIP")
                            enabled: !store.busy
                            onClicked: store.importArchive("append")
                        }
                        EchoButton {
                            objectName: "tempera.archiveReplace"
                            colors: Theme.floating
                            text: qsTr("替换导入 ZIP")
                            enabled: !store.busy
                            onClicked: store.draft.images.length ? replaceConfirmation.open() : store.importArchive("replace")
                        }
                        EchoButton {
                            objectName: "tempera.archiveExport"
                            colors: Theme.floating
                            text: qsTr("导出 ZIP")
                            enabled: !store.busy && store.draft.images.length > 0
                            onClicked: store.exportArchive()
                        }
                        EchoButton {
                            objectName: "tempera.imagesClear"
                            colors: Theme.floating
                            text: qsTr("清空")
                            enabled: !store.busy && store.draft.images.length > 0
                            onClicked: store.clear()
                        }
                    }
                    Label {
                        Layout.fillWidth: true
                        text: store.busy ? qsTr("正在处理…") : qsTr("%1 / 16 张 · 关闭后保存本次修改").arg(store.draft.images.length)
                        color: Theme.floatingSecondaryText
                        wrapMode: Text.Wrap
                    }
                    Label {
                        Layout.fillWidth: true
                        text: root.errorString || root.notice
                        visible: !!text
                        color: root.errorString ? Theme.floating.dangerText : Theme.floatingSecondaryText
                        wrapMode: Text.Wrap
                        textFormat: Text.PlainText
                    }
                    Repeater {
                        model: root.orderedAssets
                        ColumnLayout {
                            id: entry
                            required property var modelData
                            readonly property var position: root.placement(modelData) || ({
                                    align: "free",
                                    verticalAlign: "bottom",
                                    scale: .7,
                                    opacity: 1
                                })
                            Layout.fillWidth: true
                            RowLayout {
                                AssetImage {
                                    Layout.preferredWidth: 64
                                    Layout.preferredHeight: 64
                                    source: entry.modelData.url
                                    sourceSize: Qt.size(128, 128)
                                    prepareFrames: false
                                    playing: false
                                    live: store.opened && !store.busy
                                }
                                Label {
                                    Layout.fillWidth: true
                                    text: entry.modelData.name
                                    color: Theme.floatingText
                                    textFormat: Text.PlainText
                                    elide: Text.ElideMiddle
                                }
                                EchoButton {
                                    text: qsTr("移除")
                                    colors: Theme.floating
                                    enabled: !store.busy
                                    onClicked: store.remove(entry.modelData.handle)
                                }
                            }
                            SettingsFields {
                                Layout.fillWidth: true
                                enabled: !store.busy
                                settings: entry.position
                                fields: [
                                    {
                                        key: "align",
                                        title: qsTr("水平位置"),
                                        kind: "select",
                                        options: [
                                            {
                                                label: qsTr("自由"),
                                                value: "free"
                                            },
                                            {
                                                label: qsTr("左"),
                                                value: "left"
                                            },
                                            {
                                                label: qsTr("中"),
                                                value: "center"
                                            },
                                            {
                                                label: qsTr("右"),
                                                value: "right"
                                            }
                                        ]
                                    },
                                    {
                                        key: "verticalAlign",
                                        title: qsTr("垂直位置"),
                                        kind: "select",
                                        options: [
                                            {
                                                label: qsTr("自由"),
                                                value: "free"
                                            },
                                            {
                                                label: qsTr("上"),
                                                value: "top"
                                            },
                                            {
                                                label: qsTr("中"),
                                                value: "center"
                                            },
                                            {
                                                label: qsTr("下"),
                                                value: "bottom"
                                            }
                                        ]
                                    },
                                    {
                                        key: "scale",
                                        title: qsTr("大小"),
                                        kind: "range",
                                        from: .05,
                                        to: 2,
                                        step: .01
                                    },
                                    {
                                        key: "opacity",
                                        title: qsTr("透明度"),
                                        kind: "range",
                                        from: 0,
                                        to: 1,
                                        step: .01
                                    }
                                ]
                                onPatchRequested: patch => root.update(entry.modelData.handle, patch)
                            }
                        }
                    }
                }
            }
            footer: DialogButtonBox {
                EchoButton {
                    objectName: "tempera.imagesDone"
                    colors: Theme.floating
                    text: qsTr("完成")
                    enabled: !store.busy
                    onClicked: root.closeEditor()
                }
            }
            Shortcut {
                sequence: "Escape"
                enabled: store.opened && !store.busy
                onActivated: root.closeEditor()
            }
        }
        property Dialog replacementEditor: Dialog {
            id: replaceConfirmation
            parent: root.Overlay.overlay
            modal: true
            anchors.centerIn: parent
            title: qsTr("替换导入")
            standardButtons: Dialog.Ok | Dialog.Cancel
            width: Math.min(440, parent ? parent.width - 40 : 440)
            contentItem: Label {
                text: qsTr("关闭并保存后将替换当前 %1 张图片，是否继续？").arg(store.draft.images.length)
                color: Theme.floatingText
                wrapMode: Text.Wrap
            }
            onAccepted: store.importArchive("replace")
        }
    }
}
