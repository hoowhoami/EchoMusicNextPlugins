import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaSettingsFields"
    when: windowShown
    visible: true
    width: 400
    height: 360
    Component {
        id: editor
        SettingsFields {
            width: 340
            settings: ({washMode: "theme", wash: "#8fb7ff"})
            fields: [{key: "wash", title: "Wash", kind: "color", when: {key: "washMode", value: "custom"}}]
        }
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|is not a function/);
    }
    function test_conditionalPickerUsesSharedNativeRgbEditorAndOneFlatPatch() {
        const fields = createTemporaryObject(editor, testCase);
        verify(fields);
        wait(10);
        compare(findChild(fields, "wash"), null);
        fields.settings = {washMode: "custom", wash: "#8fb7ff"};
        let picker = null;
        tryVerify(() => (picker = findChild(fields, "wash")) !== null, 2000);
        const spectrum = findChild(picker, "colorSaturationValue");
        verify(spectrum);
        let patch = null;
        fields.patchRequested.connect(value => patch = value);
        mouseClick(spectrum, spectrum.width * .7, spectrum.height * .35);
        verify(patch && /^#[0-9a-fA-F]{6}$/.test(patch.wash));
        compare(Object.keys(patch).join(","), "wash");
        compare(fields.settings.wash, "#8fb7ff", "Only the host accepts a persistence patch");
        fields.settings = {washMode: "theme", wash: patch.wash};
        tryCompare(fields, "implicitHeight", 0, 2000);
        compare(findChild(fields, "wash"), null);
    }
    function test_parentDisabledKeepsTheChildValueAndEditor() {
        const fields = createTemporaryObject(editor, testCase, {
            settings: {geometryEnabled: false, density: 576},
            fields: [{key: "density", title: "Density", kind: "range", from: 96, to: 1536, step: 24, enabledWhen: {key: "geometryEnabled", value: true}}]
        });
        let slider = null;
        tryVerify(() => (slider = findChild(fields, "density")) !== null, 2000);
        compare(slider.enabled, false);
        compare(slider.value, 576);
        fields.settings = {geometryEnabled: true, density: 576};
        compare(slider.enabled, true);
        compare(findChild(fields, "density"), slider);
        compare(slider.value, 576);
    }
}
