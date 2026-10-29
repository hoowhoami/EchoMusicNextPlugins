import QtQuick

QtObject {
    required property font base
    property font value
    property real pixelSize: 0
    property int weight: -1
    property bool italic: false
    function refresh(): void {
        value = base;
        value.letterSpacing = 0;
        value.wordSpacing = 0;
        value.italic = italic;
        if (pixelSize > 0)
            value.pixelSize = Math.round(pixelSize);
        if (weight >= 100)
            value.weight = weight;
    }
    onBaseChanged: refresh()
    onPixelSizeChanged: refresh()
    onWeightChanged: refresh()
    onItalicChanged: refresh()
    Component.onCompleted: refresh()
}
