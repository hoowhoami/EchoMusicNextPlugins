// Original 10-slot sparse theme decorators; unknown names remain empty, no fallback.
pragma ComponentBehavior: Bound
import QtQuick
import "decor.mjs" as Source
import "decor-frame.mjs" as Motion
import "../../shared" as Shared

Item {
    id: root
    property var lyricsIcons: []
    property color color: "#999999"
    property bool live: true
    property bool motionEnabled: true
    property int introRevision: 0
    property real elapsed: 0
    readonly property var particles: Source.buildParticles(Array.from(lyricsIcons))
    readonly property int slotCount: particles.length
    readonly property bool running: clock.running
    clip: true
    opacity: Motion.introOpacity(elapsed, !motionEnabled)
    onIntroRevisionChanged: elapsed = 0
    onMotionEnabledChanged: elapsed = 0
    FrameAnimation {
        id: clock
        running: root.live && root.visible && root.motionEnabled && root.particles.length > 0
        onTriggered: root.elapsed += frameTime
    }
    Repeater {
        model: root.live ? root.particles : []
        delegate: Shared.ThemeIcon {
            required property var modelData
            objectName: "monetThemeParticle" + modelData.id
            readonly property var frame: Motion.particleFrame(modelData, root.elapsed, !root.motionEnabled)
            iconName: modelData.iconName
            width: modelData.size
            height: width
            x: root.width * modelData.x / 100 + frame.x
            y: root.height * modelData.y / 100 + frame.y
            rotation: frame.rotation
            opacity: frame.opacity
            color: root.color
            strokeWidth: 1
            live: root.live
        }
    }
}
