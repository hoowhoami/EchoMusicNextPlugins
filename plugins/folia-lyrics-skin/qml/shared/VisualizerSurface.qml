import QtQuick

// CSS opacity belongs to the composed backdrop and style. Propagating item
// opacity separately would darken their overlaps twice.
Item {
    objectName: "foliaVisualizerSurface"
    layer.enabled: visible && opacity > 0 && opacity < 1
    layer.smooth: true
}
