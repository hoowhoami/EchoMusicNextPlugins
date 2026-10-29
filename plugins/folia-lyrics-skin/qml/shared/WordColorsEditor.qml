pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Theme
import EchoMusic.Controls

ColumnLayout {
    id: root
    required property var entries
    signal patchRequested(var patch)
    spacing: 8
    function update(index: int, word: string, color: string): void {
        const next = entries.map(entry => ({
                    word: entry.word,
                    color: entry.color
                }));
        next[index] = {
            word: word,
            color: color
        };
        patchRequested({
            wordColors: next
        });
    }
    function remove(index: int): void {
        patchRequested({
            wordColors: entries.filter((_, at) => at !== index)
        });
    }
    Label {
        text: qsTr("情绪词配色")
        color: Theme.floatingText
    }
    Label {
        Layout.fillWidth: true
        text: qsTr("为歌词中的词语设置颜色。颜色格式为 #RRGGBB。")
        wrapMode: Text.Wrap
        color: Theme.floatingSecondaryText
    }
    Repeater {
        model: root.entries
        RowLayout {
            id: row
            required property var modelData
            required property int index
            Layout.fillWidth: true
            EchoTextField {
                id: word
                Layout.fillWidth: true
                colors: Theme.floating
                text: row.modelData.word
                maximumLength: 256
                Accessible.name: qsTr("着色词语")
                onEditingFinished: if (text !== row.modelData.word)
                    root.update(row.index, text.trim(), colorField.text.trim())
            }
            EchoTextField {
                id: colorField
                Layout.preferredWidth: 104
                colors: Theme.floating
                text: row.modelData.color
                maximumLength: 7
                Accessible.name: qsTr("词语颜色")
                onEditingFinished: if (text !== row.modelData.color)
                    root.update(row.index, word.text.trim(), text.trim())
            }
            EchoSoftButton {
                text: qsTr("移除")
                colors: Theme.floating
                onClicked: root.remove(row.index)
            }
        }
    }
    RowLayout {
        Layout.fillWidth: true
        EchoTextField {
            id: newWord
            objectName: "foliaNewColorWord"
            Layout.fillWidth: true
            colors: Theme.floating
            placeholderText: qsTr("添加词语")
            maximumLength: 256
        }
        EchoTextField {
            id: newColor
            Layout.preferredWidth: 104
            colors: Theme.floating
            text: "#31cfa1"
            maximumLength: 7
            Accessible.name: qsTr("新词语颜色")
        }
        EchoSoftButton {
            objectName: "foliaAddWordColor"
            text: qsTr("添加")
            colors: Theme.floating
            enabled: newWord.text.trim().length > 0 && root.entries.length < 256
            onClicked: root.patchRequested({
                wordColors: root.entries.concat([
                    {
                        word: newWord.text.trim(),
                        color: newColor.text.trim()
                    }
                ])
            })
        }
    }
}
