pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    property EchoPluginViewContext page: null
    property EchoPluginPlayer sourcePlayer: page ? page.player : null
    property bool frozen: false
    property bool continuous: true
    property bool retiring: false
    readonly property EchoPluginPlayer player: !retiring && (!page || page.active) ? sourcePlayer : null
    readonly property bool live: !retiring && enabled && visible && player !== null && Window.window !== null && Window.window.visible && Window.window.visibility !== Window.Minimized
    property real renderTime: 0
    function publish(): void {
        if (live && player && !frozen)
            renderTime = player.samplePosition();
    }
    onLiveChanged: publish()
    onFrozenChanged: if (!frozen)
        publish()
    Component.onCompleted: publish()
    Component.onDestruction: retiring = true
    Connections {
        target: root.live ? root.player : null
        function onClockChanged(): void {
            root.publish();
        }
        function onChanged(): void {
            root.publish();
        }
    }
    FrameAnimation {
        running: root.live && !root.frozen && root.continuous && root.player.playing
        onTriggered: root.publish()
    }
}
