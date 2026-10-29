// Source fixed-track line, spring geometry, full active text and two capped subtitle tracks.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Effects
import "../../shared" as Shared
import "paint.mjs" as Paint

Item {
    id: root
    required property var entry
    required property var geometry
    property font baseFont
    property font subtitleFont: baseFont
    property real timeSeconds: 0
    property color primaryColor: "white"
    property color accentColor: primaryColor
    property color backgroundColor: "#111111"
    property bool live: true
    property bool motionEnabled: true
    property bool manual: false
    property bool retiring: false
    property bool initial: false
    signal retired
    signal seekRequested(real seconds)
    readonly property int tokenCount: tokens.count
    readonly property var renderers: {
        let result = [];
        for (let i = 0; i < tokens.count; i++) {
            const token = tokens.itemAt(i);
            if (token)
                result = result.concat(token.renderers);
        }
        return result;
    }
    readonly property string errorString: {
        const errors = [];
        for (let i = 0; i < tokens.count; i++) {
            const token = tokens.itemAt(i);
            if (token && token.errorString)
                errors.push(token.errorString);
        }
        return errors.join("; ");
    }
    readonly property int cacheBytes: {
        let sum = 0;
        for (let i = 0; i < tokens.count; i++) {
            const token = tokens.itemAt(i);
            if (token)
                sum += token.cacheBytes;
        }
        return sum;
    }
    readonly property real fullTextHeight: (entry.status === "active" ? entry.renderTextHeight : entry.layout.visibleTextLineCount * entry.layout.lineHeightPx) + entry.layout.textPaddingTopPx + entry.layout.textPaddingBottomPx
    readonly property real fullBoxHeight: fullTextHeight + 2 * geometry.glow
    readonly property real cropTop: Math.max(0, -y + geometry.glow - 64)
    readonly property real cropBottom: Math.min(fullBoxHeight, geometry.railHeight - y + geometry.glow + 64)
    readonly property var fragments: {
        return Paint.flattenRows(entry).filter(fragment => fragment.y + geometry.glow + entry.layout.textPaddingTopPx + fragment.boxHeight >= cropTop - geometry.glow && fragment.y + geometry.glow + entry.layout.textPaddingTopPx <= cropBottom + geometry.glow);
    }
    property real visualAlpha: initial ? entry.tone.opacity : 0
    property real visualBlur: initial ? entry.tone.blurPx : 5
    x: geometry.glow
    y: scrollSpring.value
    width: Math.max(1, geometry.railWidth - 2 * geometry.glow)
    height: entry.layout.visualHeightPx
    transformOrigin: Item.TopLeft
    scale: scaleSpring.value
    opacity: visualAlpha
    z: entry.tone.zIndex
    function updatePresentation(): void {
        visualAlpha = retiring ? 0 : entry.tone.opacity;
        visualBlur = retiring ? 6 : entry.tone.blurPx;
        if (retiring)
            expiry.restart();
    }
    function beginExit(): void {
        retiring = true;
        updatePresentation();
    }
    onEntryChanged: updatePresentation()
    onRetiringChanged: updatePresentation()
    Component.onCompleted: {
        if (!initial && !manual && motionEnabled) {
            scrollSpring.startFrom(entry.y + (entry.offset >= 0 ? 34 : -34));
            scaleSpring.startFrom(entry.tone.scale * .98);
        }
        presentationDeferred.restart();
    }
    Component.onDestruction: presentationDeferred.stop()
    Timer { id: presentationDeferred; interval: 0; onTriggered: root.updatePresentation() }
    Shared.PresentationSpring {
        id: scrollSpring
        targetValue: root.retiring ? root.entry.y + (root.entry.status === "passed" || root.entry.offset < 0 ? -38 : 38) : root.entry.y
        stiffness: 142 / .82
        damping: 28 / .82
        enabled: root.live && root.motionEnabled && !root.manual
    }
    Shared.PresentationSpring {
        id: scaleSpring
        targetValue: root.entry.tone.scale * (root.retiring ? .98 : 1)
        stiffness: 150 / .78
        damping: 30 / .78
        enabled: root.live && root.motionEnabled && !root.manual
    }
    Behavior on visualAlpha {
        enabled: root.live && root.motionEnabled
        NumberAnimation {
            duration: root.retiring ? 200 : 280
            easing.type: Easing.BezierSpline
            easing.bezierCurve: [.32, .72, 0, 1, 1, 1]
        }
    }
    Behavior on visualBlur {
        enabled: root.live && root.motionEnabled
        NumberAnimation {
            duration: root.retiring ? 200 : 320
            easing.type: Easing.BezierSpline
            easing.bezierCurve: [.32, .72, 0, 1, 1, 1]
        }
    }
    Timer {
        id: expiry
        interval: 220
        onTriggered: root.retired()
    }
    Item {
        anchors.fill: parent
        z: -1
        visible: root.entry.line.isChorus === true
        opacity: root.entry.status === "active" ? 1 : 0
        scale: root.entry.status === "active" ? 1.02 : .96
        Behavior on opacity {
            enabled: root.motionEnabled
            NumberAnimation {
                duration: 450
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, .58, 1, 1, 1]
            }
        }
        Behavior on scale {
            enabled: root.motionEnabled
            NumberAnimation {
                duration: 450
                easing.type: Easing.BezierSpline
                easing.bezierCurve: [0, 0, .58, 1, 1, 1]
            }
        }
        Canvas {
            id: chorusCanvas
            anchors.fill: parent
            onPaint: {
                const ctx = getContext("2d"), r = Math.min(16, width / 2, height / 2);
                ctx.reset();
                const radius = Math.hypot(width * .5, height * .55), g = ctx.createRadialGradient(width * .5, height * .45, 0, width * .5, height * .45, radius);
                g.addColorStop(0, Qt.rgba(root.accentColor.r, root.accentColor.g, root.accentColor.b, .14));
                g.addColorStop(.55, Qt.rgba(root.accentColor.r, root.accentColor.g, root.accentColor.b, .04));
                g.addColorStop(.82, "transparent");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(r, 0);
                ctx.lineTo(width - r, 0);
                ctx.quadraticCurveTo(width, 0, width, r);
                ctx.lineTo(width, height - r);
                ctx.quadraticCurveTo(width, height, width - r, height);
                ctx.lineTo(r, height);
                ctx.quadraticCurveTo(0, height, 0, height - r);
                ctx.lineTo(0, r);
                ctx.quadraticCurveTo(0, 0, r, 0);
                ctx.closePath();
                ctx.fill();
            }
            onWidthChanged: requestPaint()
            onHeightChanged: requestPaint()
        }
        layer.enabled: true
        layer.effect: MultiEffect {
            blurEnabled: true
            blurMax: 32
            blur: 10 / 32
            autoPaddingEnabled: true
        }
    }
    onAccentColorChanged: chorusCanvas.requestPaint()
    Item {
        id: body
        x: -root.geometry.glow
        y: -root.geometry.glow + root.cropTop
        width: root.geometry.railWidth
        height: Math.max(1, root.cropBottom - root.cropTop)
        clip: true
        layer.enabled: true
        layer.smooth: true
        layer.effect: ShaderEffect {
            property var source
            property vector2d extent: Qt.vector2d(body.width, body.height)
            property real clipBottom: root.entry.status !== "active" && root.entry.layout.isTextClipped ? root.geometry.glow + root.entry.layout.textPaddingTopPx + root.entry.layout.textContentHeightPx - root.cropTop : -1
            property real fadeY: Math.max(root.geometry.fontPx * .55, 12)
            property real fadeX: root.entry.layout.isTextOverflowingWidth ? Math.max(root.geometry.fontPx * .9, 24) : 0
            fragmentShader: Qt.resolvedUrl("line-mask.frag.qsb")
        }
        Repeater {
            id: tokens
            model: root.live ? root.fragments : []
            delegate: MonetToken {
                required property var modelData
                fragment: modelData
                entry: root.entry
                fontPx: root.geometry.fontPx
                fontWeight: root.entry.tone.fontWeight
                baseFont: root.baseFont
                timeSeconds: root.timeSeconds
                primaryColor: root.primaryColor
                accentColor: root.accentColor
                backgroundColor: root.backgroundColor
                staticPassed: root.manual && root.entry.status !== "active"
                live: root.live
                x: root.geometry.glow + modelData.x
                y: root.geometry.glow + root.entry.layout.textPaddingTopPx + modelData.y - root.cropTop
            }
        }
    }
    Column {
        y: root.fullTextHeight
        width: parent.width
        Repeater {
            model: root.entry.tracks
            delegate: Item {
                id: trackItem
                required property var modelData
                required property int index
                width: root.width
                height: modelData.heightPx
                clip: true
                opacity: 0
                Component.onCompleted: show.start()
                SequentialAnimation {
                    id: show
                    PauseAnimation {
                        duration: trackItem.index * 40
                    }
                    ParallelAnimation {
                        NumberAnimation {
                            target: trackItem
                            property: "opacity"
                            to: 1
                            duration: root.motionEnabled ? 280 : 0
                            easing.type: Easing.BezierSpline
                            easing.bezierCurve: [.32, .72, 0, 1, 1, 1]
                        }
                        NumberAnimation {
                            target: subtitleRows
                            property: "y"
                            from: trackItem.modelData.paddingTopPx + 8
                            to: trackItem.modelData.paddingTopPx
                            duration: root.motionEnabled ? 280 : 0
                            easing.type: Easing.BezierSpline
                            easing.bezierCurve: [.32, .72, 0, 1, 1, 1]
                        }
                    }
                }
                Item {
                    id: subtitleRows
                    y: trackItem.modelData.paddingTopPx
                    width: parent.width
                    height: trackItem.modelData.contentHeightPx
                    layer.enabled: trackItem.modelData.isClipped
                    layer.effect: ShaderEffect {
                        property var source
                        property vector2d extent: Qt.vector2d(subtitleRows.width, subtitleRows.height)
                        property real clipBottom: subtitleRows.height
                        property real fadeY: Math.max(trackItem.modelData.fontPx * .65, 10)
                        property real fadeX: 0
                        fragmentShader: Qt.resolvedUrl("line-mask.frag.qsb")
                    }
                    Repeater {
                        model: trackItem.modelData.rows
                        delegate: MonetText {
                            required property var modelData
                            required property int index
                            y: index * trackItem.modelData.lineHeightPx
                            width: root.width
                            height: trackItem.modelData.lineHeightPx
                            text: modelData.text
                            textFormat: Text.PlainText
                            verticalAlignment: Text.AlignVCenter
                            color: Qt.rgba(root.primaryColor.r, root.primaryColor.g, root.primaryColor.b, trackItem.index > 0 ? .68 * .82 : .68)
                            baseFont: root.subtitleFont
                            pixelSize: Math.round(trackItem.modelData.fontPx)
                            textWeight: trackItem.modelData.fontWeight
                        }
                    }
                }
            }
        }
    }
    MonetFont {
        id: subtitleFace
        base: root.subtitleFont
    }
    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        enabled: root.live && !root.retiring
        onClicked: root.seekRequested(root.entry.line.startTime)
    }
    layer.enabled: visualBlur > 0
    layer.smooth: true
    layer.effect: MultiEffect {
        blurEnabled: true
        blurMax: 16
        blur: Math.min(1, root.visualBlur / 16)
        autoPaddingEnabled: true
    }
}
