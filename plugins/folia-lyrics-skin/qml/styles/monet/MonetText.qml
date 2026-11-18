pragma ComponentBehavior: Bound
import QtQuick

Text {
    id: root
    property font baseFont
    property real pixelSize: 14
    property int textWeight: -1
    property bool textItalic: false
    font: face.value
    MonetFont {
        id: face
        base: root.baseFont
        pixelSize: root.pixelSize
        weight: root.textWeight
        italic: root.textItalic
    }
}
