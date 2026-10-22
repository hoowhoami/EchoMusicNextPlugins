// Renders the production Still component with authored fixture text, not a mock player.
import QtQuick
import "../../plugins/folia-lyrics-skin/qml/styles/still"

Window {
    id: window
    width: 1100
    height: 820
    visible: true
    color: "#15181e"
    Item {
        id: scene
        anchors.fill: parent
        Rectangle {
            anchors.fill: parent
            color: window.color
        }
        Still {
            anchors.fill: parent
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
            const output = decodeURIComponent(Qt.resolvedUrl("../../plugins/folia-lyrics-skin/assets/previews/still.png").toString().replace(/^file:\/\//, ""));
            if (!result.saveToFile(output)) {
                console.error("Could not save Still preview");
                Qt.exit(1);
                return;
            }
            Qt.quit();
        })
    }
}
