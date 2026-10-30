import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaPlayerCapsule"
    when: windowShown
    width: 1000
    height: 800

    function test_publicTypedPageAndLazyResources() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/PlayerCapsule.qml");
        compare(component.status, Component.Ready, component.errorString());
        const capsule = createTemporaryObject(component, testCase, {
            page: null,
            width: 1000,
            height: 800
        });
        verify(capsule);
        compare(capsule.liveBottomOffset, 32);
        compare(capsule.startPositioning(), false);
        const host = findChild(capsule, "foliaCapsuleHost");
        verify(host);
        compare(host.active, false);
        const positioner = findChild(capsule, "foliaCapsulePositionerHost");
        verify(positioner);
        compare(positioner.active, false);
        compare(positioner.item, null);
        compare(capsule.actionSupported("lyrics-timeline"), false);
        capsule.canShowTimeline = true;
        compare(capsule.actionSupported("lyrics-timeline"), true);
        for (const action of ["loop", "prev", "next", "like", "volume", "queue"])
            compare(capsule.actionSupported(action), true, action);
        const modalHost = findChild(capsule, "foliaCapsulePanelHost");
        verify(modalHost);
        compare(modalHost.active, false);
        compare(modalHost.item, null);
    }
}
