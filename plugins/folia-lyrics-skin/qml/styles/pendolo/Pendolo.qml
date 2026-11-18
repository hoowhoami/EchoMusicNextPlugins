// Folia a8da4437 Pendolo. Host owns playback, prepared text, clock, audio and cover metadata.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "../../shared"
import "kernel.mjs" as Kernel
import "timeline.mjs" as Timeline
import "clockwork-motion.mjs" as Clock
import "motion-profile.mjs" as Profile

Item {
    id: root
    objectName: "foliaPendolo"
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property font subtitleFont: baseFont
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property var lyricsIcons: []
    property color accentColor: primaryColor
    property color backgroundColor: "#111111"
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property real bassPower: 0
    property var audioBands: ({
            bass: 0
        })
    property url coverUrl
    property string trackRevision: ""
    property var lineMetadata: []
    property EchoPluginText textService: null
    signal seekRequested(seconds: real)
    readonly property var config: Kernel.resolveSettings(settings)
    readonly property var tuning: config.tuning
    readonly property var profile: Profile.resolvePendoloMotionProfile(config.animationIntensity)
    readonly property var geometry: Kernel.geometry(width, height, tuning)
    readonly property bool textVisible: settings.showText !== false
    readonly property var metadata: lineMetadata.length ? lineMetadata : Object.keys(preparedLines || {}).map(Number).filter(i => preparedLines[i] && preparedLines[i].line && !preparedLines[i].line.filtered).sort((a, b) => a - b).map(sourceIndex => Object.assign({
            sourceIndex
        }, preparedLines[sourceIndex].line))
    readonly property int position: Kernel.positionFor(metadata, currentIndex)
    readonly property real targetPosition: _manual !== null ? _manual : metadata.length ? position >= 0 ? position : !_observed ? -1 : timeSeconds > (metadata[metadata.length - 1].renderEndTime === undefined ? metadata[metadata.length - 1].endTime : metadata[metadata.length - 1].renderEndTime) ? metadata.length : _lastPosition + .5 : _instrumental ? Math.floor(timeSeconds / 5) : 0
    readonly property var requiredSourceIndices: live && visible && textVisible ? Kernel.windowAt(metadata, targetPosition) : []
    readonly property string requiredSourceIndicesKey: requiredSourceIndices.join(",")
    readonly property var preparedWindow: requiredSourceIndices.every(i => preparedLines && preparedLines[i] && preparedLines[i].line) ? requiredSourceIndices.map(sourceIndex => Kernel.packPrepared(sourceIndex, Kernel.positionFor(metadata, sourceIndex), preparedLines[sourceIndex])) : []
    readonly property real wheelRotation: -(tick.value - targetPosition) * geometry.angleStep * 180 / Math.PI
    readonly property real escapementAngle: tick.value * geometry.angleStep
    readonly property var clockMotion: Object.assign({}, _clockMotion, {
        escapementAngle
    })
    readonly property var renderer: contents.item
    readonly property int lineCount: renderer ? renderer.lineCount : 0
    readonly property int partCount: renderer ? renderer.partCount : 0
    readonly property int vertexCount: renderer ? renderer.vertexCount : 0
    readonly property int sceneRevision: renderer ? renderer.sceneRevision : 0
    readonly property int geometryBytes: renderer ? renderer.geometryBytes : 0
    readonly property int glyphRowCount: renderer ? renderer.glyphRowCount : 0
    readonly property bool busy: renderer ? renderer.busy : false
    readonly property string errorString: renderer ? renderer.errorString : ""
    readonly property bool resourcesActive: contents.active
    property var _motionState: Clock.createPendoloClockworkMotionState()
    property var _clockMotion: ({
            phase: 0,
            bassOscillation: 0,
            secondGearAngle: 0
        })
    property bool _observed: false
    property int _lastPosition: 0
    property var _manual: null
    property var _scroll: Kernel.scrollState()
    property var _touch: Kernel.scrollState()
    property real _touchY: 0
    property int _pendingSeek: -1
    property bool _instrumental: false
    property bool _sawReset: false
    property bool _ready: false
    property bool _retiring: false
    clip: true
    function observe(): void {
        if (position >= 0) {
            _observed = true;
            _lastPosition = position;
        }
        if (_pendingSeek === currentIndex) {
            _pendingSeek = -1;
            _manual = null;
        }
    }
    function reset(): void {
        _observed = false;
        _lastPosition = 0;
        _manual = null;
        _pendingSeek = -1;
        _scroll = Kernel.scrollState();
        _touch = Kernel.scrollState();
        _motionState = Clock.createPendoloClockworkMotionState();
        _clockMotion = {
            phase: 0,
            bassOscillation: 0,
            secondGearAngle: 0
        };
        _instrumental = false;
        _sawReset = false;
        manualReset.stop();
        observe();
        if (_ready && live && !metadata.length)
            instrumentalGrace.restart();
    }
    function move(steps: real): void {
        if (!metadata.length)
            return;
        _manual = Math.max(0, Math.min(metadata.length - 1, Math.round((_manual === null ? targetPosition : _manual) + steps)));
        manualReset.restart();
    }
    function browse(delta: real, touch: bool): void {
        const steps = Kernel.scroll(touch ? _touch : _scroll, delta, touch ? 60 : 90);
        if (steps)
            move(steps);
        else
            manualReset.restart();
    }
    function seekLine(sourceIndex: int, seconds: real): void {
        if (!live || !visible || !Number.isFinite(seconds) || seconds < 0)
            return;
        manualReset.stop();
        _pendingSeek = sourceIndex === currentIndex ? -1 : sourceIndex;
        _manual = sourceIndex === currentIndex ? null : Kernel.positionFor(metadata, sourceIndex);
        _scroll = Kernel.scrollState();
        _touch = Kernel.scrollState();
        seekRequested(seconds);
    }
    function advance(seconds: real): void {
        const dt = Math.max(0, Math.min(seconds, .05));
        const bass = Number.isFinite(bassPower) ? bassPower : audioBands.bass;
        _clockMotion = Clock.stepPendoloClockworkMotion(_motionState, dt, bass, paused, profile);
    }
    onPositionChanged: observe()
    onTrackRevisionChanged: {
        reset();
        if (_ready) {
            _retiring = true;
            retirementTask.restart();
        }
    }
    onTimeSecondsChanged: {
        if (!metadata.length) {
            if (timeSeconds < 1)
                _sawReset = true;
            if (_sawReset && timeSeconds >= 2)
                _instrumental = true;
        }
    }
    onMetadataChanged: {
        observe();
        if (metadata.length) {
            _instrumental = false;
            instrumentalGrace.stop();
        } else if (_ready && live)
            instrumentalGrace.restart();
    }
    onLiveChanged: if (!live) {
        manualReset.stop();
        instrumentalGrace.stop();
        _manual = null;
    } else if (_ready && !metadata.length)
        instrumentalGrace.restart()
    Component.onCompleted: {
        _ready = true;
        reset();
    }
    Timer {
        id: manualReset
        interval: 2500
        onTriggered: {
            root._manual = null;
            root._scroll = Kernel.scrollState();
            root._touch = Kernel.scrollState();
        }
    }
    Timer {
        id: instrumentalGrace
        interval: 3000
        onTriggered: if (!root.metadata.length)
            root._instrumental = true
    }
    PresentationSpring {
        id: tick
        targetValue: root.targetPosition
        stiffness: 180 * root.tuning.tickSnappiness * root.profile.escapementSpringMultiplier / .8
        damping: (18 + 4 / Math.max(.5, root.tuning.tickSnappiness)) * root.profile.escapementDampingMultiplier / .8
        enabled: root.live && root.visible && root.motionEnabled
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled
        onTriggered: root.advance(frameTime)
    }
    Loader {
        id: contents
        anchors.fill: parent
        active: root.live && root.visible && !root._retiring
        sourceComponent: Item {
            id: view
            readonly property int lineCount: lines.count
            readonly property int partCount: gears.partCount
            readonly property int vertexCount: gears.vertexCount
            readonly property int sceneRevision: gears.sceneRevision
            readonly property int geometryBytes: gears.pathBytes
            readonly property int glyphRowCount: {
                let count = 0;
                for (let i = 0; i < lines.count; i++) {
                    const line = lines.itemAt(i);
                    if (line && line.content)
                        count += line.content.glyphRowCount;
                }
                return count;
            }
            readonly property bool busy: layout.busy
            readonly property string errorString: layout.errorString || gears.errorString || _lineError
            property string _lineError: ""
            PendoloClockwork {
                id: gears
                anchors.fill: parent
                geometry: root.geometry
                tuning: root.tuning
                motion: root.clockMotion
                primaryColor: root.primaryColor
                accentColor: root.accentColor
                lyricsIcons: root.lyricsIcons
                backgroundColor: root.backgroundColor
                coverUrl: root.coverUrl
                live: root.live
            }
            PendoloLayout {
                id: layout
                items: root.textVisible ? root.preparedWindow : []
                lineCount: root.metadata.length
                target: root.targetPosition
                viewportWidth: root.width
                viewportHeight: root.height
                baseFont: root.baseFont
                subtitleFont: root.subtitleFont
                settings: root.settings
                textService: root.textService
                live: root.live && root.textVisible
            }
            Item {
                id: rail
                anchors.fill: parent
                transform: Rotation {
                    origin.x: root.geometry.centerX
                    origin.y: root.geometry.centerY
                    angle: root.wheelRotation
                }
                MouseArea {
                    anchors.fill: parent
                    acceptedButtons: Qt.NoButton
                    onWheel: wheel => {
                        wheel.accepted = true;
                        const delta = wheel.pixelDelta.y ? -wheel.pixelDelta.y : -wheel.angleDelta.y;
                        root.browse(delta, false);
                    }
                }
                Repeater {
                    id: lines
                    model: layout.result
                    delegate: Item {
                        id: slot
                        required property var modelData
                        readonly property var content: line
                        x: modelData.x
                        y: modelData.y
                        width: line.width
                        height: line.height
                        opacity: Timeline.resolvePendoloRotatingLineOpacity(modelData.angleDeg, root.wheelRotation, modelData.alpha)
                        PendoloLine {
                            id: line
                            item: slot.modelData
                            controller: root
                            onErrorStringChanged: if (errorString)
                                view._lineError = errorString
                        }
                    }
                }
                MultiPointTouchArea {
                    anchors.fill: parent
                    mouseEnabled: false
                    minimumTouchPoints: 1
                    maximumTouchPoints: 1
                    onPressed: points => {
                        root._touchY = points[0].y;
                        root._touch = Kernel.scrollState();
                        root._manual = root.targetPosition;
                        manualReset.restart();
                    }
                    onUpdated: points => {
                        const next = points[0].y;
                        root.browse(root._touchY - next, true);
                        root._touchY = next;
                    }
                    onReleased: manualReset.restart()
                    onCanceled: manualReset.restart()
                }
            }
            FoliaFont {
                id: errorFont
                base: root.baseFont
                pixelSize: 14
                weight: 400
            }
            Text {
                objectName: "pendoloError"
                anchors.centerIn: parent
                width: Math.max(0, parent.width - 64)
                visible: view.errorString.length > 0
                text: view.errorString
                color: root.secondaryColor
                font: errorFont.value
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.Wrap
                textFormat: Text.PlainText
            }
        }
    }

    Component.onDestruction: {
        _ready = false;
        retirementTask.stop();
    }
    Timer {
        id: retirementTask
        interval: 0
        onTriggered: if (root._ready)
            root._retiring = false
    }
}
