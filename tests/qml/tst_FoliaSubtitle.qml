import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaSubtitle"
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
        id: overlayComponent
        SubtitleOverlay {
            width: 1100
            height: 820
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 20
            })
            activeLine: ({
                    startTime: 0,
                    translation: "明天再见",
                    romanization: "See you tomorrow"
                })
            settings: ({
                    subtitleContentMode: "both",
                    subtitleOverlayOpacity: 0.6
                })
        }
    }
    function createOverlay(values) {
        return createTemporaryObject(overlayComponent, testCase, values || {});
    }
    function test_tracksFontsAndChromePresenceUseSourceGeometry() {
        const view = createOverlay({
            motionEnabled: false
        });
        verify(view);
        tryVerify(() => view.resourcesActive);
        const first = findChild(view, "foliaSubtitleText0");
        const second = findChild(view, "foliaSubtitleText1");
        verify(first && second);
        compare(first.text, "See you tomorrow");
        compare(second.text, "明天再见");
        compare(first.font.family, "Menlo");
        compare(first.font.weight, 500);
        compare(second.font.weight, 400);
        compare(first.font.pixelSize, 20);
        compare(second.font.pixelSize, 18);
        compare(view.subtitleBottom, 112);
        view.bottomOffset = 80;
        compare(view.subtitleBottom, 160);
        view.chromeHidden = true;
        tryCompare(view, "subtitleBottom", 32);
        view.chromeHidden = false;
        tryCompare(view, "subtitleBottom", 160);
        waitForRendering(view);
        grabImage(view).save("build/folia-native-qml/subtitle-bilingual.png");
    }
    function test_hidingRetainsContentForExitThenReleasesAllLayers() {
        const view = createOverlay();
        tryVerify(() => view.resourcesActive);
        wait(320);
        view.settings = Object.assign({}, view.settings, {
            hideTranslationSubtitle: true
        });
        compare(view.shouldRender, false);
        verify(view.resourcesActive);
        compare(findChild(view, "foliaSubtitleText0").text, "See you tomorrow");
        wait(80);
        verify(view.resourcesActive);
        tryCompare(view, "resourcesActive", false, 1000);
        view.settings = Object.assign({}, view.settings, {
            hideTranslationSubtitle: false
        });
        tryVerify(() => view.resourcesActive);
        view.live = false;
        compare(view.resourcesActive, false);
        verify(!findChild(view, "foliaSubtitleText0"));
    }
    function test_noneModeShowsReadableUpcomingRowsAndDropsStaleTracks() {
        const view = createOverlay({
            motionEnabled: false,
            settings: {
                subtitleContentMode: "none",
                subtitleOverlayBackground: false
            },
            nextLines: [
                {
                    fullText: "♪"
                },
                {
                    fullText: "下一句歌词非常长所以必须保持单行"
                },
                {
                    fullText: "Then tomorrow"
                }
            ]
        });
        tryVerify(() => view.resourcesActive);
        const first = findChild(view, "foliaSubtitleText0");
        const second = findChild(view, "foliaSubtitleText1");
        compare(first.text, "下一句歌词非常长所以必须保持单行");
        compare(second.text, "Then tomorrow");
        compare(first.wrapMode, Text.NoWrap);
        compare(first.elide, Text.ElideRight);
        compare(first.font.weight, 400);
        compare(first.font.pixelSize, 16);
        view.activeLine = null;
        tryCompare(view, "resourcesActive", false);
    }
}
