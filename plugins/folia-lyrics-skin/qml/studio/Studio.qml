pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme
import "../shared"

Item {
    id: root
    objectName: "foliaStyleStudio"
    required property EchoPluginContext plugin
    required property EchoPluginDialog dialog
    readonly property bool wide: width >= 960
    readonly property var settings: drafts.values
    readonly property var styles: plugin.ui.state.styles || []
    readonly property var preview: previewPane
    implicitHeight: 650
    implicitWidth: 1192
    focus: true
    Component.onCompleted: forceActiveFocus()
    Keys.onEscapePressed: event => {
        drafts.release();
        dialog.close();
        event.accepted = true;
    }
    StudioConfiguration {
        id: configuration
        plugin: root.plugin
    }
    SettingsDraft {
        id: drafts
        committedValues: configuration.values
        commitBusy: configuration.busy
        commitError: configuration.errorMessage
        commitActive: configuration.active
        commitPatch: patch => configuration.patch(patch)
    }
    ScrollView {
        id: viewport
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.bottom: errorLabel.visible ? errorLabel.top : parent.bottom
        objectName: "foliaStudioBodyViewport"
        contentWidth: availableWidth
        clip: true
        ScrollBar.vertical: EchoScrollBar {
            resourceActive: !root.wide
        }
        GridLayout {
            width: viewport.availableWidth
            height: root.wide ? viewport.availableHeight : implicitHeight
            columns: root.wide ? 2 : 1
            columnSpacing: 22
            rowSpacing: 22
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: root.wide
                Layout.preferredWidth: root.wide ? root.width - 420 - 22 : root.width
                Layout.minimumWidth: 0
                spacing: 14
                StudioPreview {
                    id: previewPane
                    objectName: "foliaStudioPreview"
                    Layout.fillWidth: true
                    Layout.preferredHeight: root.wide ? Math.max(230, Math.min(370, root.height * .56)) : Math.max(220, Math.min(340, width * .65))
                    plugin: root.plugin
                    settings: root.settings
                    live: root.wide || viewport.contentItem.contentY < height
                }
                StyleShelf {
                    Layout.fillWidth: true
                    Layout.fillHeight: root.wide
                    Layout.preferredHeight: 225
                    styles: root.styles
                    settings: root.settings
                    wide: root.wide
                    onSelected: mode => {
                        drafts.save(mode === "__random__" ? {
                            randomVisualizerModePerSong: true
                        } : {
                            mode,
                            randomVisualizerModePerSong: false
                        });
                        editor.tab = 0;
                    }
                }
            }
            StudioSettings {
                id: editor
                objectName: "foliaStudioSettings"
                Layout.fillWidth: true
                Layout.fillHeight: root.wide
                Layout.preferredWidth: root.wide ? 420 : root.width
                Layout.minimumWidth: 0
                plugin: root.plugin
                draft: drafts
                settings: root.settings
                bounded: root.wide
                sampleIndex: previewPane.sampleIndex
                onSampleSelected: index => previewPane.sampleIndex = index
            }
        }
    }
    Label {
        id: errorLabel
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        visible: text.length > 0
        text: drafts.errorString
        color: Theme.floating.dangerText
        wrapMode: Text.Wrap
    }
}
