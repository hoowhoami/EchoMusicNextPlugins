import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/backgrounds"
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared

TestCase {
    id: testCase
    name: "FoliaBackgroundPresentation"
    when: windowShown
    visible: true
    width: 640
    height: 480
    Component {
        id: background
        BackgroundPresentation {
            graphics: foliaTestPlugin.graphics
            width: 640
            height: 480
            settings: ({
                    backgroundMode: "sora",
                    soraBlank: true
                })
            primaryColor: "#ff0044"
            accentColor: "#4466ff"
        }
    }
    Component {
        id: collectionComponent
        Shared.AssetCollection {
            plugin: foliaTestPlugin
            collection: "test.background.handoff"
        }
    }
    function init() {
        failOnWarning(/invalid context|TypeError:|ReferenceError:|Unable to assign|is not a function|Binding loop/);
    }
    function test_backgroundWaitsWithStyleKeepsOldLookAndThenReleases() {
        const view = createTemporaryObject(background, testCase);
        tryCompare(view, "layerCount", 1);
        const old = view.renderer;
        verify(old);
        view.styleWaits = true;
        view.settings = {
            backgroundMode: "latent"
        };
        view.primaryColor = "#00ff66";
        tryCompare(view, "layerCount", 2);
        tryCompare(view, "transitionWaits", true);
        wait(150);
        compare(old.primaryColor, Qt.color("#ff0044"));
        compare(view.actors[0].progress, 1, "Old background stays opaque under the waiting one");
        compare(view.actors[1].progress, 0);
        view.styleWaits = false;
        tryCompare(view, "transitionWaits", false, 1500);
        tryCompare(view, "layerCount", 1, 2200);
        tryCompare(view, "transitionBytes", 0, 1500);
        compare(view.renderer.primaryColor, Qt.color("#00ff66"));
        compare(view.errorString, "");
    }
    function test_returnWhileWaitingReusesTheActuallyDrawnBackground() {
        const view = createTemporaryObject(background, testCase);
        tryCompare(view, "layerCount", 1);
        const original = view.renderer;
        view.styleWaits = true;
        view.settings = {
            backgroundMode: "latent"
        };
        tryCompare(view, "layerCount", 2);
        view.settings = {
            backgroundMode: "sora",
            soraBlank: true
        };
        tryCompare(view, "layerCount", 1);
        compare(view.renderer, original);
        compare(view.actors[0].progress, 1);
        compare(view.transitionBytes, 0);
    }
    function test_stillWaitsForStyleThenActuallyUnmountsTheBackground() {
        const view = createTemporaryObject(background, testCase);
        tryCompare(view, 'layerCount', 1);
        const previous = view.renderer;
        verify(previous);
        view.styleWaits = true;
        view.settings = {
            mode: 'still',
            backgroundMode: 'sora',
            soraBlank: true
        };
        tryCompare(view, 'layerCount', 2, 1500);
        compare(view.renderer, null);
        compare(view.actors[0].progress, 1);
        wait(100);
        compare(view.actors[0].progress, 1);
        view.styleWaits = false;
        tryCompare(view, 'layerCount', 1, 1500);
        compare(view.renderer, null);
        compare(view.transitionBytes, 0);
        view.settings = {
            mode: 'classic',
            backgroundMode: 'sora',
            soraBlank: true
        };
        tryVerify(() => view.renderer !== null, 1500);
        tryCompare(view, 'layerCount', 1, 1500);
        tryCompare(view, 'transitionBytes', 0, 1500);
        compare(view.errorString, '');
    }
    function test_sameModeSettingsDoNotRecreateAndHiddenCancelsPendingChange() {
        const view = createTemporaryObject(background, testCase);
        tryCompare(view, "layerCount", 1);
        const original = view.renderer;
        view.settings = {
            backgroundMode: "sora",
            soraBlank: false
        };
        tryCompare(original, "blank", false);
        compare(view.renderer, original);
        for (let i = 0; i < 12; ++i) {
            view.settings = {
                backgroundMode: i % 2 ? "sora" : "latent"
            };
            wait(5);
            verify(view.layerCount <= 2);
        }
        view.live = false;
        compare(view.layerCount, 0);
        compare(view.transitionBytes, 0);
        view.live = true;
        tryCompare(view, "layerCount", 1);
        view.visible = false;
        compare(view.layerCount, 0);
    }
    function test_reducedMotionCutsAndMonetIsARealSelectableRenderer() {
        const view = createTemporaryObject(background, testCase, {
            motionEnabled: false
        });
        tryCompare(view, "layerCount", 1);
        view.settings = {
            backgroundMode: "monet"
        };
        tryVerify(() => view.renderer && "pipelineController" in view.renderer);
        compare(view.layerCount, 1);
        compare(view.transitionBytes, 0);
        compare(view.renderer.assetsService, null);
        compare(view.sourceKey, '["monet"]');
    }
    function test_monetWaitsForRealAuthorizedPipelineAndKeepsSettingsInPlace() {
        const collection = createTemporaryObject(collectionComponent, testCase);
        tryVerify(() => !collection.busy, 15000);
        collection.importFiles();
        tryVerify(() => foliaTestAssetFixture.pickerVisible(), 5000);
        verify(foliaTestAssetFixture.accept("png"));
        tryVerify(() => !collection.busy, 15000);
        compare(collection.errorString, "");
        const asset = collection.assets[collection.assets.length - 1];
        verify(asset);
        const view = createTemporaryObject(background, testCase, {
            assetsService: foliaTestPlugin.assets
        });
        tryCompare(view, "layerCount", 1);
        view.styleWaits = true;
        view.customBackgroundImages = [asset];
        view.settings = {
            backgroundMode: "monet"
        };
        tryVerify(() => view.renderer && "pipelineController" in view.renderer);
        const renderer = view.renderer;
        tryVerify(() => renderer.renderReady || renderer.errorString.length > 0, 20000);
        compare(renderer.errorString, "");
        verify(renderer.renderReady);
        verify(renderer.cacheBytes > 0);
        verify(view.sourceKey.includes(String(asset.url)));
        compare(view.transitionWaits, true);
        compare(view.actors[0].progress, 1);
        compare(view.actors[1].progress, 0);
        view.styleWaits = false;
        tryCompare(view, "layerCount", 1, 2500);
        const paints = renderer.pipelineController.paintCount;
        view.settings = {
            backgroundMode: "monet",
            monetBackgroundLayout: "half-pane-gradient"
        };
        tryCompare(renderer, "halfPane", true);
        wait(250);
        compare(view.renderer, renderer);
        compare(renderer.pipelineController.paintCount, paints);
        view.live = false;
        compare(view.layerCount, 0);
        compare(view.transitionBytes, 0);
    }
    function test_nomandIsSelectableWithAuthorizedImageAndRetiresAllSurfaces() {
        // This case checks the shared renderer route, not the separately tested
        // import transaction. Use an authored image in the actual fixture package.
        const asset = {
            url: foliaTestPreviewCovers[0],
            handle: "package-cover"
        };
        const view = createTemporaryObject(background, testCase, {
            assetsService: foliaTestPlugin.assets,
            customBackgroundImages: [asset],
            motionEnabled: false,
            settings: {
                backgroundMode: "nomand",
                nomandImageSource: "uploaded-global"
            }
        });
        tryVerify(() => view.renderer && view.renderer.objectName === "foliaNomandBackground");
        const renderer = view.renderer;
        tryVerify(() => renderer.renderReady || renderer.errorString.length > 0, 15000);
        compare(renderer.errorString, "");
        verify(renderer.renderReady);
        verify(renderer.cacheBytes > 0);
        compare(String(renderer.sourceUrl), String(asset.url));
        compare(view.sourceKey, '["nomand"]');
        for (const effect of ["dithering", "fluted-glass", "paper-texture", "halftone-dots", "lens-distortion"]) {
            view.settings = {
                backgroundMode: "nomand",
                nomandImageSource: "uploaded-global",
                nomandEffect: effect
            };
            tryVerify(() => renderer.tuning.effect === effect);
            tryCompare(renderer, "renderReady", true);
            compare(view.renderer, renderer);
            compare(renderer.errorString, "");
        }
        view.motionEnabled = true;
        tryVerify(() => view.sourceKey.includes(String(asset.url)));
        tryCompare(view, "layerCount", 1, 2500);
        view.visible = false;
        compare(view.layerCount, 0);
        compare(view.transitionBytes, 0);
    }
}
