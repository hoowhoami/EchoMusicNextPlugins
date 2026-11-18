import QtQuick

QtObject {
    required property font base
    property font value
    function refresh(): void {
        value = base;
        value.letterSpacing = 0;
        value.wordSpacing = 0;
        value.italic = false;
    }
    onBaseChanged: refresh()
    Component.onCompleted: refresh()
}
