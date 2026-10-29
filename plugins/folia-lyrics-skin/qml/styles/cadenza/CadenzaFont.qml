import QtQuick

QtObject {
    required property font base
    property int pixelSize: 72
    property int weight: 700
    property font value
    function refresh(): void {
        value = base;
        value.pixelSize = pixelSize;
        value.weight = weight;
        value.letterSpacing = 0;
        value.italic = false;
    }
    onBaseChanged: refresh()
    onPixelSizeChanged: refresh()
    onWeightChanged: refresh()
    Component.onCompleted: refresh()
}
