import QtQuick
import QtTest
import EchoMusic.PluginSdk
import "../../../plugins/folia-lyrics-skin/qml/shared" as Shared

TestCase {
    id: testCase
    name: "FoliaPlayerCapsuleLifecycle"
    when: windowShown
    visible: true
    width: 1000
    height: 800
    property var holder: null
    readonly property var fixture: foliaTestCapsuleFixture

    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|invalid context|is not a function/);
        fixture.enabled = true;
        tryVerify(() => fixture.page !== null && fixture.page.active && fixture.page.player.hasTrack, 10000);
    }
    function cleanup() {
        if (holder) {
            holder.destroy();
            holder = null;
        }
        wait(30);
        fixture.enabled = false;
        wait(30);
    }
    Component {
        id: ownerComponent
        Item {
            required property EchoPluginViewContext nativeView
            width: testCase.width
            height: testCase.height
            property alias capsule: capsule
            Shared.PlayerCapsule {
                id: capsule
                anchors.fill: parent
                page: parent.nativeView
                settings: ({
                        playerControlSlotPrimary: "loop",
                        playerControlSlotSecondary: "like"
                    })
                appearance: ({
                        motionEnabled: true
                    })
            }
        }
    }
    function slotItem(item, label) {
        if (item && item.text === label && typeof item.glyph === "string")
            return item;
        for (const child of item.children || []) {
            const found = slotItem(child, label);
            if (found)
                return found;
        }
        return null;
    }
    function test_nativeQueueCountFeedsAdjacentNavigation() {
        holder = ownerComponent.createObject(testCase, {
            nativeView: fixture.page
        });
        verify(holder !== null);
        const capsule = holder.capsule;
        tryCompare(capsule, "controlsEnabled", true);
        tryVerify(() => fixture.page.player.queue.row(100).isCurrent);
        tryVerify(() => capsule.adjacentTracks.nextTitle === "Authored queue track 102", 5000, "Actual native queue navigation: " + JSON.stringify(capsule.adjacentTracks));
        compare(capsule.adjacentTracks.previousTitle, "Authored queue track 100");
        compare(capsule.adjacentTracks.canPrevious, true);
        compare(capsule.adjacentTracks.canNext, true);
    }
    function test_parentDestructionRetiresActualSlotDelegates() {
        for (let cycle = 0; cycle < 12; ++cycle) {
            holder = ownerComponent.createObject(testCase, {
                nativeView: fixture.page
            });
            verify(holder !== null);
            const capsule = holder.capsule;
            tryCompare(capsule, "controlsEnabled", true);
            const host = findChild(capsule, "foliaCapsuleHost");
            tryVerify(() => host.item !== null);
            let loop = null;
            tryVerify(() => (loop = slotItem(host.item, capsule.slotLabel("loop"))) !== null);
            verify(loop.enabled);
            compare(loop.opacity, capsule.playMode === 3 ? .4 : 1);
            // A closing page disables its visual parent before deleting it.
            // Item destruction later detaches descendants and recomputes their
            // effective enabled state while the Capsule's root id is retiring.
            holder.enabled = false;
            compare(loop.enabled, false);
            // Keep a real parent retirement queued while native state and the
            // instantiated loop/like delegates still have active bindings.
            holder.destroy();
            holder = null;
            wait(20);
        }
    }
    function test_nativeViewCanRetireBeforeQueuedParentDeletion() {
        holder = ownerComponent.createObject(testCase, {
            nativeView: fixture.page
        });
        verify(holder !== null);
        const capsule = holder.capsule;
        tryCompare(capsule, "controlsEnabled", true);
        const host = findChild(capsule, "foliaCapsuleHost");
        tryVerify(() => host.item !== null);
        verify(slotItem(host.item, capsule.slotLabel("loop")) !== null);
        // Native presentation retirement can precede the deferred deletion of
        // the containing visual parent. The real scope and models are revoked.
        holder.destroy();
        holder = null;
        fixture.enabled = false;
        wait(50);
    }
    function test_loopCommandKeepsNativeGlyphAndOpacitySemantics() {
        holder = ownerComponent.createObject(testCase, {
            nativeView: fixture.page
        });
        verify(holder !== null);
        const capsule = holder.capsule;
        tryCompare(capsule, "controlsEnabled", true);
        const host = findChild(capsule, "foliaCapsuleHost");
        tryVerify(() => host.item !== null);
        let loop = null;
        tryVerify(() => (loop = slotItem(host.item, capsule.slotLabel("loop"))) !== null);
        const variants = [
            {
                mode: 0,
                glyph: "repeat",
                opacity: 1
            },
            {
                mode: 1,
                glyph: "repeat-once",
                opacity: 1
            },
            {
                mode: 3,
                glyph: "repeat-off",
                opacity: .4
            },
            {
                mode: 0,
                glyph: "repeat",
                opacity: 1
            }
        ];
        for (let index = 0; index < variants.length; ++index) {
            const variant = variants[index];
            if (index)
                capsule.invokeSlot("loop");
            tryCompare(capsule, "playMode", variant.mode);
            compare(loop.enabled, true);
            compare(loop.glyph, variant.glyph);
            compare(loop.opacity, variant.opacity);
            compare(loop.text, capsule.slotLabel("loop"));
            compare(loop.foreground, capsule.primaryColor);
        }
    }
}
