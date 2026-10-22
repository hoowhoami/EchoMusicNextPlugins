import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaStill"
    when: windowShown
    visible: true
    width: 1100
    height: 820

    function createView(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/still/Still.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820
        }, values));
    }

    function test_threeRowsAndPlainText() {
        const view = createView({
            lineWindow: [
                {
                    lineText: "上一行",
                    translation: "Previous"
                },
                {
                    lineText: "<b>当前歌词</b>",
                    translation: "Current"
                },
                {
                    lineText: "下一行",
                    translation: "Next"
                }
            ]
        });
        verify(view);
        tryCompare(findChild(view, "stillPrimary1"), "text", "<b>当前歌词</b>");
        compare(findChild(view, "stillPrimary1").textFormat, Text.PlainText);
        compare(findChild(view, "stillPrimary1").font.pixelSize, 40);
        compare(findChild(view, "stillPrimary0").font.pixelSize, 30);
        compare(findChild(view, "stillPrimary2").opacity, 0.3);
        compare(findChild(view, "stillTranslation1").text, "Current");
    }

    function test_missingRowsAndTranslationToggle() {
        const view = createView({
            lineWindow: [null,
                {
                    lineText: "Only line",
                    translation: "译文"
                },
                null]
        });
        verify(view);
        tryCompare(findChild(view, "stillPrimary0"), "text", "");
        compare(findChild(view, "stillRow0").height, 80);
        view.hideTranslationSubtitle = true;
        tryCompare(findChild(view, "stillTranslation1"), "visible", false);
        view.showText = false;
        verify(!findChild(view, "stillRows").visible);
    }

    function test_longTextReflowsWithoutGrowingDelegateCount() {
        const view = createView({
            lineWindow: [null,
                {
                    lineText: "很长的歌词会在窄窗口中按实际字形换行，保留完整文字而不截断。",
                    translation: "A translated lyric line."
                },
                null]
        });
        verify(view);
        const text = findChild(view, "stillPrimary1");
        view.width = 340;
        tryVerify(() => text.lineCount > 1);
        verify(text.width <= view.width - 96);
        compare(findChild(view, "stillRepeater").count, 3);
        for (let index = 0; index < 100; ++index)
            view.lineWindow = [null,
                {
                    lineText: "Song " + index,
                    translation: ""
                },
                null];
        tryCompare(text, "text", "Song 99");
        compare(findChild(view, "stillRepeater").count, 3);
    }

    function test_scaledWrappedGlyphsReserveTheirActualHeight() {
        const view = createView({
            width: 340,
            lyricsFontScale: 1.4,
            subtitleFontScale: 1.4,
            lineWindow: [null,
                {
                    lineText: "窄窗口中的大字号歌词应该保留实际的多行高度。",
                    translation: "A long translated line with a larger subtitle font."
                },
                null]
        });
        verify(view);
        const row = findChild(view, "stillRow1");
        const main = findChild(view, "stillPrimary1");
        const translation = findChild(view, "stillTranslation1");
        tryVerify(() => row.height >= main.implicitHeight * 1.4 + translation.implicitHeight * 1.4 * 1.4, 5000, "row=" + row.height + ", main=" + main.implicitHeight + ", subtitle=" + translation.implicitHeight + ", visible=" + translation.visible);
        verify(translation.y >= main.implicitHeight * 1.4);
    }

    function test_parentVisibilityDoesNotInvalidateTextGeometry() {
        const view = createView({
            lineWindow: [null,
                {
                    lineText: "Current",
                    translation: "译文"
                },
                null]
        });
        verify(view);
        const row = findChild(view, "stillRow1");
        const height = row.height;
        view.visible = false;
        compare(row.height, height);
        view.visible = true;
        compare(row.height, height);
    }
}
