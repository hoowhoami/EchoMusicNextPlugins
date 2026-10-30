import QtQuick
import QtTest
import "../../build/folia-qml/config.mjs" as Configuration

TestCase {
    name: "FoliaNativeConfiguration"
    property list<string> nativeFamilies: ["follow", "PingFang SC"]

    function test_qtSequenceSurvivesValidation() {
        verify(!Array.isArray(nativeFamilies));
        const values = Object.assign({}, Configuration.defaults, {
            fontFamilies: nativeFamilies
        });
        compare(Configuration.validate(values), true);
        compare(nativeFamilies.length, 2);
        compare(nativeFamilies[0], "follow");
    }
}
