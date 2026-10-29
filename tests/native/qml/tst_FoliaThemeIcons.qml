// CPU-only native binding/lifecycle contract, not a GPU or pixel-comparison test.
import QtQuick
import QtTest
import "../../../plugins/folia-lyrics-skin/qml/shared" as Shared
import "../../../plugins/folia-lyrics-skin/qml/styles/monet" as Monet
import "../../../plugins/folia-lyrics-skin/qml/styles/pendolo" as Pendolo

TestCase {
    id: testCase
    name: "FoliaThemeIcons"
    when: windowShown
    width: 1000
    height: 720
    visible: true
    function initTestCase() {
        compare(GraphicsInfo.api, GraphicsInfo.Software, "this diagnostic must stay CPU-only");
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|is not a function|Binding loop/);
    }
    Component {
        id: stageComponent
        Shared.VisualizerStage {
            preparedLines: []
            live: false
        }
    }
    Component {
        id: iconComponent
        Shared.ThemeIcon {
            width: 54
            height: 54
        }
    }
    Component {
        id: decorComponent
        Monet.MonetFloatingDecor {
            width: 1000
            height: 720
        }
    }
    Component {
        id: clockworkComponent
        Pendolo.PendoloClockwork {
            width: 1000
            height: 720
            geometry: ({
                    centerX: 500,
                    centerY: 360,
                    baseRadius: 180,
                    lyricRingRadius: 260
                })
            tuning: ({
                    showGearDecor: "simple",
                    showCenterGradient: false,
                    showCoverOnWatchFace: false,
                    enableLineGlow: false
                })
            motion: ({
                    escapementAngle: 0,
                    phase: 0,
                    secondGearAngle: 0,
                    bassOscillation: 0
                })
        }
    }
    function test_nativeStageBindsAllFourAndThemeChangesRemainLive() {
        const stage = createTemporaryObject(stageComponent, testCase, {
            lyricsIcons: ["Heart", "UnknownIcon", "Heart"]
        });
        verify(stage);
        for (const mode of ["sonnet", "lumiere", "pendolo", "monet"]) {
            const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/styles/" + mode + "/" + mode.charAt(0).toUpperCase() + mode.slice(1) + ".qml");
            compare(component.status, Component.Ready, component.errorString());
            const view = createTemporaryObject(component, testCase, {
                width: 1000,
                height: 720,
                live: false,
                visible: false,
                preparedLines: [],
                baseFont: Qt.font({
                    family: "Arial",
                    pixelSize: 24
                })
            });
            verify(view);
            stage.bindInputs(view);
            compare(Array.from(view.lyricsIcons), ["Heart", "UnknownIcon", "Heart"], mode);
            if (mode === "sonnet")
                compare(Array.from(view.theme.lyricsIcons), Array.from(view.lyricsIcons));
            if (mode === "lumiere")
                compare(Array.from(view.sourceTheme.lyricsIcons), Array.from(view.lyricsIcons));
            stage.lyricsIcons = ["StarIcon"];
            compare(Array.from(view.lyricsIcons), ["StarIcon"], mode + " reactive theme replacement");
            stage.lyricsIcons = [];
            compare(Array.from(view.lyricsIcons), [], mode + " removed metadata");
            stage.lyricsIcons = ["Heart", "UnknownIcon", "Heart"];
        }
    }
    function test_nativeVectorExactNamesAndSeparateFallbacks() {
        const icon = createTemporaryObject(iconComponent, testCase, {
            iconName: "Heart"
        });
        verify(icon);
        compare(icon.resolvedName, "Heart");
        verify(icon.vectorPath.length > 0);
        const original = icon.vectorPath;
        icon.iconName = "HeartIcon";
        compare(icon.vectorPath, original);
        icon.iconName = "heart";
        compare(icon.resolvedName, "");
        compare(icon.vectorPath, "");
        icon.fallbackName = "Star";
        compare(icon.resolvedName, "Star");
        for (const name of ["UnknownIcon", "__proto__", "constructor", "toString"]) {
            icon.iconName = name;
            compare(icon.resolvedName, "Star");
        }
    }
    function test_monetPageOwnsDecorLoaderAndReleasesOnShowTextOff() {
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/styles/monet/Monet.qml");
        compare(component.status, Component.Ready, component.errorString());
        const view = createTemporaryObject(component, testCase, {
            width: 640,
            height: 720,
            preparedLines: [],
            previewRows: [],
            motionEnabled: false,
            textService: foliaTestTextService,
            assetsService: foliaTestPlugin.assets,
            baseFont: Qt.font({
                family: "Arial",
                pixelSize: 24
            }),
            settings: {
                monetShowDescription: false,
                monetShowAudioVisualization: false
            },
            lyricsIcons: ["Heart", "UnknownIcon"]
        });
        verify(view);
        tryVerify(() => findChild(view, "monetThemeParticle1") !== null);
        const icon = findChild(view, "monetThemeParticle1");
        compare(icon.resolvedName, "");
        view.lyricsIcons = ["StarIcon"];
        tryVerify(() => findChild(view, "monetThemeParticle1").resolvedName === "StarIcon");
        view.settings = Object.assign({}, view.settings, {
            showText: false
        });
        tryVerify(() => !findChild(view, "monetThemeParticle1"));
        compare(view.errorString, "");
        view.live = false;
    }
    function test_pendoloFirstSlotOnlyAndOriginalStarFallback() {
        const view = createTemporaryObject(clockworkComponent, testCase, {
            lyricsIcons: ["Heart", "Flower"]
        });
        verify(view);
        tryVerify(() => findChild(view, "pendoloBalanceStar") !== null);
        const icon = findChild(view, "pendoloBalanceStar");
        compare(icon.resolvedName, "Heart");
        compare(icon.strokeWidth, 1.2);
        view.lyricsIcons = ["UnknownIcon", "Heart"];
        compare(icon.resolvedName, "Star", "do not search later valid slots");
        view.lyricsIcons = [];
        compare(icon.resolvedName, "Star");
        view.live = false;
        tryCompare(view, "resourcesActive", false);
        tryVerify(() => !findChild(view, "pendoloBalanceStar"));
    }
    function test_monetSparseSlotsUnknownEmptyStaticAndOwnedClock() {
        const decor = createTemporaryObject(decorComponent, testCase, {
            lyricsIcons: ["Heart", "UnknownIcon", "Heart"],
            motionEnabled: false,
            color: "#abc123"
        });
        verify(decor);
        compare(decor.slotCount, 8);
        compare(decor.running, false);
        compare(decor.opacity, 1);
        for (const id of [1, 2, 3, 4, 5, 6, 7, 9]) {
            const particle = findChild(decor, "monetThemeParticle" + id);
            verify(particle);
            compare(particle.iconName, ["Heart", "UnknownIcon", "Heart"][id % 3]);
            compare(particle.resolvedName, id % 3 === 1 ? "" : "Heart");
            compare(particle.strokeWidth, 1);
            compare(particle.frame.x, 0);
            compare(particle.frame.y, 0);
            compare(particle.rotation, particle.modelData.rotation);
            compare(particle.opacity, particle.modelData.opacity);
        }
        for (const id of [0, 8])
            verify(!findChild(decor, "monetThemeParticle" + id));
        decor.motionEnabled = true;
        tryCompare(decor, "running", true);
        tryVerify(() => decor.elapsed > 0);
        decor.visible = false;
        compare(decor.running, false);
        const frozen = decor.elapsed;
        wait(60);
        compare(decor.elapsed, frozen);
        decor.visible = true;
        tryCompare(decor, "running", true);
        decor.live = false;
        compare(decor.running, false);
        verify(!findChild(decor, "monetThemeParticle1"));
        decor.lyricsIcons = [];
        compare(decor.slotCount, 0);
    }
}
