import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    name: "FoliaFonts"
    FoliaFont {
        id: styled
        base: Qt.font({
            family: "monospace",
            italic: true
        })
        pixelSize: 40
        weight: 700
        letterSpacing: 0.8
    }
    function test_hostFontValueKeepsFallbackAndOtherFields() {
        compare(styled.value.family, styled.base.family);
        compare(styled.value.italic, true);
        compare(styled.value.pixelSize, 40);
        compare(styled.value.weight, 700);
        fuzzyCompare(styled.value.letterSpacing, 0.8, 1 / 64); // QFont uses 26.6 fixed point.
        compare(styled.base.pixelSize, Qt.font({
            family: "monospace",
            italic: true
        }).pixelSize);
        styled.base = Qt.font({
            family: "serif",
            italic: false
        });
        compare(styled.value.family, styled.base.family);
        compare(styled.value.italic, false);
        compare(styled.value.pixelSize, 40);
        compare(styled.value.weight, 700);
    }
}
