import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../../plugins/folia-lyrics-skin/qml/shared" as Shared

TestCase {
    id: testCase
    name: "FoliaPresentationClock"
    when: windowShown
    visible: true
    width: 720
    height: 480
    property var clockItem: null

    function initTestCase() {
        verify(foliaTestHandoffFixture.available, "Run with FOLIA_HANDOFF_ONLY=1 for the real native playback/view fixture.");
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|invalid context|is not a function/);
        foliaTestHandoffFixture.enabled = true;
        tryVerify(() => foliaTestHandoffFixture.page !== null, 10000);
        const player = foliaTestHandoffFixture.page.player;
        tryVerify(() => player.playing && !player.loading, 15000, foliaTestHandoffFixture.observed);
        clockItem = createTemporaryObject(clockComponent, testCase, {
            page: foliaTestHandoffFixture.page
        });
        verify(clockItem !== null);
        tryCompare(clockItem, "live", true);
        tryVerify(() => clockItem.renderTime > 0, 3000);
    }
    function cleanup() {
        if (clockItem) {
            clockItem.destroy();
            clockItem = null;
            wait(10);
        }
        foliaTestHandoffFixture.enabled = false;
        wait(40);
    }
    Component {
        id: clockComponent
        Shared.PresentationClock {}
    }
    function test_inactive_view_detaches_the_native_projection_and_freezes() {
        const player = foliaTestHandoffFixture.page.player;
        foliaTestHandoffFixture.presented = false;
        tryCompare(clockItem, "live", false);
        const frozen = clockItem.renderTime, position = player.positionMs;
        tryVerify(() => player.positionMs > position, 3000);
        compare(clockItem.renderTime, frozen);
        compare(clockItem.transition, null);
        clockItem.publish();
        clockItem.observe(false);
        clockItem.syncState();
        compare(clockItem.renderTime, frozen);
    }
    function test_destroyed_native_view_rejects_late_clock_callbacks() {
        foliaTestHandoffFixture.enabled = false;
        tryCompare(clockItem, "page", null);
        tryCompare(clockItem, "live", false);
        const frozen = clockItem.renderTime;
        clockItem.publish();
        clockItem.observe(true);
        clockItem.syncState();
        wait(100);
        compare(clockItem.renderTime, frozen);
        compare(clockItem.transition, null);
    }
    function test_queued_native_seek_can_retire_with_its_clock() {
        const player = foliaTestHandoffFixture.page.player;
        const operation = player.seek(1000);
        verify(operation !== null);
        clockItem.destroy();
        clockItem = null;
        foliaTestHandoffFixture.enabled = false;
        wait(150);
    }
}
