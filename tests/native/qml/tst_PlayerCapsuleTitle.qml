import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaPlayerCapsuleTitle"
    when: windowShown

    function createTitle() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/PlayerCapsuleTitle.qml");
        compare(component.status, Component.Ready, component.errorString());
        const families = Qt.fontFamilies();
        const family = ["Arial", "DejaVu Sans", "Noto Sans", "Liberation Sans"].find(value => families.indexOf(value) >= 0) || families[0];
        return createTemporaryObject(component, testCase, {
            baseFont: Qt.font({
                families: [family],
                pixelSize: 14,
                weight: 700
            }),
            title: "Current",
            trackKey: "1",
            previousTitle: "Previous",
            nextTitle: "Next",
            width: 320,
            height: 24
        });
    }

    function test_titlePreviewAndTrackIdentityConfirmation() {
        const title = createTitle();
        compare(title.displayTitle, "Current");
        title.enterZone("next");
        compare(title.previewTitle, "Next");
        title.leaveZone();
        compare(title.previewTitle, "");
        compare(title.shownPreview, "Next");
        title.enterZone("prev");
        compare(title.previewTitle, "Previous");
        title.beginSwitch("prev");
        compare(title.previewTitle, "");
        // Keep the actual host title until its command has really changed the track.
        compare(title.displayTitle, "Current");
        title.title = "Current";
        title.trackKey = "2";
        compare(title.confirming, true);
        title.previousTitle = "Another";
        compare(title.previewTitle, "");
        tryCompare(title, "confirming", false, 1300);
        compare(title.previewTitle, "Another");
        title.disabled = true;
        compare(title.previewTitle, "");
    }
}
