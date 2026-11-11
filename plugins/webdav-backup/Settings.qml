pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.PluginSdk
import EchoMusic.Controls
import EchoMusic.Theme
import "./entry.mjs" as Backend

ColumnLayout {
    id: root
    objectName: "webdavBackupSettings"
    required property EchoPluginContext plugin
    property bool draftEnabled: false
    property bool rememberPassword: false
    property bool saving: false
    property bool testing: false
    property bool loaded: false
    property string resultMessage: ""
    property bool resultError: false
    property var lifetime: ({
            active: true
        })
    property var connectionTest: null
    readonly property bool busy: saving || testing || !loaded
    readonly property var state: plugin.ui.state
    spacing: 14
    implicitWidth: 520

    function values(): var {
        return {
            enabled: draftEnabled,
            url: server.text,
            username: username.text,
            password: password.text,
            directory: directory.text,
            rememberPassword: rememberPassword
        };
    }
    function adopt(config: var): void {
        draftEnabled = config.enabled === true;
        rememberPassword = config.rememberPassword === true;
        server.text = config.url || "";
        username.text = config.username || "";
        password.text = config.password || "";
        directory.text = config.directory || "EchoMusicNext";
    }
    function clearMessage(): void {
        resultMessage = "";
    }
    function read(): void {
        const guard = lifetime;
        Backend.awaitOperation(plugin.executeCommand("settings.read", {})).then(function (config) {
            if (!guard.active)
                return;
            root.adopt(config);
            root.loaded = true;
        }, function (error) {
            if (!guard.active)
                return;
            root.loaded = true;
            root.resultError = true;
            root.resultMessage = String(error);
        });
    }
    function test(): void {
        testing = true;
        resultMessage = "";
        const guard = lifetime;
        let task;
        try {
            connectionTest = Backend.createConnectionTest(plugin, values());
            task = connectionTest.promise;
        } catch (error) {
            task = Promise.reject(error);
        }
        task.then(function () {
            if (!guard.active)
                return;
            root.testing = false;
            root.resultError = false;
            root.resultMessage = qsTr("连接成功，备份目录已就绪");
        }, function (error) {
            if (!guard.active)
                return;
            root.testing = false;
            root.resultError = true;
            root.resultMessage = String(error);
        });
    }
    function save(): void {
        saving = true;
        resultMessage = "";
        const guard = lifetime;
        Backend.awaitOperation(plugin.executeCommand("settings.save", {
            config: values()
        })).then(function (config) {
            if (!guard.active)
                return;
            root.saving = false;
            root.adopt(config);
            root.resultError = false;
            root.resultMessage = config.enabled ? qsTr("设置已保存并接入主程序") : qsTr("设置已保存，存储位置已停用");
        }, function (error) {
            if (!guard.active)
                return;
            root.saving = false;
            root.resultError = true;
            root.resultMessage = String(error);
        });
    }
    Component.onCompleted: read()
    Component.onDestruction: {
        lifetime.active = false;
        if (connectionTest)
            connectionTest.cancel();
    }

    Rectangle {
        Layout.fillWidth: true
        implicitHeight: overview.implicitHeight + 28
        radius: 10
        color: Theme.floating.elevated
        border.color: Theme.floatingBorder
        ColumnLayout {
            id: overview
            anchors.fill: parent
            anchors.margins: 14
            spacing: 8
            RowLayout {
                Layout.fillWidth: true
                Label {
                    Layout.fillWidth: true
                    text: qsTr("WebDAV 备份存储")
                    color: Theme.floatingText
                    font: Theme.font(13, Theme.semiboldWeight)
                }
                EchoTag {
                    text: root.state.label || qsTr("未启用")
                }
            }
            Label {
                Layout.fillWidth: true
                text: root.state.detail || ""
                color: Theme.floatingSecondaryText
                font: Theme.font(12, Theme.regularWeight)
                wrapMode: Text.Wrap
            }
            RowLayout {
                Layout.fillWidth: true
                Label {
                    Layout.fillWidth: true
                    text: qsTr("启用存储位置")
                    color: Theme.floatingText
                    font: Theme.font(13, Theme.mediumWeight)
                }
                EchoSwitch {
                    objectName: "webdavEnabled"
                    checked: root.draftEnabled
                    enabled: !root.busy
                    onToggled: {
                        root.draftEnabled = checked;
                        root.clearMessage();
                    }
                }
            }
        }
    }
    GridLayout {
        id: fields
        Layout.fillWidth: true
        columns: root.width >= 460 ? 2 : 1
        uniformCellWidths: true
        columnSpacing: 12
        rowSpacing: 12
        enabled: !root.busy
        ColumnLayout {
            Layout.fillWidth: true
            Layout.columnSpan: parent.columns
            spacing: 5
            Label {
                text: qsTr("WebDAV 服务地址")
                color: Theme.floatingText
                font: Theme.font(13, Theme.mediumWeight)
            }
            EchoTextField {
                id: server
                objectName: "webdavUrl"
                Layout.fillWidth: true
                maximumLength: 4096
                colors: Theme.floating
                placeholderText: "https://dav.example.com/dav/"
                Accessible.name: qsTr("WebDAV 服务地址")
                onTextEdited: root.clearMessage()
            }
        }
        ColumnLayout {
            Layout.fillWidth: true
            Layout.preferredWidth: Math.max(0, (fields.width - fields.columnSpacing * (fields.columns - 1)) / fields.columns)
            Layout.minimumWidth: 0
            spacing: 5
            Label {
                text: qsTr("用户名")
                color: Theme.floatingText
                font: Theme.font(13, Theme.mediumWeight)
            }
            EchoTextField {
                id: username
                objectName: "webdavUsername"
                Layout.fillWidth: true
                maximumLength: 256
                colors: Theme.floating
                Accessible.name: qsTr("WebDAV 用户名")
                onTextEdited: root.clearMessage()
            }
        }
        ColumnLayout {
            Layout.fillWidth: true
            Layout.preferredWidth: Math.max(0, (fields.width - fields.columnSpacing * (fields.columns - 1)) / fields.columns)
            Layout.minimumWidth: 0
            spacing: 5
            Label {
                text: qsTr("密码或应用专用密码")
                color: Theme.floatingText
                font: Theme.font(13, Theme.mediumWeight)
            }
            EchoTextField {
                id: password
                objectName: "webdavPassword"
                Layout.fillWidth: true
                maximumLength: 4096
                echoMode: TextInput.Password
                colors: Theme.floating
                Accessible.name: qsTr("WebDAV 密码")
                onTextEdited: root.clearMessage()
            }
        }
        ColumnLayout {
            Layout.fillWidth: true
            Layout.columnSpan: parent.columns
            spacing: 5
            Label {
                text: qsTr("远端备份目录")
                color: Theme.floatingText
                font: Theme.font(13, Theme.mediumWeight)
            }
            EchoTextField {
                id: directory
                objectName: "webdavDirectory"
                Layout.fillWidth: true
                maximumLength: 2020
                placeholderText: "EchoMusicNext"
                colors: Theme.floating
                Accessible.name: qsTr("远端备份目录")
                onTextEdited: root.clearMessage()
            }
            Label {
                Layout.fillWidth: true
                text: qsTr("支持多级相对目录；测试连接或首次使用时会创建缺失目录。")
                color: Theme.floatingSecondaryText
                font: Theme.font(11, Theme.regularWeight)
                wrapMode: Text.Wrap
            }
        }
    }
    RowLayout {
        Layout.fillWidth: true
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4
            Label {
                text: qsTr("记住密码")
                color: Theme.floatingText
                font: Theme.font(13, Theme.mediumWeight)
            }
            Label {
                Layout.fillWidth: true
                text: qsTr("默认关闭。关闭时密码仅在当前运行会话有效，重启后需重新输入并保存。")
                color: Theme.floatingSecondaryText
                font: Theme.font(11, Theme.regularWeight)
                wrapMode: Text.Wrap
            }
        }
        EchoSwitch {
            objectName: "webdavRememberPassword"
            enabled: !root.busy
            checked: root.rememberPassword
            onToggled: {
                root.rememberPassword = checked;
                root.clearMessage();
            }
        }
    }
    Label {
        Layout.fillWidth: true
        text: qsTr("开启记住密码会将凭据保存在插件数据中；备份未加密。建议使用 HTTPS 和应用专用密码。")
        color: Theme.floatingSecondaryText
        font: Theme.font(11, Theme.regularWeight)
        wrapMode: Text.Wrap
    }
    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        EchoSoftButton {
            objectName: "webdavTest"
            text: root.testing ? qsTr("测试中…") : qsTr("测试连接")
            enabled: !root.busy
            colors: Theme.floating
            onClicked: root.test()
        }
        Item {
            Layout.fillWidth: true
        }
        EchoSoftButton {
            objectName: "webdavSave"
            text: root.saving ? qsTr("保存中…") : qsTr("保存并应用")
            enabled: !root.busy
            colors: Theme.floating
            onClicked: root.save()
        }
    }
    Label {
        objectName: "webdavMessage"
        Layout.fillWidth: true
        visible: text.length > 0
        text: root.resultMessage
        color: root.resultError ? "#ef4444" : Theme.floatingSecondaryText
        font: Theme.font(12, Theme.regularWeight)
        wrapMode: Text.Wrap
    }
}
