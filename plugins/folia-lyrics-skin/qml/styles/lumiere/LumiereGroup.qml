// Source filter areas and all children remain in world coordinates.
pragma ComponentBehavior: Bound
import QtQuick
import "../sonnet/filters" as Filters
import "../sonnet/filters/kernel.mjs" as FilterKernel

Item {
    id: root
    required property var group
    property string _stateKey: ""
    property string _filterKey: ""
    property string _boundsKey: ""
    readonly property var filters: group.filters
    readonly property var bounds: group.bounds
    function apply(value: var): void {
        const key = JSON.stringify(value);
        if (key === _stateKey)
            return;
        _stateKey = key;
        const filterKey = JSON.stringify(value.filters), boundsKey = JSON.stringify(value.bounds);
        group = Object.assign({}, value, {
            filters: filterKey === _filterKey ? filters : value.filters,
            bounds: boundsKey === _boundsKey ? bounds : value.bounds
        });
        _filterKey = filterKey;
        _boundsKey = boundsKey;
    }
    Component.onCompleted: {
        _stateKey = JSON.stringify(group);
        _filterKey = JSON.stringify(group.filters);
        _boundsKey = JSON.stringify(group.bounds);
    }
    property real viewportWidth: 0
    property real viewportHeight: 0
    property real resolution: 1
    property int samples: 1
    property bool live: true
    readonly property var contentItem: raw
    readonly property real cacheBytes: bloom.item ? bloom.item.cacheBytes : (blur.item ? blur.item.cacheBytes + captureBytes : 0)
    readonly property real captureBytes: preCapture.active && plan ? plan.physicalSize.width * plan.physicalSize.height * 4 * (samples > 1 ? samples + 1 : 1) : 0
    readonly property var plan: filters[0].kind !== 'lumiere-bloom' ? FilterKernel.texturePlan(bounds.width, bounds.height, bounds.resolution, FilterKernel.expandPasses(filters).length, resolution, [
        {
            width: Math.round(viewportWidth * resolution),
            height: Math.round(viewportHeight * resolution)
        }
    ]) : null
    readonly property string errorString: filters.length !== 1 ? 'Unsupported Lumiere source filter combination' : bloom.item ? bloom.item.errorString : blur.item ? blur.item.errorString : ''
    readonly property real renderTargetPhysicalHeight: bloom.item && bloom.item.cacheBytes > 0 ? FilterKernel.optimalTextureSize(bounds.width, bounds.height, bounds.resolution, [
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
        active: root.live && root.filters[0].kind === 'lumiere-bloom'
        sourceComponent: LumiereBloom {
            x: root.bounds.x
            y: root.bounds.y
            width: root.bounds.width
            height: root.bounds.height
            origin: Qt.point(root.bounds.x, root.bounds.y)
            canvasSize: Qt.size(root.viewportWidth, root.viewportHeight)
            registeredScreens: [
                {
                    width: Math.round(root.viewportWidth * root.resolution),
                    height: Math.round(root.viewportHeight * root.resolution)
                }
            ]
            source: raw
            options: root.filters[0].options
            resolution: root.bounds.resolution
            live: root.live
            samples: root.samples
        }
    }
    Loader {
        id: preCapture
        active: root.live && root.filters[0].kind !== 'lumiere-bloom'
        sourceComponent: ShaderEffectSource {
            sourceItem: raw
            sourceRect: Qt.rect(root.bounds.x, root.bounds.y, root.plan.inputSize[0], root.plan.inputSize[1])
            textureSize: Qt.size(root.plan.physicalSize.width, root.plan.physicalSize.height)
            hideSource: true
            visible: false
            smooth: true
            live: root.live
            samples: root.samples
        }
    }
    Loader {
        id: blur
        active: preCapture.active
        sourceComponent: Filters.FilterChain {
            x: root.bounds.x
            y: root.bounds.y
            width: root.bounds.width
            height: root.bounds.height
            source: preCapture.item
            inputUvScale: Qt.vector2d(root.plan.uvScale[0], root.plan.uvScale[1])
            passes: root.filters
            canvasSize: Qt.size(root.viewportWidth, root.viewportHeight)
            registeredScreens: [
                {
                    width: Math.round(root.viewportWidth * root.resolution),
                    height: Math.round(root.viewportHeight * root.resolution)
                }
            ]
            resolution: root.bounds.resolution
            targetResolution: root.resolution
            live: root.live
        }
    }
}
