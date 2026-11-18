// Pixi premultiplied screen factors: ONE, ONE_MINUS_SRC_COLOR; alpha ONE, ONE_MINUS_SRC_ALPHA.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property var sourceA: null
    property var sourceB: null
    property vector2d uvOffsetA: Qt.vector2d(0, 0)
    property vector2d uvOffsetB: Qt.vector2d(0, 0)
    property vector2d uvScaleA: Qt.vector2d(1, 1)
    property vector2d uvScaleB: Qt.vector2d(1, 1)
    property real amountA: 1
    property real amountB: 1
    property bool live: true
    readonly property bool ready: contents.item !== null
    readonly property real cacheBytes: 0
    readonly property string errorString: contents.item && contents.item.status === ShaderEffect.Error ? contents.item.log : ""
    Loader {
        id: contents
        anchors.fill: parent
        active: root.live && root.visible && root.sourceA !== null && root.sourceB !== null
        sourceComponent: ShaderEffect {
            property var sourceA: root.sourceA
            property var sourceB: root.sourceB
            property vector2d uvOffsetA: root.uvOffsetA
            property vector2d uvOffsetB: root.uvOffsetB
            property vector2d uvScaleA: root.uvScaleA
            property vector2d uvScaleB: root.uvScaleB
            property real amountA: root.amountA
            property real amountB: root.amountB
            fragmentShader: Qt.resolvedUrl("screen.frag.qsb")
        }
    }
}
