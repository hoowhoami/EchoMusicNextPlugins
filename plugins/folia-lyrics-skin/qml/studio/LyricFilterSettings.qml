pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme
import "../shared"
import "../shared/lyricFilter.mjs" as Filter

ColumnLayout {
    id: root
    objectName: 'foliaLyricFilterSettings'
    required property var settings
    required property var draft
    property string errorMessage: ""
    spacing: 12
    function commit(): void {
        try {
            Filter.compile(rule.text, true);
            errorMessage = "";
            const value = rule.text === Filter.defaultPattern ? '' : rule.text;
            if (value !== settings.lyricFilterRegex)
                draft.save({
                    lyricFilterRegex: value
                });
        } catch (error) {
            errorMessage = qsTr("正则表达式无效：%1").arg(String(error.message || error));
        }
    }
    Label {
        text: qsTr("歌词过滤")
        color: Theme.floatingText
        font: Theme.font(14, 600)
    }
    SettingsFields {
        Layout.fillWidth: true
        fields: [
            {
                key: 'lyricFilterEnabled',
                title: qsTr('隐藏匹配行'),
                kind: 'boolean'
            }
        ]
        settings: root.settings
        onPatchRequested: patch => root.draft.save(patch)
    }
    EchoTextField {
        id: rule
        objectName: "foliaLyricFilterRegex"
        Layout.fillWidth: true
        visible: root.settings.lyricFilterEnabled !== false
        text: root.settings.lyricFilterRegex || Filter.defaultPattern
        placeholderText: qsTr("过滤规则（正则表达式）")
        maximumLength: 4096
        onEditingFinished: root.commit()
    }
    Label {
        Layout.fillWidth: true
        visible: root.errorMessage.length > 0
        text: root.errorMessage
        color: Theme.floating.dangerText
        wrapMode: Text.Wrap
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("命中的行只在此歌词插件内隐藏")
            color: Theme.floatingSecondaryText
            wrapMode: Text.Wrap
        }
        EchoSoftButton {
            text: qsTr("恢复默认规则")
            colors: Theme.floating
            onClicked: {
                rule.text = Filter.defaultPattern;
                root.errorMessage = '';
                root.draft.save({
                    lyricFilterRegex: ''
                });
            }
        }
    }
}
