// Renders the production Still component with authored fixture text, not a mock player.
import QtQuick
import "../../plugins/folia-lyrics-skin/qml/styles/still"

Window {
    id: window
    width: 1100
    height: 820
    visible: true
    color: "#15181e"
    readonly property real fontScale: Number(argument("scale", "1"))
    readonly property real subtitleScale: Number(argument("subtitleScale", "1"))
    readonly property string fontFamily: argument("font", "")
    function argument(name: string, fallback: string): string {
        const prefix = name + "=";
        const value = Qt.application.arguments.find(arg => arg.indexOf(prefix) === 0);
        return value ? value.substring(prefix.length) : fallback;
    }
    function fixtureFont(size: int, weight: int, spacing: real): font {
        const fields = {
            pixelSize: size,
            weight: weight,
            letterSpacing: spacing
        };
        if (fontFamily)
            fields.family = fontFamily;
        return Qt.font(fields);
    }
    Item {
        id: scene
        anchors.fill: parent
        Rectangle {
            anchors.fill: parent
            color: window.color
        }
        Still {
            anchors.fill: parent
            lyricsFontScale: window.fontScale
            subtitleFontScale: window.subtitleScale
            currentFont: window.fixtureFont(40, 700, 0.8)
            adjacentFont: window.fixtureFont(30, 600, 0.6)
            currentSubtitleFont: window.fixtureFont(24, 500, 0.6)
            adjacentSubtitleFont: window.fixtureFont(20, 400, 0.5)
            primaryColor: "#f1f3f6"
            secondaryColor: "#b0b6c1"
            lineWindow: [
                {
                    lineText: "窗外的风轻轻吹过",
                    translation: "A quiet breeze passes by"
                },
                {
                    lineText: "让每一句停留在此刻",
                    translation: "Let every line linger in this moment"
                },
                {
                    lineText: "随着旋律继续向前",
                    translation: "Follow the melody onward"
                }
            ]
        }
    }
    Timer {
        interval: 300
        running: true
        onTriggered: scene.grabToImage(result => {
            const output = window.argument("output", decodeURIComponent(Qt.resolvedUrl("../../plugins/folia-lyrics-skin/assets/previews/still.png").toString().replace(/^file:\/\//, "")));
            if (!result.saveToFile(output)) {
                console.error("Could not save Still preview");
                Qt.exit(1);
                return;
            }
            Qt.quit();
        })
    }
}
