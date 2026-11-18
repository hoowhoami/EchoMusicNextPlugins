// Numeric preparation only: hidden GlyphRun creates no CPU masks or GPU textures.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Chat

Item {
    id: root
    property font baseFont
    property var job: null
    property int cursor: 0
    property var sizes: []
    signal completed(var job, var prefixes)
    signal failed(var job, string message)
    visible: false
    function cancel(): void {
        turn.stop();
        job = null;
        sizes = [];
        measure.runs = [];
    }
    function prepare(request: var): void {
        cancel();
        job = request;
        cursor = 0;
        turn.start();
    }
    function advance(): void {
        if (!job)
            return;
        const request = job;
        for (let step = 0; step < 4 && cursor <= request.clusters.length; ++step, ++cursor) {
            const length = cursor ? request.clusters[cursor - 1].end : 0;
            const text = request.text.slice(0, length) || " ";
            const input = {
                key: "prefix",
                text,
                size: request.fontSize,
                weight: request.weight,
                maxBlur: 0,
                maxWidth: request.maxWidth,
                lineHeight: request.lineHeight
            };
            measure.runs = [input];
            if (measure.font != baseFont || measure.runs.length !== 1 || measure.runs[0].text !== text || measure.runs[0].size !== request.fontSize || measure.metrics.length !== 1) {
                failed(request, measure.errorString || "Native prefix layout rejected");
                cancel();
                return;
            }
            const metric = measure.metrics[0];
            const positions = [];
            for (let i = 0; i < cursor; ++i) {
                const full = request.clusters[i];
                const first = Array.from(metric.graphemes).find(g => g.start === full.start);
                const last = Array.from(metric.graphemes).find(g => g.start + g.length === full.end);
                if (!first || !last) {
                    failed(request, "Native prefix UTF-16 mapping is incomplete");
                    cancel();
                    return;
                }
                positions.push({
                    x: (first.x + last.x + last.advance) / 2,
                    y: metric.baseline + first.y
                });
            }
            sizes.push({
                width: Math.ceil(Math.min(Math.max(metric.width, request.fontSize), request.maxWidth) + request.paddingX * 2 + 2),
                height: Math.ceil(Math.max(1, metric.lineCount) * request.lineHeight + request.paddingY * 2 + 2),
                positions
            });
        }
        if (cursor > request.clusters.length) {
            const result = sizes;
            job = null;
            sizes = [];
            measure.runs = [];
            completed(request, result);
        } else {
            turn.start();
        }
    }
    GlyphRun {
        id: measure
        font: root.baseFont
        visible: false
    }
    Timer {
        id: turn
        interval: 0
        onTriggered: root.advance()
    }
}
