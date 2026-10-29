import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/monet" as Monet

TestCase {
    id: testCase
    name: "FoliaMonetHandoff"
    when: windowShown
    visible: true
    width: 360
    height: 280
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Unable to assign|Binding loop|ShaderEffect.*(Error|null)|is not a function/);
    }
    Component {
        id: handoffComponent
        QtObject {
            property real progress: 0
        }
    }
    Component {
        id: portraitComponent
        Monet.MonetPortrait {
            width: 240
            height: 240
            assetsService: foliaTestPlugin.assets
            motionEnabled: false
        }
    }
    function test_authorizedNativePixelsFollowCueAndCancellationRestoresTheDecodedBase() {
        const a = String(foliaTestPreviewCovers[0]), b = String(foliaTestPreviewCovers[1]);
        const portrait = createTemporaryObject(portraitComponent, testCase, {
            source: a
        });
        tryVerify(() => portrait.layerCount === 1 && portrait.actors[0].status === Image.Ready, 10000);
        compare(portrait.errorString, "");
        compare(portrait.actors[0].opacity, 1);
        const base = grabImage(portrait);
        const handoff = createTemporaryObject(handoffComponent, testCase);
        portrait.motionEnabled = true;
        portrait.songHandoff = handoff;
        portrait.source = b;
        tryVerify(() => portrait.layerCount === 2 && portrait.actors[1].status === Image.Ready, 10000);
        compare(portrait.actors[1].opacity, 0);
        handoff.progress = .25;
        wait(30);
        compare(portrait.actors[0].opacity, 1);
        compare(portrait.actors[1].opacity, .25);
        const mixed = grabImage(portrait);
        handoff.progress = 1;
        wait(30);
        const full = grabImage(portrait);
        let samples = 0, changed = 0;
        for (let y = 10; y < base.height - 10; y += 17)
            for (let x = 10; x < base.width - 10; x += 19) {
                let difference = 0;
                for (const channel of ["red", "green", "blue"]) {
                    const expected = .75 * base[channel](x, y) + .25 * full[channel](x, y);
                    verify(Math.abs(mixed[channel](x, y) - expected) <= 4, "Native source-over must follow the cue: " + channel + "/" + x + "/" + y);
                    difference += Math.abs(full[channel](x, y) - base[channel](x, y));
                }
                if (difference > 25)
                    ++changed;
                ++samples;
            }
        verify(changed > samples * .4, "Two actual authorized authored covers must differ throughout the image");
        handoff.progress = .45;
        wait(20);
        portrait.source = a;
        portrait.songHandoff = null;
        tryCompare(portrait, "layerCount", 1, 1800);
        compare(portrait.actors[0].imageSource, a);
        compare(portrait.actors[0].opacity, 1);
        const restored = grabImage(portrait);
        let mismatch = 0;
        for (let y = 10; y < base.height - 10; y += 17)
            for (let x = 10; x < base.width - 10; x += 19)
                if (Math.abs(restored.red(x, y) - base.red(x, y)) + Math.abs(restored.green(x, y) - base.green(x, y)) + Math.abs(restored.blue(x, y) - base.blue(x, y)) > 3)
                    ++mismatch;
        compare(mismatch, 0);
        portrait.live = false;
        compare(portrait.layerCount, 0);
        wait(100);
        compare(portrait.layerCount, 0);
    }
    function test_lateDecodeAndReplacementKeepTheOriginalCueOrigin() {
        const a = String(foliaTestPreviewCovers[0]), b = String(foliaTestPreviewCovers[1]);
        const portrait = createTemporaryObject(portraitComponent, testCase, {
            source: a
        });
        tryVerify(() => portrait.layerCount === 1 && portrait.actors[0].status === Image.Ready, 10000);
        const handoff = createTemporaryObject(handoffComponent, testCase, {
            progress: .6
        });
        portrait.motionEnabled = true;
        portrait.songHandoff = handoff;
        portrait.source = b;
        tryVerify(() => portrait.layerCount === 2 && portrait.actors[1].status === Image.Ready, 10000);
        compare(portrait.actors[1].handoffFrom, .6);
        compare(portrait.actors[1].opacity, 0);
        handoff.progress = .8;
        wait(30);
        verify(Math.abs(portrait.actors[1].opacity - .5) < 1e-12);
        const previous = portrait.actors[1].key;
        portrait.source = a;
        wait(100);
        if (portrait.actors[1].key === previous) {
            const decoder = findChild(portrait, "monetPortraitDecoder");
            console.log("Cached decode did not publish", portrait._requested, portrait._decodedRequest, decoder ? decoder.status : -1, decoder && decoder.animationLease ? decoder.animationLease.ready : false);
        }
        tryVerify(() => portrait.layerCount === 2 && portrait.actors[1].key !== previous && portrait.actors[1].status === Image.Ready, 10000);
        compare(portrait.actors[1].handoffFrom, .6);
        verify(Math.abs(portrait.actors[1].opacity - .5) < 1e-12);
        portrait.songHandoff = null;
        tryCompare(portrait, "layerCount", 1, 1800);
        compare(portrait.actors[0].imageSource, a);
        compare(portrait.actors[0].opacity, 1);
        portrait.live = false;
        compare(portrait.layerCount, 0);
    }
}
