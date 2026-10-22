import QtQuick

QtObject {
    id: root
    required property font base
    property int pixelSize: 40
    property int weight: 700
    property real letterSpacing: 0
    // Keep the full host QFont, including its fallback chain. Override only the
    // Folia style's metrics on this local value, never the host preference.
    property font value
    function refresh(): void {
        value = base;
        value.pixelSize = pixelSize;
        value.weight = weight;
        value.letterSpacing = letterSpacing;
    }
    onBaseChanged: refresh()
    onPixelSizeChanged: refresh()
    onWeightChanged: refresh()
    onLetterSpacingChanged: refresh()
    Component.onCompleted: refresh()
}
