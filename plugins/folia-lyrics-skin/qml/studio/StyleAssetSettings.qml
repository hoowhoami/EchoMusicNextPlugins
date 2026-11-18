pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Layouts
import EchoMusic.PluginSdk
import "../shared"

ColumnLayout {
    id: root
    required property EchoPluginContext plugin
    required property var settings
    required property var draft
    spacing: 16
    Loader {
        Layout.fillWidth: true
        active: root.settings.mode === 'cappella' && root.settings.cappellaAvatarSource === 'custom'
        visible: active
        sourceComponent: AssetPanel {
            plugin: root.plugin
            collection: 'cappella.avatars'
            title: qsTr('自定义头像')
        }
    }
    Loader {
        Layout.fillWidth: true
        active: root.settings.mode === 'cappella' && root.settings.cappellaEmojiPackSource === 'custom'
        visible: active
        sourceComponent: AssetPanel {
            plugin: root.plugin
            collection: 'cappella.emojis'
            title: qsTr('自定义表情')
        }
    }
    Loader {
        Layout.fillWidth: true
        active: root.settings.mode === 'monet' && root.settings.monetPortraitSource === 'custom'
        visible: active
        sourceComponent: SingleImagePanel {
            plugin: root.plugin
            collection: 'monet.portraits'
            title: qsTr('肖像图片')
            selectedHandle: root.settings.monetPortraitAsset || ''
            onSelected: handle => root.draft.save({
                    monetPortraitAsset: handle
                })
            onEmptied: root.draft.save({
                monetPortraitAsset: ''
            })
        }
    }
    Loader {
        Layout.fillWidth: true
        active: root.settings.mode === 'tempera'
        visible: active
        sourceComponent: LayerImagesPanel {
            plugin: root.plugin
            entries: root.settings.temperaLayerImages || []
            depth: root.settings.temperaLayerImageDepth || 'back'
            frequency: root.settings.temperaLayerImageFrequency
            commitPatch: patch => root.draft.save(patch)
            commitBusy: root.draft.commitBusy
            commitError: root.draft.errorString
            commitActive: root.draft.commitActive
        }
    }
}
