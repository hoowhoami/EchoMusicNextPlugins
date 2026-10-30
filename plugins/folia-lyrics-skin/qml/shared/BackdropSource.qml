// One bounded, transformed region of an earlier item in the actual paint order.
pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root
    property Item inputItem: null
    required property Item targetItem
    property real padding: 0
    property bool live: true
    property rect region: Qt.rect(0, 0, 1, 1)
    property size pixelSize: Qt.size(1, 1)
    property matrix4x4 uvMatrix: Qt.matrix4x4()
    property bool accepted: true
    property bool _completed: false
    readonly property bool hasInput: inputItem !== null && inputItem.visible
    readonly property real inputOpacity: hasInput ? inputItem.opacity : 0
    readonly property var texture: capture
    readonly property real plannedBytes: hasInput && accepted ? pixelSize.width * pixelSize.height * 4 : 4
    readonly property string errorString: accepted ? "" : "Backdrop region exceeds its GPU texture budget"
    function sync(): void {
        if (!_completed || !targetItem)
            return;
        if (!inputItem) {
            region = Qt.rect(0, 0, 1, 1);
            pixelSize = Qt.size(1, 1);
            accepted = true;
            return;
        }
        const p0 = targetItem.mapToItem(inputItem, 0, 0), px = targetItem.mapToItem(inputItem, 1, 0), py = targetItem.mapToItem(inputItem, 0, 1);
        const points = [[-padding, -padding], [targetItem.width + padding, -padding], [-padding, targetItem.height + padding], [targetItem.width + padding, targetItem.height + padding]].map(p => targetItem.mapToItem(inputItem, p[0], p[1]));
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys), w = Math.max.apply(null, xs) - x, h = Math.max.apply(null, ys) - y;
        const s0 = inputItem.mapToItem(null, 0, 0), sx = inputItem.mapToItem(null, 1, 0), sy = inputItem.mapToItem(null, 0, 1);
        const density = Math.max(Math.hypot(sx.x - s0.x, sx.y - s0.y), Math.hypot(sy.x - s0.x, sy.y - s0.y)) * Screen.devicePixelRatio;
        const size = Qt.size(Math.max(1, Math.ceil(w * density)), Math.max(1, Math.ceil(h * density)));
        accepted = Number.isFinite(w + h + density) && w > 0 && h > 0 && size.width <= 4096 && size.height <= 4096 && size.width * size.height * 4 <= 32 * 1024 * 1024;
        if (!accepted)
            return;
        region = Qt.rect(x, y, w, h);
        pixelSize = size;
        uvMatrix = Qt.matrix4x4((px.x - p0.x) / w, (py.x - p0.x) / w, 0, (p0.x - x) / w, (px.y - p0.y) / h, (py.y - p0.y) / h, 0, (p0.y - y) / h, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    onInputItemChanged: sync()
    Component.onCompleted: { _completed = true; sync(); }
    Rectangle { id: empty; width: 1; height: 1; color: "transparent" }
    ShaderEffectSource {
        id: capture
        sourceItem: root.hasInput && root.accepted ? root.inputItem : empty
        sourceRect: root.hasInput && root.accepted ? root.region : Qt.rect(0, 0, 1, 1)
        textureSize: root.hasInput && root.accepted ? root.pixelSize : Qt.size(1, 1)
        live: root.live
        hideSource: false
        visible: false
        smooth: true
    }
}
