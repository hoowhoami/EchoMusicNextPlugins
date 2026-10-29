// Readiness-controlled real scenegraph rectangle; test fixture, never a registered style.
pragma ComponentBehavior: Bound
import QtQuick

Rectangle {
    id: root
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color primaryColor: 'white'
    property color secondaryColor: '#999999'
    property color accentColor: 'white'
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property int initialDelayMs: 0
    property bool renderReady: false
    property color readyColor: "#4080c0"
    property bool _completed: false
    property string errorString: ''
    color: renderReady ? readyColor : '#c08040'
    signal pictureDrawn
    function releaseFirstFrame(): void {
        if (_completed) {
            renderReady = true;
            pictureDrawn();
        }
    }
    Component.onCompleted: {
        _completed = true;
        readyTimer.start();
    }
    Component.onDestruction: {
        _completed = false;
        readyTimer.stop();
    }
    Timer {
        id: readyTimer
        interval: root.initialDelayMs
        onTriggered: root.releaseFirstFrame()
    }
}
