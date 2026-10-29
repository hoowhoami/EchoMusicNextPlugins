import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs" as Graph

TestCase {
    id: testCase
    name: "FoliaSceneGraph"
    when: windowShown
    visible: true
    width: 160
    height: 120
    Rectangle {
        anchors.fill: parent
        color: "#0000ff"
        z: -10
    }
    function vector(paths) {
        const c = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/sonnet/SonnetVector.qml");
        compare(c.status, Component.Ready, c.errorString());
        return createTemporaryObject(c, testCase, {
            width: 160,
            height: 120,
            paths
        });
    }
    function test_actualCutoutsStayTransparentAndOverlappingPrimitivesKeepPremultipliedAlpha() {
        const p = Graph.createSceneGraph(), n = new p.Graphics();
        n.rect(0, 0, 160, 120).fill({
            color: 0xff0000
        }).rect(60, 40, 40, 40).cut();
        const v = vector(n.paths);
        waitForRendering(v);
        const i = grabImage(v);
        compare(i.red(20 * i.width / 160, 20 * i.height / 120), 255);
        compare(i.blue(i.width / 2, i.height / 2), 255);
        compare(i.red(i.width / 2, i.height / 2), 0);
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
        v.destroy();
        const overlap = new p.Graphics();
        overlap.circle(55, 60, 30).circle(85, 60, 30).fill({
            color: 0xffffff,
            alpha: .5
        });
        const w = vector(overlap.paths);
        waitForRendering(w);
        const pixels = grabImage(w);
        verify(Math.abs(pixels.red(32 * pixels.width / 160, pixels.height / 2) - 128) < 3);
        verify(Math.abs(pixels.red(70 * pixels.width / 160, pixels.height / 2) - 191) < 3, "Source overlap alpha accumulates: " + pixels.red(70 * pixels.width / 160, pixels.height / 2));
    }
    function test_tintMultipliesSourceRgbAndKeepsGeometryAndPaintAlpha() {
        const p = Graph.createSceneGraph(), n = new p.Graphics();
        n.rect(0, 0, 160, 120).fill({
            color: 0x80ff40
        });
        const v = vector(n.paths), original = v.paths;
        v.tint = Qt.rgba(0.5, 0.25, 1, 0);
        waitForRendering(v);
        let i = grabImage(v);
        verify(Math.abs(i.red(i.width / 2, i.height / 2) - 64) < 2);
        verify(Math.abs(i.green(i.width / 2, i.height / 2) - 64) < 2);
        compare(i.blue(i.width / 2, i.height / 2), 64);
        compare(v.paths, original);
        v.tint = "#ffffff";
        waitForRendering(v);
        i = grabImage(v);
        compare(i.red(i.width / 2, i.height / 2), 128);
        compare(i.green(i.width / 2, i.height / 2), 255);
        compare(v.paths, original);
    }
    Component {
        id: matrixFixture
        Item {
            id: matrixRoot
            property var affine
            property var paths
            transform: Matrix4x4 {
                matrix: Qt.matrix4x4(...Graph.qtMatrix(matrixRoot.affine))
            }
            Loader {
                active: true
                source: "../../plugins/folia-lyrics-skin/qml/styles/sonnet/SonnetVector.qml"
                onLoaded: item.paths = matrixRoot.paths
            }
        }
    }
    function test_nativeAffineMatrixMatchesSourcePivotScaleAndRotation() {
        const p = Graph.createSceneGraph(), n = new p.Graphics();
        n.rect(0, 0, 40, 20).fill(0xffff00);
        n.position.set(100, 20);
        n.pivot.set(10, 5);
        n.scale.set(1.5, 1);
        n.rotation = Math.PI / 2;
        const v = createTemporaryObject(matrixFixture, testCase, {
            affine: Graph.localMatrix(n),
            paths: n.paths
        });
        waitForRendering(v);
        const pixels = grabImage(testCase);
        const sx = pixels.width / 160, sy = pixels.height / 120;
        verify(pixels.red(95 * sx, 35 * sy) > 250);
        verify(pixels.green(95 * sx, 35 * sy) > 250);
        compare(pixels.blue(20 * sx, 20 * sy), 255);
    }
    function test_gradientUsesEachShapeOwnLocalBoundingBoxAndReleases() {
        const p = Graph.createSceneGraph(), n = new p.Graphics();
        n.rect(20, 20, 120, 80).fill({
            fill: new p.FillGradient({
                start: {
                    x: 0,
                    y: 0
                },
                end: {
                    x: 1,
                    y: 0
                },
                colorStops: [
                    {
                        offset: 0,
                        color: '#ff0000'
                    },
                    {
                        offset: 1,
                        color: '#00ff00'
                    }
                ],
                textureSpace: 'local'
            })
        });
        const v = vector(n.paths);
        waitForRendering(v);
        const i = grabImage(v);
        verify(i.red(25 * i.width / 160, i.height / 2) > 220);
        verify(i.green(135 * i.width / 160, i.height / 2) > 220);
        v.live = false;
        compare(v.pathCount, 0);
        compare(v.geometryBytes, 0);
    }
    function test_animatedPathsAndTintRetainNativeObjects() {
        const p=Graph.createSceneGraph(),n=new p.Graphics();
        const gradient=new p.FillGradient({start:{x:0,y:0},end:{x:1,y:0},colorStops:[{offset:0,color:'#ff0000'},{offset:1,color:'#00ff00'}],textureSpace:'local'});
        n.rect(20,20,120,80).fill({fill:gradient});
        const v=vector(n.paths);
        waitForRendering(v);
        const shape=Array.from(v.children).find(child=>"preferredRendererType" in child);
        verify(shape,"The actual vector must contain a native Shape");
        verify(shape.gradient,"The authored vector must have a real native gradient");
        const stop=shape.gradient.stops[0];
        verify(stop,"The gradient must contain native stops");
        for(let frame=0;frame<120;++frame){
            n.clear().rect(20+(frame%2),20,120-(frame%2),80).fill({fill:gradient});
            v.paths=n.paths;
            v.tint=frame%2?'#99aabb':'#ffffff';
            waitForRendering(v);
            compare(Array.from(v.children).find(child=>"preferredRendererType" in child),shape,"Animated geometry must update the retained Shape");
            compare(shape.gradient.stops[0],stop,"Tint/geometry changes must update retained gradient stops");
        }
        v.live=false;compare(v.pathCount,0);tryVerify(()=>!Array.from(v.children).some(child=>"preferredRendererType" in child),1000);
    }
}
