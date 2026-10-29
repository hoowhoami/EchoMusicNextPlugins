import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/backgrounds/monet/api.mjs" as Monet

TestCase {
    id: testCase
    name: "FoliaMonetBackground"
    when: windowShown
    visible: true
    width: 640
    height: 480
    function test_originalTrackAndPhaseLoadInQv4() {
        compare(typeof Monet.prepareMonetDrift, "function");
        const track = Monet.prepareMonetDrift(.5);
        compare(track.durationMs, 240000);
        compare(track.frames.length, 157);
        compare(JSON.stringify(track.frames[0]), JSON.stringify(track.frames[156]));
        const midway = Monet.sampleMonetDrift(track, 37.25);
        compare(midway.xPercent, track.frames[37].xPercent * .75 + track.frames[38].xPercent * .25);
        compare(midway.yPercent, track.frames[37].yPercent * .75 + track.frames[38].yPercent * .25);
        compare(midway.scale, track.frames[37].scale * .75 + track.frames[38].scale * .25);
    }
    function test_nativeTransformAndMotionHiddenLifecycle() {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/backgrounds/monet/MonetDrift.qml");
        compare(component.status, Component.Ready, component.errorString());
        const drift = createTemporaryObject(component, testCase, {
            width: 320,
            height: 180
        });
        verify(drift !== null);
        tryVerify(() => drift.animationRunning && drift.phase > 0, 1000);
        compare(drift.keyframeCount, 157);
        drift.phase = 37.25;
        const pose = Monet.sampleMonetDrift(Monet.prepareMonetDrift(.5), 37.25);
        const point = drift.contentItem.mapToItem(drift, 8, 12);
        verify(Math.abs(point.x - (8 * pose.scale + 320 * pose.xPercent / 100 + (1 - pose.scale) * 160)) < .00001);
        verify(Math.abs(point.y - (12 * pose.scale + 180 * pose.yPercent / 100 + (1 - pose.scale) * 90)) < .00001);
        for (const key of ["staticMode", "motionEnabled", "visible", "live", "driftEnabled"]) {
            drift[key] = key === "staticMode";
            compare(drift.animationRunning, false);
            compare(drift.keyframeCount, 0);
            compare(drift.pose.scale, 1);
            drift[key] = key !== "staticMode";
            tryVerify(() => drift.animationRunning && drift.phase > 0, 1000, key + " resumes original phase");
        }
        drift.strength = 1;
        compare(drift.keyframeCount, 157);
        verify(drift.phase <= 1);
        drift.strength = 0;
        compare(drift.animationRunning, false);
        compare(drift.pose.scale, 1);
    }
    Component {
        id: timeoutComponent
        Timer {
            property var callback
            interval: 180
            onTriggered: {
                callback();
            }
        }
    }
    function test_layerDebouncePromisesAndHolderReleaseInQv4() {
        let calls = 0, holders = 0, drawn = 0;
        const pipeline = {
            wantMonetBackgroundUrl(options) {
                calls++;
                holders++;
                let released = false;
                return {
                    url: Promise.resolve("picture:" + options.coverUrl + ":" + options.tuning.backgroundWash),
                    release() {
                        if (!released) {
                            released = true;
                            holders--;
                        }
                    }
                };
            }
        };
        const state = Monet.createMonetLayerState({
            pipeline,
            setTimeout(callback, delay) {
                const timer = timeoutComponent.createObject(testCase, {
                    callback,
                    interval: delay
                });
                timer.start();
                return timer;
            },
            clearTimeout(timer) {
                if (timer) {
                    timer.stop();
                    timer.destroy();
                }
            },
            pictureDrawn() {
                drawn++;
            }
        });
        const input = {
            coverUrl: "A",
            theme: {
                backgroundColor: "#123456",
                primaryColor: "#fff",
                accentColor: "#f80"
            },
            tuning: Monet.DEFAULT_MONET_BACKGROUND_TUNING
        };
        try {
            state.update(input);
            compare(calls, 1);
            compare(state.snapshot.isPipelinePending, true);
            wait(80);
            compare(calls, 1);
            compare(state.snapshot.pipelineUrl, null);
            tryVerify(() => state.snapshot.pipelineUrl === "picture:A:0.34", 1000);
            compare(calls, 2);
            compare(drawn, 1);
            compare(holders, 2);
            input.tuning = Object.assign({}, input.tuning, {
                backgroundWash: .6
            });
            state.update(input);
            wait(80);
            compare(calls, 2);
            input.tuning = Object.assign({}, input.tuning, {
                backgroundWash: .7
            });
            state.update(input);
            tryVerify(() => state.snapshot.pipelineUrl === "picture:A:0.7", 1000);
            compare(calls, 3);
            compare(state.snapshot.firstPicture, "picture:A:0.34");
            state.update(Object.assign({}, input, {
                transparentBackground: true
            }));
            compare(state.snapshot.pipelineUrl, null);
            compare(holders, 0);
        } finally {
            state.dispose();
        }
        compare(holders, 0);
    }
}
