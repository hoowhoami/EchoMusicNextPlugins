import QtQuick
import QtTest

TestCase {
    id: root
    name: "FoliaTypography"
    when: windowShown
    visible: true
    width: 760
    height: 560
    property var current: null
    SignalSpy {
        id: patches
        signalName: "patchRequested"
    }
    SignalSpy {
        id: weights
        signalName: "weightEdited"
    }
    function init() {
        failOnWarning(/TypeError|ReferenceError|invalid context/);
        patches.clear();
        weights.clear();
    }
    function editor() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/FontFamilyControl.qml");
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, root, {
            width: 720,
            plugin: foliaTestPlugin,
            settings: {
                fontStyle: "serif",
                fontFamilies: ["Georgia", "Songti SC"],
                subtitleFontStyle: "mono",
                subtitleFontFamilies: ["Menlo"]
            }
        });
        verify(view !== null);
        current = view;
        patches.target = view;
        view.patchRequested.connect(function (patch) {
            view.settings = Object.assign({}, view.settings, patch);
        });
        return view;
    }
    function test_builtinSelectionClearsCustomFallbackAndArrowOnlyMovesFocus() {
        const view = editor();
        const mono = findChild(view, "foliaFontStyleMono");
        verify(mono !== null);
        mono.forceActiveFocus();
        keyClick(Qt.Key_Left);
        compare(patches.count, 0);
        compare(view.settings.fontStyle, "serif");
        mono.forceActiveFocus();
        keyClick(Qt.Key_Return);
        compare(patches.count, 1);
        compare(view.settings.fontStyle, "mono");
        compare(view.settings.fontFamilies.join(","), "follow");
        tryVerify(() => findChild(view, "foliaFontFamilies") === null);
        compare(view.settings.subtitleFontFamilies.join(","), "Menlo");
    }
    function test_customSelectionAndOrderedFallbackCommitRetainUnderlyingCategory() {
        const view = editor();
        findChild(view, "foliaFontStyleCustom").clicked();
        compare(patches.count, 0);
        const select = findChild(view, "foliaFontFamilies");
        verify(select.visible);
        const entry = select.optionModel.optionForValue("Menlo");
        verify(entry.sourceIndex !== undefined);
        select.choose(select.optionModel.filteredIndex(entry.sourceIndex));
        compare(view.settings.fontStyle, "serif");
        compare(view.settings.fontFamilies.join(","), "Menlo,Songti SC");
        const fallback = findChild(view, "foliaFontFallbacks");
        fallback.forceActiveFocus();
        fallback.text = ' "Songti SC", songti sc\nMenlo';
        keyClick(Qt.Key_Return, Qt.ControlModifier);
        compare(view.settings.fontFamilies.join(","), "Menlo,Songti SC,Menlo");
        const before = patches.count;
        fallback.text = Array.from({
            length: 16
        }, (_, i) => "Font" + i).join(",");
        keyClick(Qt.Key_Return, Qt.ControlModifier);
        compare(patches.count, before);
        verify(view.errorString.length > 0);
    }
    function test_automaticWeightRemembersLastManualWeightAndReleasesSlider() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/FontWeightControl.qml");
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, root, {
            width: 480,
            weight: 350
        });
        verify(view !== null);
        weights.target = view;
        view.weightEdited.connect(function (value) {
            view.weight = value;
        });
        const follow = findChild(view, "foliaFontWeightAuto");
        verify(follow !== null);
        tryVerify(() => findChild(view, "foliaFontWeight") !== null);
        mouseClick(follow, follow.width / 2, follow.height / 2);
        compare(view.weight, null);
        tryVerify(() => findChild(view, "foliaFontWeight") === null);
        mouseClick(follow, follow.width / 2, follow.height / 2);
        compare(view.weight, 350);
        tryVerify(() => findChild(view, "foliaFontWeight") !== null);
        compare(findChild(view, "foliaFontWeight").stepSize, 10);
    }
    function test_subtitleCategoryEditsUseIndependentKeysAndFitNarrowDrawer() {
        const view = editor();
        view.subtitle = true;
        view.width = 288;
        const custom = findChild(view, "foliaSubtitleFontStyleCustom");
        const serif = findChild(view, "foliaSubtitleFontStyleSerif");
        verify(custom !== null);
        verify(serif !== null);
        tryVerify(() => custom.width > 0 && custom.x + custom.width <= view.width);
        for (const category of ["Sans", "Serif", "Mono", "Custom"]) {
            const tile = findChild(view, "foliaSubtitleFontStyle" + category);
            tryVerify(() => Math.abs(tile.width - (view.width - 24) / 4) <= 1);
        }
        mouseClick(serif, serif.width / 2, serif.height / 2);
        compare(view.settings.subtitleFontStyle, "serif");
        compare(view.settings.subtitleFontFamilies.join(","), "follow");
        compare(view.settings.fontStyle, "serif");
        compare(view.settings.fontFamilies.join(","), "Georgia,Songti SC");
        tryVerify(() => findChild(view, "foliaSubtitleFontFamilies") === null);
        for (const category of ["Sans", "Serif", "Mono", "Custom"]) {
            const tile = findChild(view, "foliaSubtitleFontStyle" + category);
            tryVerify(() => Math.abs(tile.width - (view.width - 24) / 4) <= 1);
        }
        verify(waitForRendering(view));
        const capture = grabImage(view);
        compare(capture.width, Math.round(288 * Screen.devicePixelRatio));
        verify(capture.height >= 72 * Screen.devicePixelRatio);
        capture.save("/tmp/folia-subtitle-font-tiles.png");
    }
}
