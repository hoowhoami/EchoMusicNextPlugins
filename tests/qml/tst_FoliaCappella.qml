import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/cappella"
import "../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare

TestCase {
    id: testCase
    name: "FoliaCappella"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    Rectangle {
        anchors.fill: parent
        color: "#080b14"
        z: -1
    }
    Component {
        id: scene
        Cappella {
            width: 1100
            height: 820
            baseFont: Qt.font({
                families: ["Arial", "PingFang SC", "Apple Color Emoji"],
                pixelSize: 18
            })
            songTitle: "真实歌曲"
        }
    }
    function prepared(text, start, end, index) {
        return Prepare.prepareLines([
            {
                sourceIndex: index,
                fullText: text,
                startTime: start,
                endTime: end,
                words: [
                    {
                        text,
                        startTime: start,
                        endTime: end
                    }
                ],
                wordSegments: [text]
            }
        ], [], null).lines[0];
    }
    function metadata(lines) {
        return lines.filter(line => line).map(item => ({
                    sourceIndex: item.line.sourceIndex,
                    startTime: item.line.startTime,
                    endTime: item.line.endTime,
                    renderEndTime: item.line.endTime,
                    timingClass: "normal",
                    codepointCount: Array.from(item.line.fullText).length,
                    compactCodepointCount: Array.from(item.line.fullText.replace(/\s/g, "")).length,
                    isInterlude: item.line.fullText === "......"
                }));
    }
    function createChat(lines, options) {
        const view = createTemporaryObject(scene, testCase, Object.assign({
            preparedLines: lines,
            lineMetadata: metadata(lines),
            settings: {
                cappellaAvatarSource: "builtin",
                cappellaShowEmoMessages: false
            }
        }, options || {}));
        verify(view !== null);
        return view;
    }
    function activeRow(view) {
        return view._rows.find(row => row.message.kind === "lyric" && row.message.lineIndex === view.currentIndex);
    }
    function test_sourceConversationAndNativeParagraph() {
        const lines = [prepared("office سلام 中文家人👨‍👩‍👧‍👦逐字显示\n最后一行", 0, 8, 0)];
        const view = createChat(lines, {
            currentIndex: 0,
            timeSeconds: 7.9
        });
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
        const row = activeRow(view);
        compare(row.errorString, "");
        verify(row.metric.lineCount >= 2);
        compare(row.glyphRenderer.metrics[0].graphemes.length, lines[0].graphemes.length);
        verify(row.clusters.length <= lines[0].graphemes.length);
        verify(row.prefix.prefixes.length === row.clusters.length + 1);
        verify(view.requiredSourceIndicesKey.indexOf("0") >= 0);
        tryVerify(() => row.glyphRenderer.textureUploads > 0, 5000);
        wait(400);
        const image = grabImage(view);
        image.save("build/folia-native-qml/cappella-paragraph.png");
        let ink = 0;
        for (let y = 0; y < image.height; y += 2)
            for (let x = 0; x < image.width; x += 2)
                if (image.red(x, y) > 100 && image.green(x, y) > 100 && image.blue(x, y) > 100)
                    ink++;
        verify(ink > 30, "Real paragraph/avatars white RGB ink=" + ink);
        let glyphInk = 0;
        const first = row.glyphRenderer.mapToItem(view, 0, 0), last = row.glyphRenderer.mapToItem(view, row.glyphRenderer.width, row.glyphRenderer.height);
        const density = Screen.devicePixelRatio;
        for (let y = Math.max(0, Math.floor(first.y * density)); y < Math.min(image.height, last.y * density); y++)
            for (let x = Math.max(0, Math.floor(first.x * density)); x < Math.min(image.width, last.x * density); x++)
                if (image.red(x, y) > 235 && image.green(x, y) > 235 && image.blue(x, y) > 235)
                    glyphInk++;
        verify(glyphInk > 100, "Native paragraph alone RGB ink=" + glyphInk);
        const avatar = findChild(row, "cappellaAvatar");
        verify(avatar !== null);
        const portrait = grabImage(avatar);
        verify(portrait.red(1, 1) < 80 && portrait.green(1, 1) < 80 && portrait.blue(1, 1) < 80, "Avatar corners must be circularly cropped");
    }
    function test_pausedCharacterFadeDoesNotReshape() {
        const view = createChat([prepared("ABC", 0, 3, 0)], {
            currentIndex: 0,
            timeSeconds: .05,
            paused: true
        });
        tryVerify(() => activeRow(view) && activeRow(view).shown && activeRow(view).prefix, 10000);
        const row = activeRow(view), glyph = row.glyphRenderer;
        tryVerify(() => glyph.textureUploads > 0, 5000);
        const revision = glyph.maskRevision, uploads = glyph.textureUploads;
        view.timeSeconds = 1.05;
        wait(50);
        const before = glyph.poses[1].opacity;
        wait(1100);
        verify(glyph.poses[1].opacity > before);
        compare(glyph.maskRevision, revision);
        compare(glyph.textureUploads, uploads);
        view.timeSeconds = .05;
        wait(30);
        compare(glyph.poses[1].opacity, 0);
    }
    function test_sparseInputAndNoActiveLinePreserveContext() {
        const lines = [];
        lines[5] = prepared("此前真实歌词", 10, 13, 5);
        lines[9] = prepared("当前真实歌词", 20, 24, 9);
        const view = createChat(lines, {
            currentIndex: -1,
            timeSeconds: 14
        });
        tryVerify(() => view._rows.some(row => row.message.lineIndex === 5 && row.ready), 10000);
        verify(view._rows.every(row => row.message.kind === "title" || row.message.lineIndex === 5));
        const previous = view._rows.find(row => row.message.lineIndex === 5);
        compare(previous.state.active, false);
        compare(previous.state.passed, false);
        view.timeSeconds = 20.5;
        view.currentIndex = 9;
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
        compare(activeRow(view).message.lineIndex, 9);
        view.preparedLines = [];
        tryVerify(() => !activeRow(view).inputReady, 5000);
        compare(activeRow(view).errorString, "");
    }
    function test_emojiAgentAvatarAndPreheatAreSourceData() {
        const lines = [prepared("第一位歌手", 0, 3, 0), prepared("......", 4, 7, 1), prepared("第二位歌手", 8, 11, 2)];
        const meta = metadata(lines);
        meta[0].agentId = "A";
        meta[2].agentId = "B";
        const view = createChat(lines, {
            lineMetadata: meta,
            currentIndex: 0,
            timeSeconds: 3.2,
            settings: {
                cappellaAvatarSource: "builtin",
                cappellaShowEmoMessages: true
            }
        });
        tryVerify(() => view.messages.length === 4, 5000);
        compare(view.messages[1].side, "right");
        compare(view.messages[3].side, "left");
        compare(view.messages[2].kind, "emo");
        verify(view.messages[2].emoImageUrl.indexOf("assets/emo/") >= 0);
        view.timeSeconds = 7.1;
        tryVerify(() => view._rows.some(row => row.preheating && row.message.lineIndex === 2), 5000);
        const row = view._rows.find(row => row.preheating);
        tryVerify(() => row.prefix !== null, 10000);
        compare(row.glyphRenderer.cacheBytes, 0);
        view.timeSeconds = 8.2;
        view.currentIndex = 2;
        tryVerify(() => row.shown, 5000);
        verify(String(view.avatarUrl(row.message)).indexOf("assets/avatar/") >= 0);
    }
    function test_hiddenRetiresWorkerCacheAndNativeMasks() {
        const view = createChat([prepared("生命周期", 0, 4, 0)], {
            currentIndex: 0,
            timeSeconds: 2
        });
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
        view.live = false;
        tryCompare(view, "mountedRowCount", 0);
        compare(view.prefixCacheCount, 0);
        compare(view._worker, null);
        wait(100);
        compare(view.mountedRowCount, 0);
        view.live = true;
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
    }
    function test_rejectedLayoutKeepsErrorUntilAcceptedRecovery() {
        const lines = [prepared("可用歌词", 0, 3, 0)];
        const view = createChat(lines, {
            currentIndex: 0,
            timeSeconds: 1
        });
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
        const invalid = prepared("a".repeat(8193), 0, 3, 0);
        view.preparedLines = [invalid];
        tryVerify(() => view.errorString.length > 0, 5000);
        wait(150);
        verify(view.errorString.indexOf("8192") >= 0);
        view.preparedLines = lines;
        tryVerify(() => activeRow(view) && activeRow(view).ready && !view.errorString, 10000);
    }
    function test_longHistoryHasBoundedWindowAndCache() {
        const lines = [];
        for (let i = 0; i < 60; i++)
            lines.push(prepared("真实歌词" + i, i * 4, i * 4 + 3, i));
        const view = createChat(lines, {
            currentIndex: 45,
            timeSeconds: 182,
            motionEnabled: false
        });
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
        verify(view.mountedRowCount <= 21);
        verify(view.visibleRowCount >= 2 && view.visibleRowCount <= 20);
        verify(view.prefixCacheCount <= 32);
        verify(view.prefixPositionCount <= 65536);
        verify(view.requiredSourceIndicesKey.split(",").length <= 21);
        view.timeSeconds = 2;
        view.currentIndex = 0;
        tryVerify(() => activeRow(view) && activeRow(view).ready, 10000);
        verify(view.mountedRowCount <= 21);
    }
}
