// Source filter areas and all children remain in world coordinates.
pragma ComponentBehavior: Bound
import QtQuick
import "../sonnet/filters" as Filters
import "../sonnet/filters/kernel.mjs" as FilterKernel

Item {
    id: root
    required property var group
    property real viewportWidth: 0
    property real viewportHeight: 0
    property real resolution: 1
    property bool live: true
    readonly property var contentItem: raw
    readonly property real cacheBytes: bloom.item ? bloom.item.cacheBytes : (blur.item ? blur.item.cacheBytes + captureBytes : 0)
    readonly property real captureBytes: preCapture.active && plan ? plan.physicalSize.width * plan.physicalSize.height * 4 : 0
    readonly property var plan: group.filters[0].kind !== 'lumiere-bloom' ? FilterKernel.texturePlan(group.bounds.width, group.bounds.height, group.bounds.resolution, FilterKernel.expandPasses(group.filters).length, resolution, [
        {
            width: Math.round(viewportWidth * resolution),
            height: Math.round(viewportHeight * resolution)
        }
    ]) : null
    readonly property string errorString: group.filters.length !== 1 ? 'Unsupported Lumiere source filter combination' : bloom.item ? bloom.item.errorString : blur.item ? blur.item.errorString : ''
    readonly property real renderTargetPhysicalHeight: bloom.item && bloom.item.cacheBytes > 0 ? FilterKernel.optimalTextureSize(group.bounds.width, group.bounds.height, group.bounds.resolution, [
        {
            width: Math.round(viewportWidth * resolution),
            height: Math.round(viewportHeight * resolution)
        }
    ]).height : plan ? plan.physicalSize.height : viewportHeight * resolution
    z: group.order
    width: viewportWidth
    height: viewportHeight
    Item {
        id: raw
        width: root.viewportWidth
        height: root.viewportHeight
    }
    Loader {
        id: bloom
        active: root.live && root.group.filters[0].kind === 'lumiere-bloom'
        sourceComponent: LumiereBloom {
            x: root.group.bounds.x
            y: root.group.bounds.y
            width: root.group.bounds.width
            height: root.group.bounds.height
            origin: Qt.point(root.group.bounds.x, root.group.bounds.y)
            canvasSize: Qt.size(root.viewportWidth, root.viewportHeight)
            registeredScreens: [
                {
                    width: Math.round(root.viewportWidth * root.resolution),
                    height: Math.round(root.viewportHeight * root.resolution)
                }
            ]
            source: raw
            options: root.group.filters[0].options
            resolution: root.group.bounds.resolution
            live: root.live
        }
    }
    Loader {
        id: preCapture
        active: root.live && root.group.filters[0].kind !== 'lumiere-bloom'
        sourceComponent: ShaderEffectSource {
            sourceItem: raw
            sourceRect: Qt.rect(root.group.bounds.x, root.group.bounds.y, root.plan.inputSize[0], root.plan.inputSize[1])
            textureSize: Qt.size(root.plan.physicalSize.width, root.plan.physicalSize.height)
            hideSource: true
            visible: false
            smooth: true
            live: root.live
        }
    }
    Loader {
        id: blur
        active: preCapture.active
        sourceComponent: Filters.FilterChain {
            x: root.group.bounds.x
            y: root.group.bounds.y
            width: root.group.bounds.width
            height: root.group.bounds.height
            source: preCapture.item
            inputUvScale: Qt.vector2d(root.plan.uvScale[0], root.plan.uvScale[1])
            passes: root.group.filters
            canvasSize: Qt.size(root.viewportWidth, root.viewportHeight)
            registeredScreens: [
                {
                    width: Math.round(root.viewportWidth * root.resolution),
                    height: Math.round(root.viewportHeight * root.resolution)
                }
            ]
            resolution: root.group.bounds.resolution
            targetResolution: root.resolution
            live: root.live
        }
    }
}
