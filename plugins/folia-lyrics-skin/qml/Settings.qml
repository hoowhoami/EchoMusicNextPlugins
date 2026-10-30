pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Theme
import EchoMusic.Controls
import "shared"
import "preview"
import "shared/settingsPolicy.mjs" as Policy
import "shared/settingsReset.mjs" as Reset

ColumnLayout {
    id: root
    objectName: "foliaSettings"
    required property EchoPluginContext plugin
    required property EchoPluginViewContext page
    required property AppearanceConfiguration configuration
    readonly property var settings: drafts.values
    property var closeOperation: null
    property var randomOperation: null
    property string commandError: ""
    property bool previewExpanded: false
    readonly property var fieldDefinitions: plugin.ui.state.settingsFields || []
    readonly property var cappellaAssetStore: cappellaAssets.item
    readonly property SingleImagePanel monetAssetStore: monetAssets.item as SingleImagePanel
    readonly property var availableAssets: ({
            avatars: !!cappellaAssetStore && cappellaAssetStore.hasCustomAvatarPack,
            emojis: !!cappellaAssetStore && cappellaAssetStore.hasCustomEmojiPack,
            portrait: monetAssetStore !== null && monetAssetStore.selectedAsset !== null
        })
    function fieldForSettings(field: var): var {
        return Policy.assetField(field, availableAssets);
    }
    function groupDefaults(section: string): var {
        return Reset.resetPatch(configuration.defaults, section, settings.mode, settings.backgroundMode);
    }
    function persist(patch: var): void {
        const missing = Policy.unavailableSelection(patch, availableAssets);
        if (missing) {
            commandError = missing.collection === "avatars" ? qsTr("请先导入自定义头像") : missing.collection === "emojis" ? qsTr("请先导入自定义表情") : qsTr("请先导入自定义立绘");
            return;
        }
        commandError = drafts.save(patch) ? "" : drafts.errorString;
    }
    function resetGroup(patch: var): void {
        commandError = drafts.reset(patch) ? "" : drafts.errorString;
    }
    SettingsDraft {
        id: drafts
        objectName: "foliaSettingsDraft"
        committedValues: root.configuration.values
        commitBusy: root.configuration.busy
        commitError: root.configuration.errorMessage
        commitActive: root.configuration.active
        commitPatch: patch => root.configuration.patch(patch)
        onErrorStringChanged: if (errorString)
            root.commandError = errorString
    }
    readonly property var slotOptions: [
        {
            label: qsTr("循环模式"),
            value: "loop"
        },
        {
            label: qsTr("上一首"),
            value: "prev"
        },
        {
            label: qsTr("下一首"),
            value: "next"
        },
        {
            label: qsTr("收藏"),
            value: "like"
        },
        {
            label: qsTr("歌词时间轴"),
            value: "lyrics-timeline"
        },
        {
            label: qsTr("音量面板"),
            value: "volume"
        },
        {
            label: qsTr("播放队列"),
            value: "queue"
        },
    ]
    function showCloseResult(): void {
        if (closeOperation && closeOperation.state === EchoPluginOperation.Failed)
            commandError = closeOperation.errorMessage || qsTr("未能关闭皮肤设置");
    }
    function positionCapsule(): void {
        commandError = "";
        const current = plugin.ui.state;
        if (!plugin.ui.setState(Object.assign({}, current, {
            foliaBottomBarPositioningRequest: Number(current.foliaBottomBarPositioningRequest || 0) + 1
        }))) {
            commandError = qsTr("未能请求播放胶囊定位");
            return;
        }
        closeOperation = page.closeSkinSettings();
        if (closeOperation.state >= EchoPluginOperation.Succeeded)
            showCloseResult();
    }
    Connections {
        target: root.page
        function onAboutToClose(): void {
            const layerPanel = layerImageEditor.item as LayerImagesPanel;
            if (layerPanel)
                layerPanel.commitBeforeClose();
            drafts.release();
        }
    }
    Connections {
        target: root.closeOperation
        function onCompleted(): void {
            root.showCloseResult();
        }
    }
    Connections {
        target: root.randomOperation
        function onCompleted(): void {
            if (root.randomOperation.state === EchoPluginOperation.Failed)
                root.commandError = root.randomOperation.errorMessage;
        }
    }
    spacing: 16
    enabled: configuration.active
    Component.onDestruction: drafts.release()

    Label {
        Layout.fillWidth: true
        text: qsTr("Folia")
        color: Theme.floatingText
        font: root.plugin.fonts.build([], 18, 700)
    }
    Label {
        Layout.fillWidth: true
        text: qsTr("在播放页右上角切换样式。以下偏好在 Folia 样式间共用。")
        wrapMode: Text.Wrap
        color: Theme.floatingSecondaryText
        font: root.plugin.fonts.build([], 12)
    }
    EchoSelect {
        objectName: "foliaSettingsMode"
        Layout.fillWidth: true
        colors: Theme.floating
        options: (root.plugin.ui.state.styles || []).map(style => ({
                    label: style.title,
                    value: style.id
                }))
        value: root.settings.mode
        onValueEdited: nextValue => root.persist({
                mode: nextValue,
                randomVisualizerModePerSong: false
            })
    }
    Button {
        objectName: "foliaSettingsPreviewToggle"
        text: root.previewExpanded ? qsTr("收起预览") : qsTr("展开预览")
        onClicked: root.previewExpanded = !root.previewExpanded
    }
    PresentationScope {
        id: previewScope
        objectName: "foliaSettingsPreviewScope"
        Layout.fillWidth: true
        Layout.preferredHeight: root.previewExpanded ? 340 : 0
        visible: root.previewExpanded
        Loader {
            id: previewLoader
            objectName: "foliaSettingsPreviewLoader"
            anchors.fill: parent
            active: root.previewExpanded && previewScope.presented && root.configuration.active
            sourceComponent: PreviewPlayground {
                plugin: root.plugin
                settings: root.settings
                live: previewScope.presented && root.configuration.active
                motionEnabled: root.plugin.appearance.snapshot.motionEnabled !== false
            }
        }
    }
    SettingsGroupHeader {
        objectName: "foliaCommonSettings"
        title: qsTr("通用排版")
        resetValues: root.groupDefaults("common")
        onResetRequested: patch => root.resetGroup(patch)
    }
    Label {
        text: qsTr("歌词字号")
        color: Theme.floatingText
    }
    LyricFontScaleControl {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        mode: root.settings.mode
        value: root.settings.lyricsFontScale
        onValueEdited: value => root.persist({
                lyricsFontScale: value
            })
    }
    FontFamilyControl {
        Layout.fillWidth: true
        plugin: root.plugin
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    FontWeightControl {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        weight: root.settings.fontWeight
        onWeightEdited: value => root.persist({
                fontWeight: value
            })
    }
    SettingsFields {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        fields: root.fieldDefinitions.filter(field => field.key === "visualizerOpacity")
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    Label {
        text: qsTr("播放控件")
        color: Theme.floatingText
    }
    RandomPoolSettings {
        Layout.fillWidth: true
        settings: root.settings
        modes: root.plugin.ui.state.styles || []
        onPatchRequested: patch => root.persist(patch)
        onRefused: root.commandError = qsTr("随机样式池至少保留一种样式")
        onRerollRequested: {
            root.commandError = "";
            root.randomOperation = root.plugin.executeCommand("folia.random.reroll", {});
            if (root.randomOperation.state === EchoPluginOperation.Failed)
                root.commandError = root.randomOperation.errorMessage;
        }
    }
    EchoSelect {
        objectName: "foliaChromeVisibilityMode"
        Layout.fillWidth: true
        colors: Theme.floating
        options: [
            {
                label: qsTr("始终显示"),
                value: "always-visible"
            },
            {
                label: qsTr("自动隐藏"),
                value: "auto-hide"
            },
            {
                label: qsTr("始终隐藏"),
                value: "always-hidden"
            }
        ]
        value: root.settings.playerChromeVisibilityMode
        onValueEdited: nextValue => root.persist({
                playerChromeVisibilityMode: nextValue
            })
    }
    Label {
        visible: root.commandError.length > 0
        Layout.fillWidth: true
        text: root.commandError
        textFormat: Text.PlainText
        color: Theme.floating.dangerText
        wrapMode: Text.Wrap
    }
    Label {
        text: qsTr("胶囊左侧槽位")
        color: Theme.floatingText
    }
    EchoSelect {
        objectName: "foliaCapsulePrimarySlot"
        Layout.fillWidth: true
        colors: Theme.floating
        options: root.slotOptions
        value: root.settings.playerControlSlotPrimary
        onValueEdited: nextValue => root.persist({
                playerControlSlotPrimary: nextValue
            })
    }
    Label {
        text: qsTr("胶囊右侧槽位")
        color: Theme.floatingText
    }
    EchoSelect {
        objectName: "foliaCapsuleSecondarySlot"
        Layout.fillWidth: true
        colors: Theme.floating
        options: root.slotOptions
        value: root.settings.playerControlSlotSecondary
        onValueEdited: nextValue => root.persist({
                playerControlSlotSecondary: nextValue
            })
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("始终显示切歌箭头")
            color: Theme.floatingText
        }
        EchoSwitch {
            objectName: "foliaAlwaysShowTrackSwitchButtons"
            colors: Theme.floating
            checked: root.settings.alwaysShowTrackSwitchButtons
            onToggled: root.persist({
                alwaysShowTrackSwitchButtons: checked
            })
        }
    }
    Label {
        text: qsTr("胶囊底距")
        color: Theme.floatingText
    }
    SettingsSlider {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        objectName: "foliaCapsuleBottomOffset"
        Layout.fillWidth: true
        colors: Theme.floating
        from: 32
        to: Math.max(32, Math.round((root.Window.window ? root.Window.window.height : 328) / 2 - 132))
        stepSize: 1
        showValue: true
        valueSuffix: qsTr(" px")
        value: Math.min(to, root.settings.playerBottomBarOffset)
        enabled: to > from
        onMoved: root.persist({
            playerBottomBarOffset: Math.round(value)
        })
    }
    RowLayout {
        Layout.fillWidth: true
        EchoButton {
            objectName: "foliaCapsulePositioningEntry"
            Layout.fillWidth: true
            colors: Theme.floating
            text: qsTr("在播放页调节位置")
            enabled: root.page.active && root.page.player.hasTrack
            onClicked: root.positionCapsule()
        }
        EchoSoftButton {
            objectName: "foliaCapsuleOffsetReset"
            colors: Theme.floating
            text: qsTr("复位")
            onClicked: root.persist({
                playerBottomBarOffset: 32
            })
        }
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("显示歌词")
            color: Theme.floatingText
        }
        EchoSwitch {
            colors: Theme.floating
            checked: root.settings.showText
            onToggled: root.persist({
                showText: checked
            })
        }
    }
    SettingsGroupHeader {
        objectName: "foliaSubtitleSettings"
        title: qsTr("字幕")
        resetValues: root.groupDefaults("subtitle")
        onResetRequested: patch => root.resetGroup(patch)
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("隐藏译文字幕")
            color: Theme.floatingText
        }
        EchoSwitch {
            colors: Theme.floating
            checked: root.settings.hideTranslationSubtitle
            onToggled: root.persist({
                hideTranslationSubtitle: checked
            })
        }
    }
    SettingsFields {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        fields: root.fieldDefinitions.filter(field => field.group === "common" && field.key.indexOf("subtitle") === 0)
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    RowLayout {
        Layout.fillWidth: true
        Label {
            Layout.fillWidth: true
            text: qsTr("字幕字体跟随歌词")
            color: Theme.floatingText
        }
        EchoSwitch {
            colors: Theme.floating
            checked: root.settings.subtitleFontInheritsLyrics
            onToggled: root.persist({
                subtitleFontInheritsLyrics: checked
            })
        }
    }
    Loader {
        Layout.fillWidth: true
        active: !root.settings.subtitleFontInheritsLyrics
        visible: active
        sourceComponent: ColumnLayout {
            FontFamilyControl {
                Layout.fillWidth: true
                plugin: root.plugin
                settings: root.settings
                subtitle: true
                onPatchRequested: patch => root.persist(patch)
            }
            FontWeightControl {
                onEditStarted: drafts.hold()
                onEditCommitted: drafts.release()
                Layout.fillWidth: true
                subtitle: true
                weight: root.settings.subtitleFontWeight
                onWeightEdited: value => root.persist({
                        subtitleFontWeight: value
                    })
            }
        }
    }
    Label {
        text: qsTr("字幕字号")
        color: Theme.floatingText
    }
    SettingsSlider {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        objectName: "foliaSubtitleFontScale"
        Layout.fillWidth: true
        colors: Theme.floating
        from: .85
        to: 1.4
        stepSize: .05
        showValue: true
        value: root.settings.subtitleFontScale
        onMoved: root.persist({
            subtitleFontScale: value
        })
    }
    Label {
        objectName: "foliaHarmonySettings"
        text: qsTr("和声字幕")
        color: Theme.floatingText
        font: Theme.font(14, 600)
    }
    SettingsFields {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        fields: root.fieldDefinitions.filter(field => field.group === "harmony")
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    Label {
        text: qsTr("动态效果")
        color: Theme.floatingText
    }
    SettingsFields {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        fields: root.fieldDefinitions.filter(field => field.group === "common" && field.key !== "visualizerOpacity" && field.key.indexOf("subtitle") !== 0)
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    SettingsGroupHeader {
        objectName: "foliaStyleSettings"
        visible: root.settings.mode !== "still"
        title: qsTr("当前样式参数")
        resetValues: root.groupDefaults("style")
        onResetRequested: patch => root.resetGroup(patch)
    }
    SettingsFields {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        fields: root.fieldDefinitions.filter(field => field.group === root.settings.mode && field.key !== "temperaLayerImageDepth" && field.key !== "temperaLayerImageFrequency").map(field => root.fieldForSettings(field))
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    SettingsGroupHeader {
        objectName: "foliaBackgroundSettings"
        visible: root.settings.mode !== "still"
        title: qsTr("背景")
        resetValues: root.groupDefaults("background")
        onResetRequested: patch => root.resetGroup(patch)
    }
    SettingsFields {
        onEditStarted: drafts.hold()
        onEditCommitted: drafts.release()
        Layout.fillWidth: true
        fields: root.settings.mode !== "still" ? root.fieldDefinitions.filter(field => field.group === "background-common" || field.group === ({
                    sora: "sora-background",
                    common: "common-background",
                    nomand: "nomand-background",
                    monet: "monet-background"
                }[root.settings.backgroundMode] || "background")) : []
        settings: root.settings
        onPatchRequested: patch => root.persist(patch)
    }
    AssetPanel {
        id: fontAssetsPanel
        Layout.fillWidth: true
        plugin: root.plugin
        collection: "folia.fonts"
        title: qsTr("导入字体")
        fonts: true
    }
    Loader {
        Layout.fillWidth: true
        active: root.settings.mode !== "still" && ["monet", "nomand"].indexOf(root.settings.backgroundMode) >= 0
        sourceComponent: SingleImagePanel {
            plugin: root.plugin
            collection: "background.global"
            title: qsTr("自定义背景图片")
            onSelected: root.persist(root.settings.backgroundMode === "monet" ? {
                monetBackgroundSource: "uploaded-global"
            } : {
                nomandImageSource: "uploaded-global"
            })
            onEmptied: {
                const patch = {};
                if (root.settings.monetBackgroundSource === "uploaded-global")
                    patch.monetBackgroundSource = "cover-derived";
                if (root.settings.nomandImageSource === "uploaded-global")
                    patch.nomandImageSource = "cover-derived";
                if (Object.keys(patch).length)
                    root.persist(patch);
            }
        }
    }
    Loader {
        id: cappellaAssets
        Layout.fillWidth: true
        active: root.settings.mode === "cappella"
        sourceComponent: ColumnLayout {
            readonly property bool hasCustomAvatarPack: avatarAssetsPanel.assets.length > 0
            readonly property bool hasCustomEmojiPack: emojiAssetsPanel.assets.length > 0
            AssetPanel {
                id: avatarAssetsPanel
                Layout.fillWidth: true
                plugin: root.plugin
                collection: "cappella.avatars"
                title: qsTr("自定义头像")
                onEmptied: if (root.settings.cappellaAvatarSource === "custom")
                    root.persist({
                        cappellaAvatarSource: "builtin"
                    })
            }
            AssetPanel {
                id: emojiAssetsPanel
                Layout.fillWidth: true
                visible: root.settings.cappellaShowEmoMessages
                enabled: visible
                plugin: root.plugin
                collection: "cappella.emojis"
                title: qsTr("自定义表情")
                onEmptied: if (root.settings.cappellaEmojiPackSource === "custom")
                    root.persist({
                        cappellaEmojiPackSource: "builtin"
                    })
            }
        }
    }
    Loader {
        id: monetAssets
        Layout.fillWidth: true
        active: root.settings.mode === "monet"
        sourceComponent: SingleImagePanel {
            plugin: root.plugin
            collection: "monet.portraits"
            title: qsTr("自定义立绘")
            selectedHandle: root.settings.monetPortraitAsset
            onSelected: handle => root.persist({
                    monetPortraitAsset: handle
                })
            onEmptied: root.persist(root.settings.monetPortraitSource === "custom" ? {
                monetPortraitAsset: "",
                monetPortraitSource: "cover"
            } : {
                monetPortraitAsset: ""
            })
        }
    }
    WordColorsEditor {
        Layout.fillWidth: true
        entries: root.settings.wordColors
        onPatchRequested: patch => root.persist(patch)
    }
    Loader {
        id: layerImageEditor
        Layout.fillWidth: true
        active: root.settings.mode === "tempera"
        sourceComponent: LayerImagesPanel {
            plugin: root.plugin
            entries: root.settings.temperaLayerImages || []
            depth: root.settings.temperaLayerImageDepth
            frequency: root.settings.temperaLayerImageFrequency
            commitBusy: root.configuration.busy
            commitError: root.configuration.errorMessage
            commitActive: root.configuration.active
            commitPatch: patch => {
                const accepted = root.configuration.patch(patch);
                root.commandError = accepted ? "" : root.configuration.errorMessage;
                return accepted;
            }
        }
    }
}
