import QtQuick
import QtTest
import "../../../plugins/folia-lyrics-skin/qml/shared/text/prepare.mjs" as Prepare
import "../../../plugins/folia-lyrics-skin/qml/styles/classic/motion.mjs" as Motion

TestCase {
    id: testCase
    name: "FoliaClassicInterruptions"
    when: windowShown
    visible: true
    width: 1100
    height: 820

    function test_deliveredFramesCarryVelocityAcrossRepeatedSeeks() {
        failOnWarning(/.*/);
        const component = Qt.createComponent("../../../plugins/folia-lyrics-skin/qml/styles/classic/ClassicLine.qml");
        compare(component.status, Component.Ready, component.errorString());
        const prepared = Prepare.prepareLines([
            {
                fullText: "inertia",
                startTime: 0,
                endTime: 4,
                words: [
                    {
                        text: "inertia",
                        startTime: 1,
                        endTime: 2
                    }
                ],
                autoWordSegments: ["inertia"]
            }
        ], [], null).lines[0];
        const view = createTemporaryObject(component, testCase, {
            prepared,
            settings: {
                classicUseLegacyLayout: true
            },
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 40
            }),
            primaryColor: "white",
            accentColor: "red",
            viewportWidth: 1100,
            timeSeconds: .5,
            enteredAt: 0,
            presentationSeconds: 10,
            enteredPresentationAt: 10
        });
        verify(view !== null);
        tryVerify(() => view.layoutAccepted && view.wordTransitions.length === 1);
        compare(view.errorString, "");
        const maskRevision = view.glyphRenderer.maskRevision;
        view.timeSeconds = 1.2;
        view.presentationSeconds = 10.12;
        view.presentationSeconds = 10.136;
        view.timeSeconds = .5;
        view.presentationSeconds = 10.186;
        view.presentationSeconds = 10.202;
        view.timeSeconds = 1.4;
        const transition = view.wordTransitions[0];
        compare(transition.state, "active");
        verify(transition.velocity !== undefined, "The actual QML handoff must retain frame velocity");
        verify(transition.velocity.scale < -.1, "The interrupted waiting tween is still shrinking");
        const config = view.configs.wordConfigs[0];
        const sample = Motion.wordUiPose(prepared.line.words[0], config, 1.4, view.profile, 0, view.settings, true, transition, 10.21);
        const stopped = Motion.wordUiPose(prepared.line.words[0], config, 1.4, view.profile, 0, view.settings, true, Object.assign({}, transition, {
            velocity: {}
        }), 10.21);
        verify(Math.abs(sample.scale - stopped.scale) > .001, "Position continuity alone must not erase the source spring's inertia");
        const inherited = transition.velocity.scale;
        view.timeSeconds = 2.5;
        view.timeSeconds = .5;
        view.timeSeconds = 1.4;
        compare(view.wordTransitions[0].velocity.scale, inherited, "Multiple state changes before the next delivered frame retain MotionValue velocity");
        for (let index = 0; index < 32; ++index) {
            view.presentationSeconds = 10.218 + index * .016;
            view.timeSeconds = index % 2 ? 1.4 : .5;
            compare(view.wordTransitions.length, 1);
            verify(Number.isFinite(view.wordTransitions[0].velocity.scale));
        }
        compare(view.glyphRenderer.maskRevision, maskRevision);
        compare(view.errorString, "");
    }
}
