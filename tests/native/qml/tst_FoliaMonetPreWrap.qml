// CPU-only real Worker/ICU/GlyphRun measurement; no renderers, captures or shaders.
import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../../plugins/folia-lyrics-skin/qml/styles/monet" as Monet

TestCase {
    id: testCase
    name: "FoliaMonetPreWrap"
    when: windowShown
    function initTestCase() {
        compare(GraphicsInfo.api, GraphicsInfo.Software, "this diagnostic must stay CPU-only");
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|is not a function/);
    }
    Component {
        id: layoutComponent
        Monet.MonetLayout {
            viewportWidth: 1200
            viewportHeight: 760
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 24
            })
            textService: foliaTestTextService
            settings: ({
                    subtitleContentMode: "none"
                })
        }
    }
    Component {
        id: measureComponent
        GlyphRun {
            visible: false
            measurementOnly: true
        }
    }
    function prepare(text: string): var {
        const l = createTemporaryObject(layoutComponent, testCase, {
            entries: [
                {
                    key: "wrap",
                    index: 0,
                    position: 0,
                    offset: 0,
                    status: "active",
                    line: {
                        fullText: text,
                        startTime: 1,
                        endTime: 5,
                        translation: "",
                        romanization: "",
                        words: [
                            {
                                text: "A",
                                startTime: 1,
                                endTime: 2
                            },
                            {
                                text: "B",
                                startTime: 4,
                                endTime: 5
                            }
                        ]
                    }
                }
            ]
        });
        verify(l !== null);
        tryVerify(() => !l.busy && (l.revision > 0 || l.errorString.length > 0), 20000);
        compare(l.errorString, "");
        verify(l.measurementBatches > 0);
        return l;
    }
    function test_realNativeSpaceAdvanceAndOriginalTiming() {
        const l = prepare("A   B"), entry = l.result[0];
        const a = entry.rows[0].fragments.find(f => f.text === "A");
        const b = entry.rows[0].fragments.find(f => f.text === "B");
        verify(a && b);
        const space = createTemporaryObject(measureComponent, testCase, {
            font: l.baseFont,
            runs: [
                {
                    key: "space",
                    text: " ",
                    size: l.geometry.fontPx,
                    weight: entry.tone.fontWeight,
                    spacing: 0,
                    maxBlur: 0,
                    maxHaloRadius: 0
                }
            ]
        });
        verify(space !== null);
        tryVerify(() => space.metrics.length === 1, 10000);
        compare(space.errorString, "");
        verify(Math.abs(b.x - a.x - a.boxWidth - 3 * space.metrics[0].advance) < .001);
        compare(a.token.startTime, 1);
        compare(a.token.endTime, 2);
        compare(b.token.startTime, 4);
        compare(b.token.endTime, 5);
        compare(entry.line.fullText, "A   B");
        l.live = false;
        tryCompare(l, "busy", false);
        tryVerify(() => l.result.length === 0);
    }
    function test_realWorkerHardBreaksKeepConnectedBidiSpans() {
        const l = prepare("A   لا\n\nעברית  B"), entry = l.result[0];
        compare(entry.rows.length, 3);
        compare(entry.rows[1].fragments.length, 0);
        compare(entry.rows.map(row => row.fragments.map(f => f.text).join("")).join("\n"), entry.line.fullText);
        verify(entry.rows[0].fragments.some(f => f.text === "   لا"));
        verify(entry.rows[2].fragments.some(f => f.text === "עברית  "));
        const b = entry.rows[2].fragments.find(f => f.text === "B");
        verify(b.y >= 2 * entry.layout.lineHeightPx);
        l.live = false;
        tryCompare(l, "busy", false);
        tryVerify(() => l.result.length === 0);
    }
    function test_timedWordHardBreakStaysOneNativeInlineBox() {
        const l = createTemporaryObject(layoutComponent, testCase, {
            entries: [
                {
                    key: "timed",
                    index: 0,
                    position: 0,
                    offset: 0,
                    status: "active",
                    line: {
                        fullText: "A\nB",
                        startTime: 1,
                        endTime: 5,
                        translation: "",
                        romanization: "",
                        words: [
                            {
                                text: "A\nB",
                                startTime: 1,
                                endTime: 5
                            }
                        ]
                    }
                }
            ]
        });
        verify(l !== null);
        tryVerify(() => !l.busy && (l.revision > 0 || l.errorString.length > 0), 20000);
        compare(l.errorString, "");
        compare(l.result[0].rows.length, 1);
        const fragment = l.result[0].rows[0].fragments[0];
        compare(fragment.text, "A\nB");
        compare(fragment.lineCount, 2);
        verify(fragment.paragraph);
        verify(fragment.boxHeight > l.result[0].layout.lineHeightPx);
        compare(fragment.token.startTime, 1);
        compare(fragment.token.endTime, 5);
        l.live = false;
        tryVerify(() => l.result.length === 0);
    }
}
