import QtQuick
import QtTest
import "../../../plugins/folia-lyrics-skin/qml/shared"
import "../../../plugins/folia-lyrics-skin/qml/shared/settingsPolicy.mjs" as Policy

TestCase {
    id: root
    name: "FoliaSharedSettings"
    when: windowShown
    visible: true
    width: 480
    height: 260
    function init() {
        failOnWarning(/TypeError|ReferenceError|invalid context/);
        edits.clear();
        patches.clear();
    }
    function control() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/LyricFontScaleControl.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, root, {
            width: 440,
            value: 1.2
        });
    }
    SignalSpy {
        id: edits
        signalName: "valueEdited"
    }
    function test_sourceOwnFontSizeModesKeepScaleAndRejectEditing() {
        const view = control();
        edits.target = view;
        const slider = findChild(view, "foliaLyricsFontScale");
        verify(slider !== null);
        tryVerify(() => slider.width > 400);
        for (const mode of ["sonnet", "tempera", "lumiere"]) {
            view.mode = mode;
            compare(slider.enabled, false);
            compare(view.value, 1.2);
            compare(slider.value, 1.2);
            compare(findChild(view, "foliaAutomaticFontSizeNotice").visible, true);
            mouseClick(slider, 20, slider.height / 2);
            compare(edits.count, 0);
        }
        view.mode = "classic";
        compare(slider.enabled, true);
        compare(slider.stepSize, .05);
        compare(findChild(view, "foliaAutomaticFontSizeNotice").visible, false);
        mouseClick(slider, 30, slider.height / 2);
        verify(edits.count > 0);
    }

    Component {
        id: fieldsComponent
        SettingsFields {
            width: 440
            property var availability: ({
                    avatars: false
                })
            settings: ({
                    classicUseLegacyLayout: false,
                    classicWordSpacing: .7,
                    cappellaAvatarSource: "builtin"
                })
            fields: [
                {
                    key: "classicWordSpacing",
                    title: "词间距",
                    kind: "range",
                    from: 0,
                    to: 2,
                    step: .05,
                    when: {
                        key: "classicUseLegacyLayout",
                        value: false
                    }
                },
                Policy.assetField({
                    key: "cappellaAvatarSource",
                    title: "头像来源",
                    kind: "select",
                    options: [
                        {
                            label: "内置",
                            value: "builtin"
                        },
                        {
                            label: "自定义",
                            value: "custom"
                        }
                    ]
                }, availability)]
        }
    }
    SignalSpy {
        id: patches
        signalName: "patchRequested"
    }
    function test_hiddenDependenciesReleaseEditorAndPreserveConfiguredValue() {
        const view = createTemporaryObject(fieldsComponent, root);
        verify(view !== null);
        tryVerify(() => findChild(view, "classicWordSpacing") !== null);
        view.settings = Object.assign({}, view.settings, {
            classicUseLegacyLayout: true
        });
        tryVerify(() => findChild(view, "classicWordSpacing") === null);
        compare(view.settings.classicWordSpacing, .7);
        view.settings = Object.assign({}, view.settings, {
            classicUseLegacyLayout: false
        });
        tryVerify(() => findChild(view, "classicWordSpacing") !== null);
        compare(findChild(view, "classicWordSpacing").value, .7);
    }
    function test_customSourceRequiresLoadedAssetBeforeNativeSelectAcceptsIt() {
        const view = createTemporaryObject(fieldsComponent, root);
        verify(view !== null);
        patches.target = view;
        tryVerify(() => findChild(view, "cappellaAvatarSource") !== null);
        const select = findChild(view, "cappellaAvatarSource");
        select.choose(1);
        compare(patches.count, 0);
        compare(select.value, "builtin");
        view.availability = {
            avatars: true
        };
        tryVerify(() => {
            const current = findChild(view, "cappellaAvatarSource");
            return current !== null && current.optionModel.optionForValue("custom").disabled === false;
        });
        findChild(view, "cappellaAvatarSource").choose(1);
        compare(patches.count, 1);
        compare(patches.signalArguments[0][0].cappellaAvatarSource, "custom");
    }
    function test_realSettingsCompilesAgainstPublicHostTypes() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/Settings.qml");
        compare(component.status, Component.Ready, component.errorString());
    }
    SignalSpy {
        id: resets
        signalName: "resetRequested"
    }
    function test_groupResetPublishesAnIndependentSnapshotAndDisablesEmptyGroups() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/shared/SettingsGroupHeader.qml");
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, root, {
            objectName: "foliaTestGroup",
            width: 440,
            title: "当前样式",
            resetValues: {
                temperaLayerImages: [
                    {
                        handle: "asset-1",
                        opacity: .5
                    }
                ],
                temperaGrain: .3
            }
        });
        verify(view !== null);
        resets.target = view;
        const button = findChild(view, "foliaTestGroupReset");
        verify(button !== null);
        mouseClick(button, button.width / 2, button.height / 2);
        compare(resets.count, 1);
        const patch = resets.signalArguments[0][0];
        compare(patch.temperaGrain, .3);
        compare(patch.temperaLayerImages[0].opacity, .5);
        patch.temperaLayerImages[0].opacity = .9;
        compare(view.resetValues.temperaLayerImages[0].opacity, .5);
        view.resetValues = {};
        compare(button.enabled, false);
        mouseClick(button, button.width / 2, button.height / 2);
        compare(resets.count, 1);
    }
}
