import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/fume" as Fume
import "../../plugins/folia-lyrics-skin/qml/styles/fume/vector.mjs" as Vector
import "../../plugins/folia-lyrics-skin/qml/styles/fume/background.mjs" as Background

TestCase {
    id: testCase
    name: "FoliaFumeDecor"
    when: windowShown
    visible: true
    width: 800
    height: 400
    function init() {
        failOnWarning(/(TypeError|ReferenceError|Unable to assign|Invalid property|Unsupported Fume)/);
    }
    Component {
        id: sceneComponent
        Rectangle {
            id: view
            width: 800
            height: 400
            color: "#101820"
            property real time: 0
            property bool active: true
            property var scene: Background.buildFumeBackgroundScene({
                viewport: {
                    width: 800,
                    height: 400
                },
                world: {
                    width: 800,
                    height: 400
                },
                seed: "vector-proof"
            })
            property var recorder: Vector.createRecorder()
            property var commands: active ? Vector.recordBackground(recorder, {
                scene,
                theme: {
                    accentColor: "#ff8855",
                    secondaryColor: "#77aaff"
                },
                time,
                audioLevels: {
                    bass: 127,
                    lowMid: 127,
                    mid: 127,
                    vocal: 127,
                    treble: 127
                },
                objectOpacityMultiplier: 2
            }, {
                x: -80,
                y: -40,
                scale: 1
            }) : []
            property alias decor: decor
            Fume.FumeDecor {
                id: decor
                anchors.fill: parent
                commands: view.commands
                stamps: view.active ? [
                    {
                        x: 400,
                        y: 200,
                        width: 42,
                        height: 8,
                        fill: "rgba(255, 80, 40, 0.8)",
                        shadow: "rgba(80, 160, 255, 0.4)",
                        blur: 20,
                        alpha: .6
                    }
                ] : []
                cameraX: 400
                cameraY: 200
                devicePixelRatio: view.Window.window ? view.Window.window.devicePixelRatio : 1
            }
        }
    }
    function test_nativeVectorsAndLocalShadows() {
        const view = createTemporaryObject(sceneComponent, testCase);
        verify(view);
        compare(view.decor.vectorCount, 28);
        compare(view.decor.stampCount, 1);
        wait(150);
        verify(view.decor.textureBytes > 0);
        compare(view.decor.errorString, "");
        verify(view.decor.textureBytes <= view.decor.cacheBudgetBytes);
        compare(view.decor.textureBytes, view.decor.plannedTextureBytes);
        const image = grabImage(view);
        const retained = findChild(view, "fumeDecorVector0");
        verify(retained);
        let colored = 0;
        for (let y = 0; y < 400; y += 2)
            for (let x = 0; x < 800; x += 2)
                if (Math.abs(image.red(x, y) - 16) > 3 || Math.abs(image.green(x, y) - 24) > 3 || Math.abs(image.blue(x, y) - 32) > 3)
                    ++colored;
        verify(colored > 100, "Native vector foreground missing: " + colored);
        for (const time of [0, 1, 3]) {
            view.time = time;
            wait(100);
            compare(findChild(view, "fumeDecorVector0"), retained);
            grabImage(view).save(foliaTestCaptureDir + "/fume-decor-t" + time + ".png");
        }
        view.active = false;
        compare(view.decor.vectorCount, 0);
        compare(view.decor.stampCount, 0);
        compare(view.decor.textureBytes, 0);
    }
    function test_rejectsOversizedShadowBeforeAllocation() {
        const view = createTemporaryObject(sceneComponent, testCase);
        verify(view);
        const enormous = Object.assign({}, view.commands.find(c => c.blur > 0), {
            radius: 10000
        });
        view.commands = [enormous];
        verify(view.decor.errorString.length > 0);
        compare(view.decor.vectorCount, 0);
        compare(view.decor.textureBytes, 0);
    }
}
