// Folia a8da4437 TiltLine. Native masks are immutable during wall-clock transitions.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel

Item {
    id: actor
    required property var line
    required property var layout
    required property var settings
    required property font baseFont
    required property color primaryColor
    required property color accentColor
    required property real viewportWidth
    required property real timeSeconds
    required property real clock
    property bool motionEnabled: true
    property real leavingAt: -1
    property real enteredAt: clock
    readonly property var tuning: Kernel.resolveSettings(settings)
    readonly property var timings: Kernel.segmentTimings(layout.segments, line)
    readonly property int visibleIndex: Kernel.visibleSegmentIndex(timeSeconds, timings, line)
    readonly property real gap: viewportWidth >= 640 ? 16 : 12
    readonly property var colors: Kernel.resolveColors(tuning.colorScheme, primaryColor, accentColor)
    readonly property var renderer: parts.count > 0 ? parts.itemAt(0) : null
    readonly property var renderers: {
        const result = [];
        for (let i = 0; i < parts.count; ++i)
            if (parts.itemAt(i))
                result.push(parts.itemAt(i));
        return result;
    }
    readonly property bool animating: motionEnabled && (leavingAt >= 0 || renderers.some(item => item.animating))
    readonly property string errorString: renderers.map(item => item.errorString).filter(error => error).join("; ")
    width: viewportWidth
    height: layout.segments.reduce((sum, segment) => sum + Kernel.renderFontSize(viewportWidth, tuning.lyricsFontScale * layout.scaleMultiplier, segment.isShortLastLine) * (segment.isTilt ? 1.25 : 1.35), 0) + Math.max(0, layout.segments.length - 1) * gap
    opacity: leavingAt < 0 || !motionEnabled ? 1 : 1 - Kernel.ease(Math.min(1, (clock - leavingAt) / 0.45))

    function publish(): void {
        const delegates = renderers;
        for (let i = 0; i < delegates.length; ++i)
            delegates[i].publish();
    }
    function setTargets(): void {
        const delegates = renderers;
        for (let i = 0; i < delegates.length; ++i)
            delegates[i].retarget();
        publish();
    }
    onVisibleIndexChanged: setTargets()
    onLeavingAtChanged: setTargets()
    onTimeSecondsChanged: publish()
    onClockChanged: publish()
    onMotionEnabledChanged: publish()
    onColorsChanged: publish()
    Repeater {
        id: parts
        model: actor.layout.segments
        delegate: GlyphRun {
            id: glyph
            property bool _completed: false
            required property var modelData
            required property int index
            readonly property bool italic: modelData.isTilt
            readonly property real pixelSize: Kernel.renderFontSize(actor.viewportWidth, actor.tuning.lyricsFontScale * actor.layout.scaleMultiplier, modelData.isShortLastLine)
            readonly property real lineHeight: pixelSize * (italic ? 1.25 : 1.35)
            readonly property var geometry: metrics.length ? Kernel.clusterGeometry(modelData.text, metrics[0], pixelSize, italic) : ({
                    clusters: [],
                    width: 0
                })
            readonly property var timings: Kernel.buildCharTimings(modelData.charOffset, modelData.text, actor.timings[index].start, actor.timings[index].end, actor.line)
            readonly property var timedClusters: metrics.length ? Kernel.clusterTimings(geometry, metrics[0], timings) : []
            property bool targetVisible: index <= actor.visibleIndex
            property real changedAt: actor.enteredAt
            property var origin: ({
                    opacity: 0,
                    y: italic ? 24 : 20,
                    scale: italic ? 0.92 : 1
                })
            property var charOrigins: []
            property var pulse: []
            property var linePose: origin
            property var charPoses: []
            readonly property bool animating: actor.clock - changedAt < Math.max(italic ? 0.6 : 0.55, targetVisible ? timings.length * (italic ? 0.05 : 0.04) + 0.5 : 0.5) || pulse.some(item => actor.clock - item.changedAt < 0.06)
            objectName: "foliaTiltSegment" + index
            width: geometry.width
            height: lineHeight
            x: (actor.width - width) / 2
            y: {
                let top = 0;
                for (let i = 0; i < index; ++i) {
                    const segment = actor.layout.segments[i];
                    top += Kernel.renderFontSize(actor.viewportWidth, actor.tuning.lyricsFontScale * actor.layout.scaleMultiplier, segment.isShortLastLine) * (segment.isTilt ? 1.25 : 1.35) + actor.gap;
                }
                return top;
            }
            transform: Translate {
                y: glyph.linePose.y
            }
            scale: linePose.scale
            opacity: linePose.opacity
            transformOrigin: Item.Center
            font: styleFont.value
            runs: [
                {
                    key: "segment",
                    text: modelData.text,
                    size: pixelSize,
                    spacing: pixelSize * (italic ? 0.15 : 0.08),
                    maxBlur: 0,
                    maxHaloRadius: 0
                }
            ]
            TiltFont {
                id: styleFont
                base: actor.baseFont
                pixelSize: Math.round(glyph.pixelSize)
                weight: actor.tuning.fontWeight === null ? glyph.italic ? 300 : 400 : actor.tuning.fontWeight
                italic: glyph.italic
            }
            function retarget(): void {
                const next = index <= actor.visibleIndex;
                if (next === targetVisible && actor.leavingAt < 0)
                    return;
                origin = linePose;
                charOrigins = charPoses;
                targetVisible = next;
                changedAt = actor.clock;
            }
            function publish(): void {
                if (!metrics.length)
                    return;
                const age = Math.max(0, actor.clock - changedAt);
                const p = actor.motionEnabled ? Kernel.ease(age / (italic ? 0.6 : 0.55)) : 1;
                const exiting = actor.leavingAt >= 0;
                const target = exiting ? {
                    opacity: 0,
                    y: italic ? -16 : -12,
                    scale: italic ? 0.95 : 1
                } : targetVisible ? {
                    opacity: 1,
                    y: 0,
                    scale: 1
                } : {
                    opacity: 0,
                    y: italic ? 24 : 20,
                    scale: italic ? 0.92 : 1
                };
                linePose = {
                    opacity: origin.opacity + (target.opacity - origin.opacity) * p,
                    y: origin.y + (target.y - origin.y) * p,
                    scale: origin.scale + (target.scale - origin.scale) * p
                };
                const nextChars = [];
                const nextPulse = [];
                poses = geometry.clusters.map((cluster, ci) => {
                    const initial = charOrigins[ci] || {
                        opacity: 0,
                        y: italic && !cluster.space ? (cluster.visualIndex % 2 === 0 ? -1 : 1) * Math.min(actor.viewportWidth * 0.06875, 90) * actor.tuning.lyricsFontScale * actor.layout.scaleMultiplier / 3 : 0
                    };
                    const cp = actor.motionEnabled ? Kernel.ease((age - (targetVisible && !cluster.space ? cluster.visualIndex * (italic ? 0.05 : 0.04) : 0)) / 0.5) : 1;
                    const stagger = !italic || cluster.space ? 0 : (cluster.visualIndex % 2 === 0 ? -1 : 1) * Math.min(actor.viewportWidth * 0.06875, 90) * actor.tuning.lyricsFontScale * actor.layout.scaleMultiplier / 6;
                    const character = exiting && charPoses[ci] ? charPoses[ci] : {
                        opacity: initial.opacity + ((targetVisible ? 1 : 0) - initial.opacity) * cp,
                        y: initial.y + (stagger * (targetVisible ? 1 : 2) - initial.y) * cp
                    };
                    nextChars.push(character);
                    const timing = timedClusters[ci];
                    const pulseTarget = !actor.motionEnabled || cluster.space || !targetVisible || !timing ? 1 : 1 + Kernel.getCharPulseIntensity(actor.timeSeconds, timing) * (italic ? 0.18 : 0.15);
                    let state = pulse[ci] || {
                        from: 1,
                        target: pulseTarget,
                        changedAt: actor.clock
                    };
                    let progress = Math.max(0, Math.min(1, (actor.clock - state.changedAt) / 0.06));
                    let current = state.from + (state.target - state.from) * Kernel.pulseEase(progress);
                    if (state.target !== pulseTarget) {
                        state = {
                            from: current,
                            target: pulseTarget,
                            changedAt: actor.clock
                        };
                    }
                    if (!actor.motionEnabled)
                        current = 1;
                    nextPulse.push(state);
                    return {
                        key: "segment",
                        start: cluster.start,
                        x: cluster.x - cluster.nativeX,
                        y: (lineHeight - metrics[0].height) / 2 + character.y + (metrics[0].baseline - metrics[0].height / 2) * (current - 1),
                        scale: current,
                        opacity: character.opacity,
                        color: actor.colors[italic ? 1 : 0],
                        blur: 0,
                        halos: []
                    };
                });
                charPoses = nextChars;
                pulse = nextPulse;
            }
            onLayoutChanged: if (_completed)
                publishTask.restart()
            Component.onCompleted: {
                _completed = true;
                publish();
            }
            Component.onDestruction: {
                _completed = false;
                publishTask.stop();
            }
            Timer {
                id: publishTask
                interval: 0
                onTriggered: if (glyph._completed)
                    glyph.publish()
            }
        }
    }
}
