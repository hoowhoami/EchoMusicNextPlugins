import QtQuick

QtObject {
    required property font base
    property int pixelSize: 90
    property int weight: 400
    property bool italic: false
    property font value
    function refresh(): void {
        value = base;
        value.pixelSize = pixelSize;
        value.weight = weight;
        value.italic = italic;
        value.letterSpacing = 0;
    }
    onBaseChanged: refresh()
    onPixelSizeChanged: refresh()
    onWeightChanged: refresh()
    onItalicChanged: refresh()
    Component.onCompleted: refresh()
}
