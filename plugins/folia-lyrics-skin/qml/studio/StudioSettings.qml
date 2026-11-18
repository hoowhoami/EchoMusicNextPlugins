pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Controls
import EchoMusic.Theme
import EchoMusic.PluginSdk
import "../shared"
import "../../entry.mjs" as Backend

ColumnLayout {
    id: root
    required property EchoPluginContext plugin
    required property var draft
    required property var settings
    property bool bounded: true
    property int tab: 0
    property int sampleIndex: 0
    signal sampleSelected(int index)
    readonly property var allFields: plugin.ui.state.settingsFields || []
    readonly property var subtitleFields: allFields.filter(field => field.key.startsWith("subtitle") || field.group === "harmony")
    readonly property var fields: tab === 0 ? allFields.filter(field => field.group === settings.mode && !["monetPortraitAsset"].includes(field.key)) : tab === 1 ? allFields.filter(field => field.group === "background-common" || field.group === settings.backgroundMode + "-background" || field.group === "background" && settings.backgroundMode === "latent") : tab === 3 ? subtitleFields : allFields.filter(field => field.key === "animationIntensity" || field.group === "global")
    spacing: 16
    function resetTab(): void {
        let keys = fields.map(field => field.key);
        if (tab === 0 && settings.randomVisualizerModePerSong)
            keys = ["randomVisualizerModes"];
        if (tab === 2)
            keys = ["lyricsFontScale", "fontWeight", "fontStyle", "fontFamilies", "visualizerOpacity"];
        if (tab === 3)
            keys = keys.concat(["subtitleFontScale", "subtitleFontWeight", "subtitleFontStyle", "subtitleFontFamilies", "subtitleFontInheritsLyrics", "hideTranslationSubtitle"]);
        if (tab === 4)
            keys = keys.concat(["showText", "playerChromeVisibilityMode", "lyricFilterEnabled", "lyricFilterRegex", "themeMode", "themeDaylight", "themeAi", "themeCustom"]);
        const patch = {};
        for (const key of keys)
            if (key in Backend.defaults)
                patch[key] = Backend.defaults[key];
        draft.reset(patch);
    }
    RowLayout {
        Layout.fillWidth: true
        EchoTabBar {
            objectName: "foliaStudioTabs"
            Layout.fillWidth: true
            labels: [qsTr("动画"), qsTr("背景"), qsTr("字体"), qsTr("字幕"), qsTr("全局")]
            colors: Theme.floating
            compact: true
            currentIndex: root.tab
            onPicked: index => {
                root.tab = index;
                viewport.contentItem.contentY = 0;
            }
        }
        EchoSoftButton {
            objectName: "foliaStudioResetTab"
            size: EchoControlSize.Compact
            Layout.alignment: Qt.AlignVCenter
            text: qsTr("默认")
            colors: Theme.floating
            onClicked: root.resetTab()
        }
    }
    ScrollView {
        id: viewport
        objectName: "foliaStudioSettingsViewport"
        Layout.fillWidth: true
        Layout.fillHeight: root.bounded
        Layout.preferredHeight: root.bounded ? 1 : form.implicitHeight
        contentWidth: availableWidth
        clip: true
        ScrollBar.vertical: EchoScrollBar {
            resourceActive: root.bounded
        }
        ColumnLayout {
            id: form
            width: viewport.availableWidth
            spacing: 18
            Label {
                Layout.fillWidth: true
                text: root.tab === 0 ? (root.plugin.ui.state.styles || []).find(style => style.id === root.settings.mode)?.title || "" : ["", qsTr("背景"), qsTr("歌词字体"), qsTr("字幕"), qsTr("全局")][root.tab]
                font: Theme.font(14, 600)
                color: Theme.floatingText
            }
            Loader {
                visible: active
                Layout.fillWidth: true
                active: root.tab === 0 && root.settings.randomVisualizerModePerSong
                sourceComponent: RandomPoolSettings {
                    settings: root.settings
                    modes: root.plugin.ui.state.styles || []
                    onPatchRequested: patch => root.draft.save(patch)
                    onRerollRequested: root.plugin.executeCommand("folia.random.reroll", {})
                    onRefused: root.plugin.toast.warning(qsTr("至少保留一种样式"))
                }
            }
            SettingsFields {
                Layout.fillWidth: true
                visible: root.tab !== 2 && !(root.tab === 0 && root.settings.randomVisualizerModePerSong)
                fields: root.fields
                settings: root.settings
                onPatchRequested: patch => root.draft.save(patch)
                onEditStarted: root.draft.hold()
                onEditCommitted: root.draft.release()
            }
            Loader {
                Layout.fillWidth: true
                visible: active
                active: root.tab === 0
                sourceComponent: StyleAssetSettings {
                    plugin: root.plugin
                    settings: root.settings
                    draft: root.draft
                }
            }
            Loader {
                Layout.fillWidth: true
                visible: active
                active: root.tab === 1 && ['monet', 'nomand'].includes(root.settings.backgroundMode)
                sourceComponent: AssetPanel {
                    plugin: root.plugin
                    collection: 'background.global'
                    title: qsTr('背景图片')
                }
            }
            Loader {
                visible: active
                Layout.fillWidth: true
                active: root.tab === 2
                sourceComponent: ColumnLayout {
                    spacing: 18
                    Label {
                        text: qsTr("预览文本")
                        color: Theme.floatingText
                    }
                    EchoSelect {
                        Layout.fillWidth: true
                        colors: Theme.floating
                        value: root.sampleIndex
                        options: [
                            {
                                label: qsTr("示例 · 微光"),
                                value: 0
                            },
                            {
                                label: qsTr("示例 · 节奏"),
                                value: 1
                            }
                        ]
                        onValueEdited: value => root.sampleSelected(value)
                    }
                    FontFamilyControl {
                        Layout.fillWidth: true
                        plugin: root.plugin
                        settings: root.settings
                        onPatchRequested: patch => root.draft.save(patch)
                    }
                    AssetPanel {
                        Layout.fillWidth: true
                        plugin: root.plugin
                        collection: 'folia.fonts'
                        title: qsTr('导入字体')
                        fonts: true
                    }
                    SettingsFields {
                        Layout.fillWidth: true
                        fields: [
                            {
                                key: "lyricsFontScale",
                                title: qsTr("歌词缩放"),
                                kind: "range",
                                from: .5,
                                to: 2,
                                step: .05
                            },
                            {
                                key: "fontWeight",
                                title: qsTr("字重"),
                                kind: "select",
                                options: [
                                    {
                                        label: qsTr("跟随样式"),
                                        value: null
                                    }
                                ].concat([100, 200, 300, 400, 500, 600, 700, 800, 900].map(weight => ({
                                            label: String(weight),
                                            value: weight
                                        })))
                            },
                            {
                                key: "visualizerOpacity",
                                title: qsTr("画面透明度"),
                                kind: "range",
                                from: .2,
                                to: 1,
                                step: .05
                            }
                        ]
                        settings: root.settings
                        onPatchRequested: patch => root.draft.save(patch)
                        onEditStarted: root.draft.hold()
                        onEditCommitted: root.draft.release()
                    }
                }
            }
            Loader {
                visible: active
                Layout.fillWidth: true
                active: root.tab === 3
                sourceComponent: ColumnLayout {
                    spacing: 18
                    SettingsFields {
                        Layout.fillWidth: true
                        fields: [
                            {
                                key: "hideTranslationSubtitle",
                                title: qsTr("隐藏翻译"),
                                kind: "boolean"
                            },
                            {
                                key: "subtitleFontInheritsLyrics",
                                title: qsTr("字幕跟随歌词字体"),
                                kind: "boolean"
                            },
                            {
                                key: "subtitleFontScale",
                                title: qsTr("字幕缩放"),
                                kind: "range",
                                from: .5,
                                to: 2,
                                step: .05
                            }
                        ]
                        settings: root.settings
                        onPatchRequested: patch => root.draft.save(patch)
                        onEditStarted: root.draft.hold()
                        onEditCommitted: root.draft.release()
                    }
                    FontFamilyControl {
                        Layout.fillWidth: true
                        visible: !root.settings.subtitleFontInheritsLyrics
                        plugin: root.plugin
                        subtitle: true
                        settings: root.settings
                        onPatchRequested: patch => root.draft.save(patch)
                    }
                }
            }
            Loader {
                visible: active
                Layout.fillWidth: true
                active: root.tab === 4
                sourceComponent: ColumnLayout {
                    spacing: 18
                    LyricFilterSettings {
                        Layout.fillWidth: true
                        settings: root.settings
                        draft: root.draft
                    }
                    ThemeSourceSettings {
                        Layout.fillWidth: true
                        plugin: root.plugin
                        settings: root.settings
                        draft: root.draft
                    }
                    SettingsFields {
                        Layout.fillWidth: true
                        fields: [
                            {
                                key: "showText",
                                title: qsTr("显示歌词"),
                                kind: "boolean"
                            },
                            {
                                key: "playerChromeVisibilityMode",
                                title: qsTr("播放控件"),
                                kind: "select",
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
                            }
                        ]
                        settings: root.settings
                        onPatchRequested: patch => root.draft.save(patch)
                    }
                    Label {
                        text: qsTr("歌词时间")
                        color: Theme.floatingText
                        font: Theme.font(14, 600)
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        EchoSoftButton {
                            text: qsTr("延后")
                            colors: Theme.floating
                            onClicked: root.plugin.lyrics.command("offset", {
                                value: 1,
                                revision: root.plugin.player.revision
                            })
                        }
                        Label {
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignHCenter
                            text: qsTr("%1 毫秒").arg(root.plugin.player.lyricsInfo.offsetMs)
                            color: Theme.floatingText
                        }
                        EchoSoftButton {
                            text: qsTr("提前")
                            colors: Theme.floating
                            onClicked: root.plugin.lyrics.command("offset", {
                                value: -1,
                                revision: root.plugin.player.revision
                            })
                        }
                        EchoSoftButton {
                            text: qsTr("复位")
                            colors: Theme.floating
                            onClicked: root.plugin.lyrics.command("resetOffset", {
                                revision: root.plugin.player.revision
                            })
                        }
                    }
                }
            }
        }
    }
}
