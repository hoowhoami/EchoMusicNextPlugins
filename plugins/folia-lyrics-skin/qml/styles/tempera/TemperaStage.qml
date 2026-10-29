// One real offscreen prefix or filtered group; all references point to earlier stages.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../sonnet/filters" as Filters

Item {
    id: root
    property var descriptor: null
    property var resources: ({})
    property var stages: ({})
    property font baseFont
    property EchoPluginAssets assetsService: null
    property bool live: true
    readonly property var renderers: paint.renderers
    readonly property var output: target
    readonly property vector2d outputUvScale: Qt.vector2d(1, 1)
    readonly property real cacheBytes: !descriptor ? 0 : Math.ceil(width * (descriptor.targetResolution || descriptor.resolution)) * Math.ceil(height * (descriptor.targetResolution || descriptor.resolution)) * 4 + paint.cacheBytes + (descriptor.kind === 'filters' ? chain.cacheBytes : 0)
    readonly property string errorString: chain.errorString || paint.errorString || (difference.status === ShaderEffect.Error ? difference.log : '')
    readonly property var roi: descriptor && descriptor.roi || [0, 0, width, height]
    readonly property var previous: descriptor && descriptor.previous && stages[descriptor.previous] ? stages[descriptor.previous].output : blank
    readonly property vector2d previousUv: descriptor && descriptor.previous && stages[descriptor.previous] ? stages[descriptor.previous].outputUvScale : Qt.vector2d(1, 1)
    readonly property var front: descriptor && descriptor.front && stages[descriptor.front] ? stages[descriptor.front].output : blank
    visible: true
    Item {
        id: transparent
        width: 1
        height: 1
    }
    ShaderEffectSource {
        id: blank
        sourceItem: transparent
        textureSize: Qt.size(1, 1)
        visible: false
        hideSource: true
    }
    Item {
        id: visual
        anchors.fill: parent
        TemperaTexture {
            anchors.fill: parent
            visible: root.descriptor && root.descriptor.kind === 'paint'
            source: root.previous
            uvScale: root.previousUv
        }
        TemperaPaint {
            id: paint
            anchors.fill: parent
            visible: root.descriptor && root.descriptor.kind === 'paint'
            ops: visible ? root.descriptor.ops : []
            resources: root.resources
            stages: root.stages
            baseFont: root.baseFont
            assetsService: root.assetsService
            live: root.live
        }
        TemperaDifference {
            id: difference
            anchors.fill: parent
            visible: root.descriptor && root.descriptor.kind === 'difference'
            source: root.front
            backdrop: root.previous
            profile: root.descriptor && root.descriptor.profile || ({})
            roi: root.roi
        }
        Filters.FilterChain {
            id: chain
            x: root.roi[0]
            y: root.roi[1]
            width: Math.max(1, root.roi[2] - root.roi[0])
            height: Math.max(1, root.roi[3] - root.roi[1])
            visible: root.descriptor && root.descriptor.kind === 'filters'
            live: root.live && visible
            present: true
            source: crop
            sourceIsTextureProvider: false
            passes: visible ? root.descriptor.passes : []
            resolution: root.descriptor ? root.descriptor.resolution : 1
            targetResolution: root.descriptor && root.descriptor.targetResolution || resolution
            canvasSize: Qt.size(root.width, root.height)
            registeredScreens: [
                {
                    width: Math.max(1, Math.round(root.width * (root.descriptor && root.descriptor.screenResolution || targetResolution))),
                    height: Math.max(1, Math.round(root.height * (root.descriptor && root.descriptor.screenResolution || targetResolution)))
                }
            ]
        }
    }
    TemperaTexture {
        id: crop
        width: Math.max(1, root.roi[2] - root.roi[0])
        height: Math.max(1, root.roi[3] - root.roi[1])
        visible: false
        source: root.front
        uvScale: Qt.vector2d(width / Math.max(1, root.width), height / Math.max(1, root.height))
        uvOffset: Qt.vector2d(root.roi[0] / Math.max(1, root.width), root.roi[1] / Math.max(1, root.height))
    }
    ShaderEffectSource {
        id: target
        sourceItem: visual
        sourceRect: Qt.rect(0, 0, root.width, root.height)
        textureSize: Qt.size(Math.ceil(root.width * (root.descriptor ? root.descriptor.targetResolution || root.descriptor.resolution : 1)), Math.ceil(root.height * (root.descriptor ? root.descriptor.targetResolution || root.descriptor.resolution : 1)))
        hideSource: true
        visible: false
        live: root.live
        smooth: true
        samples: 4
    }
}
