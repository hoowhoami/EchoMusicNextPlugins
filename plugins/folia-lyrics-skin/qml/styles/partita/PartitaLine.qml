// Folia a8da4437 single sequential column. Shaping determines only stable flow geometry.
pragma ComponentBehavior: Bound
import QtQuick
import "layout.mjs" as Layout
import "../classic/motion.mjs" as Glow

Item {
    id: root
    required property var prepared
    required property var sequentialLayout
    required property var settings
    required property font baseFont
    required property color primaryColor
    required property color accentColor
    required property real viewportWidth
    required property real timeSeconds
    required property real enteredAt
    required property real presentationSeconds
    required property real enteredPresentationAt
    property real leavingAt: -1
    property bool hiddenExit: false
    property var leaveOrigin: null
    property bool motionEnabled: true
    property string sourceKey: ""
    readonly property var tuning: Layout.resolveSettings(settings)
    readonly property var rows: sequentialLayout.columns.length ? sequentialLayout.columns[0].words : []
    readonly property var profile: Glow.renderProfile(prepared.line)
    readonly property real pixelSize: Layout.fontSize(viewportWidth, sequentialLayout.totalGraphemes, tuning.lyricsFontScale)
    readonly property var lineMotion: motionEnabled ? Glow.linePose(profile, Math.max(0, presentationSeconds - (leavingAt >= 0 ? leavingAt : enteredPresentationAt)), leavingAt >= 0, hiddenExit, leaveOrigin) : ({
            opacity: 1,
            scale: 1,
            blur: 0,
            finished: false
        })
    readonly property var chunks: {
        const result = [];
        for (let index = 0; index < parts.count; index++)
            if (parts.itemAt(index))
                result.push(parts.itemAt(index));
        return result;
    }
    readonly property var glyphRenderer: chunks.length ? chunks[0].glyphRenderer : null
    readonly property string errorString: chunks.map(chunk => chunk.glyphRenderer.errorString).filter(error => error).join("; ")
    readonly property real contentHeight: chunks.reduce((sum, chunk) => sum + chunk.height + (chunk.chunk.config.marginBottom === "0.4rem" ? 6.4 : 9.6), 0)
    width: Math.max(0, Math.min(1024, viewportWidth - 64))
    height: Math.max(384, contentHeight)
    opacity: lineMotion.opacity
    scale: lineMotion.scale
    transformOrigin: Item.Center
    Item {
        id: column
        anchors.centerIn: parent
        width: Math.max(60.8, ...root.chunks.map(chunk => chunk.width + 24))
        height: Math.max(384, root.contentHeight)
        Item {
            id: chunkFlow
            anchors.centerIn: parent
            width: parent.width
            height: root.contentHeight
            Repeater {
                id: parts
                model: root.rows
                delegate: PartitaChunk {
                    required property var modelData
                    required property int index
                    chunk: modelData
                    prepared: root.prepared
                    settings: root.settings
                    baseFont: root.baseFont
                    primaryColor: root.primaryColor
                    accentColor: root.accentColor
                    pixelSize: root.pixelSize
                    profile: root.profile
                    timeSeconds: root.timeSeconds
                    enteredAt: root.enteredAt
                    presentationSeconds: root.presentationSeconds
                    enteredPresentationAt: root.enteredPresentationAt
                    motionEnabled: root.motionEnabled
                    lineBlur: root.lineMotion.blur
                    placementY: {
                        let top = 0;
                        for (let i = 0; i < index; i++) {
                            const previous = parts.itemAt(i);
                            if (previous)
                                top += previous.height + (root.rows[i].config.marginBottom === "0.4rem" ? 6.4 : 9.6);
                        }
                        return top;
                    }
                }
            }
        }
    }
}
