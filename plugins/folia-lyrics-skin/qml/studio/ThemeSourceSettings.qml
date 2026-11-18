pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme
import "../shared/theme/kernel.mjs" as Kernel
import "../shared/theme/project.mjs" as Project

ColumnLayout {
    id: root
    objectName: 'foliaThemeSettings'
    required property EchoPluginContext plugin
    required property var settings
    required property var draft
    property EchoPluginOperation _operation: null
    property ThemeEditor _editor: null
    property string errorMessage: ''
    readonly property var selected: Project.theme(settings)
    spacing: 12
    function acceptPixels(pixels: var): void {
        const value = JSON.parse(JSON.stringify(Kernel.generateBuiltinDualTheme(Kernel.extractColorsFromPixels(pixels, 5))));
        if (!draft.save({
            themeMode: 'ai',
            themeAi: value
        }))
            errorMessage = qsTr('未能保存生成的主题');
    }
    function generate(): void {
        errorMessage = '';
        if (_operation)
            return;
        if (!plugin.player.coverUrl.toString()) {
            acceptPixels([]);
            return;
        }
        _operation = plugin.assets.sampleImage(plugin.player.coverUrl, 50, 50);
        if (_operation.state >= EchoPluginOperation.Succeeded)
            finish();
    }
    function finish(): void {
        const operation = _operation;
        if (!operation || operation.state < EchoPluginOperation.Succeeded)
            return;
        _operation = null;
        // The reference uses its built-in random palette when the cover cannot be decoded.
        acceptPixels(operation.state === EchoPluginOperation.Succeeded ? Array.from(operation.result.pixels) : []);
    }
    function edit(): void {
        if (_editor)
            return;
        const mode = settings.themeMode === 'ai' ? 'ai' : 'custom';
        _editor = editorComponent.createObject(root, {
            plugin: plugin,
            initialTheme: JSON.parse(JSON.stringify(Project.dual(settings))),
            side: settings.themeDaylight ? 'light' : 'dark',
            commitTheme: value => draft.save(mode === 'ai' ? {
                    themeMode: mode,
                    themeAi: value
                } : {
                    themeMode: mode,
                    themeCustom: value
                })
        });
        _editor.open();
    }
    Component.onDestruction: if (_operation)
        _operation.cancel()
    Connections {
        target: root._operation
        function onCompleted(): void {
            root.finish();
        }
    }
    Label {
        text: qsTr('歌词主题')
        color: Theme.floatingText
        font: Theme.font(14, 600)
    }
    EchoSelect {
        objectName: 'foliaThemeSource'
        Layout.fillWidth: true
        colors: Theme.floating
        options: [
            {
                label: qsTr('默认'),
                value: 'default'
            },
            {
                label: qsTr('AI主题'),
                value: 'ai'
            },
            {
                label: qsTr('自定义'),
                value: 'custom'
            }
        ]
        value: root.settings.themeMode
        onValueEdited: value => root.draft.save({
                themeMode: value
            })
    }
    Label {
        Layout.fillWidth: true
        text: root.selected.name || qsTr('默认')
        color: Theme.floatingText
        wrapMode: Text.Wrap
    }
    RowLayout {
        Layout.fillWidth: true
        EchoSoftButton {
            objectName: 'foliaThemeDaylight'
            text: root.settings.themeDaylight ? qsTr('浅色') : qsTr('深色')
            colors: Theme.floating
            onClicked: root.draft.save({
                themeDaylight: !root.settings.themeDaylight
            })
        }
        Item {
            Layout.fillWidth: true
        }
        EchoSoftButton {
            objectName: 'foliaThemeGenerate'
            text: root._operation ? qsTr('生成中…') : qsTr('生成AI主题')
            colors: Theme.floating
            enabled: root._operation === null
            onClicked: root.generate()
        }
        EchoSoftButton {
            objectName: 'foliaThemeEdit'
            text: qsTr('编辑')
            colors: Theme.floating
            onClicked: root.edit()
        }
    }
    Label {
        Layout.fillWidth: true
        text: qsTr('生成使用封面取色与内置算法')
        color: Theme.floatingSecondaryText
        wrapMode: Text.Wrap
    }
    Label {
        Layout.fillWidth: true
        visible: root.errorMessage.length > 0
        text: root.errorMessage
        color: Theme.floating.dangerText
        wrapMode: Text.Wrap
    }
    Component {
        id: editorComponent
        ThemeEditor {
            onClosed: root._editor = null
        }
    }
}
