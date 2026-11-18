pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme
import "../shared/theme/kernel.mjs" as Kernel

EchoDialog {
    id: root
    required property EchoPluginContext plugin
    required property var initialTheme
    required property var commitTheme
    property string side: 'dark'
    property var draft: JSON.parse(JSON.stringify(initialTheme))
    property bool importing: false
    property string errorMessage: ""
    property EchoPluginOperation _copy: null
    property EchoColorPickerDialog _picker: null
    heading: qsTr('编辑歌词主题')
    preferredWidth: 640
    windowHeightMargin: 48
    objectName: 'foliaThemeEditor'
    function edit(key: string, value: string): void {
        const next = JSON.parse(JSON.stringify(draft));
        next[side][key] = value;
        draft = next;
    }
    function copyFinished(): void {
        if (!_copy || _copy.state < EchoPluginOperation.Succeeded)
            return;
        errorMessage = _copy.state === EchoPluginOperation.Failed ? _copy.errorMessage : '';
        _copy = null;
    }
    onClosed: destroy()
    Component.onDestruction: if (_copy)
        _copy.cancel()
    Connections {
        target: root._copy
        function onCompleted(): void {
            root.copyFinished();
        }
    }
    body: ScrollView {
        id: viewport
        contentWidth: availableWidth
        implicitHeight: form.implicitHeight
        clip: true
        ScrollBar.vertical: EchoScrollBar {
            resourceActive: root.visible
        }
        ColumnLayout {
            id: form
            width: viewport.availableWidth
            spacing: 14
            EchoTabBar {
                Layout.fillWidth: true
                labels: [qsTr('亮色主题'), qsTr('暗色主题')]
                currentIndex: root.side === 'light' ? 0 : 1
                colors: Theme.floating
                onPicked: index => root.side = index === 0 ? 'light' : 'dark'
            }
            EchoTextField {
                objectName: 'foliaThemeName'
                Layout.fillWidth: true
                placeholderText: qsTr('主题名称')
                maximumLength: 128
                text: root.draft[root.side].name || ''
                onTextEdited: root.edit('name', text)
            }
            Repeater {
                model: [
                    {
                        key: 'backgroundColor',
                        label: qsTr('背景')
                    },
                    {
                        key: 'primaryColor',
                        label: qsTr('主文本')
                    },
                    {
                        key: 'accentColor',
                        label: qsTr('强调色')
                    },
                    {
                        key: 'secondaryColor',
                        label: qsTr('辅助色')
                    }
                ]
                RowLayout {
                    id: row
                    required property var modelData
                    Layout.fillWidth: true
                    Label {
                        Layout.fillWidth: true
                        text: row.modelData.label
                        color: Theme.floatingText
                    }
                    Rectangle {
                        width: 24
                        height: 24
                        radius: 5
                        color: root.draft[root.side][row.modelData.key]
                        border.color: Theme.floating.surfaceOutline
                    }
                    EchoSoftButton {
                        objectName: 'foliaThemeColor-' + row.modelData.key
                        text: root.draft[root.side][row.modelData.key]
                        colors: Theme.floating
                        onClicked: {
                            if (root._picker)
                                return;
                            root._picker = colorPicker.createObject(root, {
                                value: text,
                                title: row.modelData.label,
                                targetKey: row.modelData.key
                            });
                            root._picker.open();
                        }
                    }
                }
            }
            Loader {
                id: jsonInput
                Layout.fillWidth: true
                active: root.importing
                visible: active
                sourceComponent: ColumnLayout {
                    EchoTextArea {
                        id: jsonText
                        objectName: 'foliaThemeJson'
                        Layout.fillWidth: true
                        Layout.preferredHeight: 140
                        placeholderText: qsTr('粘贴主题 JSON（{ light: {...}, dark: {...} }）')
                        wrapMode: TextEdit.Wrap
                    }
                    EchoSoftButton {
                        objectName: 'foliaThemeJsonApply'
                        text: qsTr('应用 JSON')
                        colors: Theme.floating
                        onClicked: {
                            try {
                                if (jsonText.text.length > 131072)
                                    throw new Error(qsTr('主题 JSON 过长'));
                                const parsed = JSON.parse(jsonText.text);
                                if (!parsed || !parsed.light || !parsed.dark)
                                    throw new Error(qsTr('需要 light 和 dark 两侧主题'));
                                root.draft = Kernel.sanitizeDualTheme(parsed, root.draft);
                                root.importing = false;
                                root.errorMessage = '';
                            } catch (error) {
                                root.errorMessage = String(error.message || error);
                            }
                        }
                    }
                }
            }
            Label {
                Layout.fillWidth: true
                visible: root.errorMessage.length > 0
                text: root.errorMessage
                color: Theme.floating.dangerText
                wrapMode: Text.Wrap
            }
        }
    }
    footerContent: RowLayout {
        spacing: 8
        EchoSoftButton {
            objectName: 'foliaThemeJsonImport'
            text: qsTr('导入 JSON')
            colors: Theme.floating
            onClicked: root.importing = !root.importing
        }
        EchoSoftButton {
            text: qsTr('复制 JSON')
            colors: Theme.floating
            enabled: root._copy === null
            onClicked: {
                root._copy = root.plugin.clipboard.write(JSON.stringify(root.draft, null, 2));
                root.copyFinished();
            }
        }
        Item {
            Layout.fillWidth: true
        }
        EchoSoftButton {
            text: qsTr('重置')
            colors: Theme.floating
            onClicked: {
                root.draft = JSON.parse(JSON.stringify(root.initialTheme));
                root.errorMessage = '';
            }
        }
        EchoButton {
            objectName: 'foliaThemeSave'
            text: qsTr('保存主题')
            colors: Theme.floating
            onClicked: {
                const value = JSON.parse(JSON.stringify(Kernel.sanitizeDualTheme(root.draft, root.initialTheme)));
                if (root.commitTheme(value))
                    root.close();
                else
                    root.errorMessage = qsTr('未能保存主题，请检查内容与设置状态');
            }
        }
    }
    Component {
        id: colorPicker
        EchoColorPickerDialog {
            required property string targetKey
            onConfirmed: color => root.edit(targetKey, color)
            onClosed: {
                root._picker = null;
                destroy();
            }
        }
    }
}
