// Folia a8da4437 RandomPoolGroup: a nonempty pool, not fourteen live renderers.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme

ColumnLayout {
    id: root
    required property var settings
    required property var modes
    signal patchRequested(var patch)
    signal rerollRequested()
    signal refused()
    readonly property var pool: Array.from(settings.randomVisualizerModes || [])
    spacing: 8

    function toggle(mode: string, selected: bool): void {
        const next = pool.filter(value => value !== mode);
        if (selected)
            next.push(mode);
        if (!next.length) {
            refused();
            return;
        }
        patchRequested({ randomVisualizerModes: next });
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("每首歌随机样式")
            color: Theme.floatingText
        }
        EchoSwitch {
            objectName: "foliaRandomPerSong"
            colors: Theme.floating
            checked: root.settings.randomVisualizerModePerSong === true
            onToggled: root.patchRequested({ randomVisualizerModePerSong: checked })
        }
    }
    ColumnLayout {
        visible: root.settings.randomVisualizerModePerSong === true
        Layout.fillWidth: true
        RowLayout {
            Layout.fillWidth: true
            Label {
                Layout.fillWidth: true
                text: qsTr("已选 %1/%2").arg(root.pool.length).arg(root.modes.length)
                color: Theme.floatingSecondaryText
            }
            EchoSoftButton {
                objectName: "foliaRandomSelectAll"
                colors: Theme.floating
                text: qsTr("全选")
                enabled: root.pool.length !== root.modes.length
                onClicked: root.patchRequested({ randomVisualizerModes: root.modes.map(mode => mode.id) })
            }
        }
        GridLayout {
            Layout.fillWidth: true
            columns: 2
            Repeater {
                model: root.modes
                CheckBox {
                    id: choice
                    required property var modelData
                    Layout.fillWidth: true
                    objectName: "foliaRandomChoice-" + modelData.id
                    text: modelData.title
                    checked: root.pool.indexOf(modelData.id) >= 0
                    onClicked: {
                        root.toggle(modelData.id, checked);
                        // A refused last removal or async write still shows the accepted value.
                        checked = Qt.binding(() => root.pool.indexOf(choice.modelData.id) >= 0);
                    }
                }
            }
        }
        EchoSoftButton {
            objectName: "foliaRandomReroll"
            Layout.fillWidth: true
            colors: Theme.floating
            text: qsTr("本首换一个")
            enabled: root.pool.some(mode => mode !== root.settings.mode)
            onClicked: root.rerollRequested()
        }
        Label {
            Layout.fillWidth: true
            text: qsTr("切歌时从所选样式中抽取，优先避开当前样式。每种样式保留自己的设置。")
            textFormat: Text.PlainText
            wrapMode: Text.Wrap
            color: Theme.floatingSecondaryText
        }
    }
}
