// Folia a8da4437 FontTiles + FontPicker + FontFallbackStackControl.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Theme
import EchoMusic.Controls
import "typography.mjs" as Typography

ColumnLayout {
    id: root
    required property EchoPluginContext plugin
    required property var settings
    property bool subtitle: false
    readonly property string prefix: subtitle ? "subtitleFont" : "font"
    readonly property string controlPrefix: subtitle ? "foliaSubtitleFont" : "foliaFont"
    readonly property string style: settings[prefix + "Style"] || "sans"
    readonly property var families: settings[prefix + "Families"] || ["follow"]
    readonly property string primary: Typography.primaryFamily(families)
    readonly property string choice: primary ? "custom" : style
    readonly property bool customOpen: choice === "custom" || _choosingCustom
    readonly property var choices: [
        {
            value: "sans",
            title: qsTr("无衬线")
        },
        {
            value: "serif",
            title: qsTr("衬线")
        },
        {
            value: "mono",
            title: qsTr("等宽")
        },
        {
            value: "custom",
            title: qsTr("自定义")
        }
    ]
    property bool _choosingCustom: false
    property bool _completed: false
    property string errorString: ""
    signal patchRequested(var patch)
    spacing: 8
    function patchFamily(next: var): void {
        const patch = {};
        patch[prefix + "Families"] = next;
        patchRequested(patch);
    }
    function selectChoice(next: string): void {
        errorString = "";
        if (next === "custom") {
            _choosingCustom = true;
            return;
        }
        _choosingCustom = false;
        const patch = {};
        patch[prefix + "Style"] = next;
        patch[prefix + "Families"] = ["follow"];
        patchRequested(patch);
    }
    function previewFont(value: string): font {
        const chosen = value === "custom" ? {
            fontStyle: "sans",
            fontFamilies: primary ? [primary] : ["follow"]
        } : {
            fontStyle: value,
            fontFamilies: ["follow"]
        };
        return plugin.fonts.build(Typography.availableFamilies(Typography.resolveFamilies(chosen, false), plugin.fonts.families), 20, 400);
    }
    function syncDraft(): void {
        if (_completed && customHost.item)
            customHost.item.fallbackEditor.text = Typography.fallbackFamilies(families).join(", ");
    }
    function commitFallback(): void {
        if (!_completed || !customOpen || !customHost.item)
            return;
        const editor = customHost.item.fallbackEditor;
        const next = Typography.parseFallbackDraft(editor.text);
        if (next.length > 15 || next.some(family => family.length > 256)) {
            errorString = qsTr("备用字体最多 15 项，每项最多 256 个字符。");
            return;
        }
        errorString = "";
        const normalized = next.join(", ");
        editor.text = normalized;
        const current = Typography.fallbackFamilies(families);
        if (JSON.stringify(current) !== JSON.stringify(next))
            patchFamily(Typography.withFallback(families, next));
    }
    onFamiliesChanged: syncDraft()
    Component.onCompleted: {
        _completed = true;
        syncDraft();
    }
    Component.onDestruction: _completed = false
    GridLayout {
        Layout.fillWidth: true
        columns: 4
        uniformCellWidths: true
        columnSpacing: 8
        Repeater {
            id: tiles
            model: root.choices
            EchoButton {
                id: tile
                required property var modelData
                required property int index
                objectName: root.controlPrefix + "Style" + modelData.value[0].toUpperCase() + modelData.value.slice(1)
                Layout.fillWidth: true
                Layout.preferredHeight: 72
                colors: Theme.floating
                accent: root.choice === modelData.value
                Accessible.name: modelData.title
                Accessible.description: root.choice === modelData.value ? qsTr("已选择") : ""
                contentItem: Column {
                    spacing: 4
                    Text {
                        width: parent.width
                        text: "永Aa"
                        horizontalAlignment: Text.AlignHCenter
                        color: tile.foreground
                        font: root.previewFont(tile.modelData.value)
                    }
                    Text {
                        width: parent.width
                        text: tile.modelData.title
                        horizontalAlignment: Text.AlignHCenter
                        color: tile.foreground
                        font: Theme.font(12, 500)
                    }
                }
                onClicked: root.selectChoice(modelData.value)
                Keys.onPressed: event => {
                    if (event.key === Qt.Key_Left || event.key === Qt.Key_Right || event.key === Qt.Key_Up || event.key === Qt.Key_Down) {
                        const step = event.key === Qt.Key_Left || event.key === Qt.Key_Up ? -1 : 1;
                        tiles.itemAt((index + step + 4) % 4).forceActiveFocus(Qt.TabFocusReason);
                        event.accepted = true;
                    } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                        root.selectChoice(modelData.value);
                        event.accepted = true;
                    }
                }
            }
        }
    }
    Loader {
        id: customHost
        Layout.fillWidth: true
        active: root.customOpen
        visible: active
        onLoaded: root.syncDraft()
        sourceComponent: ColumnLayout {
            property alias fallbackEditor: fallback
            Label {
                text: qsTr("自定义主字体")
                color: Theme.floatingSecondaryText
            }
            EchoSelect {
                objectName: root.controlPrefix + "Families"
                Layout.fillWidth: true
                colors: Theme.floating
                filterable: true
                clearable: true
                placeholder: qsTr("默认字体链 / 未选自定义")
                options: {
                    const available = root.plugin.fonts.families;
                    const values = available.map(family => ({
                                label: family,
                                value: family
                            }));
                    if (root.primary && available.indexOf(root.primary) < 0)
                        values.unshift({
                            label: qsTr("字体暂不可用：%1").arg(root.primary),
                            value: root.primary,
                            disabled: true
                        });
                    return values;
                }
                value: root.primary
                onValueEdited: next => root.patchFamily(Typography.withPrimary(root.families, String(next || "")))
            }
            Label {
                text: qsTr("有序备用字体（逗号或换行分隔）")
                color: Theme.floatingSecondaryText
            }
            EchoTextArea {
                id: fallback
                objectName: root.controlPrefix + "Fallbacks"
                Layout.fillWidth: true
                Layout.preferredHeight: 84
                colors: Theme.floating
                placeholderText: "Songti SC, Menlo"
                selectByMouse: true
                onActiveFocusChanged: if (!activeFocus)
                    root.commitFallback()
                Keys.onPressed: event => {
                    if ((event.key === Qt.Key_Return || event.key === Qt.Key_Enter) && (event.modifiers & (Qt.ControlModifier | Qt.MetaModifier))) {
                        root.commitFallback();
                        event.accepted = true;
                    }
                }
            }
            EchoSoftButton {
                colors: Theme.floating
                text: qsTr("应用备用字体")
                onClicked: root.commitFallback()
            }
        }
    }
    Label {
        Layout.fillWidth: true
        visible: !!root.errorString
        text: root.errorString
        color: Theme.floating.dangerText
        wrapMode: Text.Wrap
        textFormat: Text.PlainText
    }
}
