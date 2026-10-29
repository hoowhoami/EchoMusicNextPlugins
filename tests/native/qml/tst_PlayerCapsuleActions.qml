// Real current-source volume controls; run with FOLIA_CAPSULE_ONLY=1.
pragma ComponentBehavior: Bound
import QtQuick
import QtTest
import EchoMusic.PluginSdk

TestCase {
    id: testCase
    name: "FoliaPlayerCapsuleActions"
    when: windowShown
    visible: true
    width: 1000
    height: 800
    readonly property var fixture: foliaTestCapsuleFixture
    property var actor: null
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|SyntaxError:|Unable to assign|Binding loop|invalid context|is not a function/);
        fixture.enabled = true;
        tryVerify(() => fixture.page && fixture.page.active && fixture.page.player.hasTrack && !fixture.page.player.loading && !fixture.page.player.errorMessage, 10000);
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/PlayerCapsule.qml");
        compare(component.status, Component.Ready, component.errorString());
        actor = component.createObject(testCase, {
            page: fixture.page,
            width: width,
            height: height,
            appearance: {
                motionEnabled: false
            }
        });
        verify(actor !== null);
        tryCompare(actor, "controlsEnabled", true);
    }
    function cleanup() {
        if (actor) {
            actor.destroy();
            actor = null;
        }
        wait(50);
        fixture.enabled = false;
        wait(20);
    }
    function test_currentVolumeChangesAndPersistsThroughTheExistingCommand() {
        actor.invokeSlot("volume");
        const host = findChild(actor, "foliaCapsulePanelHost");
        tryVerify(() => host.item !== null);
        const panel = host.item, slider = findChild(panel, "foliaCapsuleVolumeSlider");
        verify(slider !== null);
        tryVerify(() => slider.width > 200);
        mousePress(slider, slider.width * .25, slider.height / 2);
        mouseMove(slider, slider.width * .72, slider.height / 2, 30, Qt.LeftButton);
        tryVerify(() => fixture.page.player.volume > 60 && fixture.page.player.volume < 85);
        const changed = fixture.page.player.volume;
        fixture.refresh = Number(fixture.refresh) + 1;
        tryCompare(fixture, "persistedVolume", changed);
        mouseRelease(slider, slider.width * .72, slider.height / 2);
        mouseClick(findChild(panel, "foliaCapsulePanelClose"));
        tryCompare(host, "item", null);
        compare(fixture.page.player.volume, changed);
    }
    function test_hidingRetiresTheVolumePanelWithoutAnExtraRollbackProtocol() {
        actor.invokeSlot("volume");
        const host = findChild(actor, "foliaCapsulePanelHost");
        tryVerify(() => host.item !== null);
        const operation = fixture.page.command("volume", {
            value: 61
        });
        tryCompare(operation, "state", EchoPluginOperation.Succeeded);
        compare(fixture.page.player.volume, 61);
        actor.hideControlBar = true;
        tryCompare(host, "item", null);
        actor.hideControlBar = false;
        tryCompare(actor, "controlsEnabled", true);
        compare(host.item, null);
        compare(fixture.page.player.volume, 61);
    }
}
