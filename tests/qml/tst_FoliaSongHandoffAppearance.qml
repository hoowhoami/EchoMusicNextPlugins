import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared

TestCase {
    id: test
    name: "FumeHeldAppearance"
    when: windowShown
    Component {
        id: factory
        Shared.SongHandoff {
            plugin: foliaTestPlugin
            page: null
            live: false
            appearance: ({
                    dark: true,
                    text: "#fefefe",
                    secondaryText: "#aaaaaa",
                    accent: "#abcdef",
                    main: "#111111",
                    themeMetadata: {
                        title: "A seed",
                        description: "A"
                    }
                })
        }
    }
    function verifyClone(item) {
        for (const key of ["dark", "text", "secondaryText", "accent", "main"])
            compare(item.heldAppearance[key], item.appearance[key], key);
        compare(JSON.stringify(item.heldAppearance.themeMetadata), JSON.stringify(item.appearance.themeMetadata));
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|invalid context/);
    }
    function test_outgoingAppearanceExistsBeforeHoldingCanNotify() {
        const item = createTemporaryObject(factory, test);
        verify(item !== null);
        compare(item.holding, false);
        verifyClone(item);
        verify(item.heldAppearance !== item.appearance);
        item.appearance.themeMetadata.title = "mutated without a publication";
        compare(item.heldAppearance.themeMetadata.title, "A seed");
    }
    function test_nonHoldingAppearancePublicationRefreshesTheNextSnapshot() {
        const item = createTemporaryObject(factory, test);
        verify(item !== null);
        item.appearance = {
            dark: false,
            text: "#101010",
            secondaryText: "#555555",
            accent: "#012345",
            main: "#fefefe",
            themeMetadata: {
                title: "B seed",
                description: "B"
            }
        };
        verifyClone(item);
        compare(item.heldAppearance.themeMetadata.title, "B seed");
    }
}
