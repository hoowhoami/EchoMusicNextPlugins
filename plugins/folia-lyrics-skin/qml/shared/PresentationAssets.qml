// Each presentation owns its native asset/font leases; only the current style loads.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    required property EchoPluginContext plugin
    required property var settings
    property bool live: true
    property bool fontLive: live
    readonly property var avatarImages: avatars.assets
    readonly property var emojiImages: emojis.assets
    readonly property var portraitImages: settings.monetPortraitAsset ? portraits.assets.filter(asset => asset.handle === settings.monetPortraitAsset) : portraits.assets.slice(0, 1)
    readonly property var layerImages: layers.assets
    readonly property var backgroundImages: backgrounds.assets
    readonly property string errorString: fonts.errorString || avatars.errorString || emojis.errorString || portraits.errorString || layers.errorString || backgrounds.errorString
    AssetCollection {
        id: fonts
        plugin: root.plugin
        collection: 'folia.fonts'
        fonts: true
        live: root.fontLive
    }
    AssetCollection {
        id: avatars
        plugin: root.plugin
        collection: 'cappella.avatars'
        live: root.live && root.settings.mode === 'cappella'
    }
    AssetCollection {
        id: emojis
        plugin: root.plugin
        collection: 'cappella.emojis'
        live: root.live && root.settings.mode === 'cappella'
    }
    AssetCollection {
        id: portraits
        plugin: root.plugin
        collection: 'monet.portraits'
        live: root.live && root.settings.mode === 'monet'
    }
    AssetCollection {
        id: layers
        plugin: root.plugin
        collection: 'tempera.images'
        live: root.live && root.settings.mode === 'tempera'
    }
    AssetCollection {
        id: backgrounds
        plugin: root.plugin
        collection: 'background.global'
        live: root.live && root.settings.mode !== 'still' && ['monet', 'nomand'].includes(root.settings.backgroundMode)
    }
}
