import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared"

TestCase {
    id: testCase
    name: "FoliaBackdrop"
    when: windowShown
    visible: true
    width: 640
    height: 480
    Item {
        id: background
        anchors.fill: parent
        Rectangle { anchors.fill: parent; color: "#0044ff" }
        Rectangle { width: 320; height: 480; color: "#ff3000" }
    }
    Rectangle { id: foreground; x: 260; y: 180; width: 80; height: 100; color: "#00ff00"; opacity: .6 }
    Component { id: blurComponent; BackdropBlur { x: 200; y: 140; width: 240; height: 160; corner: 24; sources: [background, foreground]; baseColor: "white" } }
    function init() { failOnWarning(/TypeError:|ReferenceError:|Unable to assign|ShaderEffect.*(Error|null)|is not a function/); }
    function test_actualPrefixIncludesEarlierForegroundAndReleases() {
        const blur=createTemporaryObject(blurComponent,testCase);
        waitForRendering(blur);wait(50);
        compare(blur.errorString,"");
        verify(blur.plannedBytes>0&&blur.plannedBytes<64*1024*1024);
        const image=grabImage(blur),scale=image.width/blur.width;
        verify(image.green(100*scale,80*scale)>100,"Backdrop must include the real earlier green foreground");
        verify(image.red(20*scale,80*scale)>200);
        verify(image.blue(220*scale,80*scale)>200);
        blur.x=120;
        wait(50);waitForRendering(blur);
        compare(blur.errorString,"");
        const moved=grabImage(blur),s=moved.width/blur.width;
        verify(moved.red(100*s,80*s)>200,"Dragging the target must move its real capture region");
        blur.live=false;compare(blur.plannedBytes,0);compare(blur.rendererActive,false);
    }
    function test_sourceCssPairs_data() {
        return [{tag:"sigma8",sigma:8,rotation:0,scale:1},{tag:"sigma12",sigma:12,rotation:0,scale:1},{tag:"transformed",sigma:8,rotation:1,scale:.95}];
    }
    function test_sourceCssPairs(data) {
        const blur=createTemporaryObject(blurComponent,testCase,{sigma:data.sigma,rotation:data.rotation,scale:data.scale});
        waitForRendering(blur);wait(80);compare(blur.errorString,"");
        let saved=false;
        verify(testCase.grabToImage(result=>{saved=result.saveToFile("build/folia-backdrop-reference/native/"+data.tag+"-dpr"+Screen.devicePixelRatio+".png");}));
        tryVerify(()=>saved,5000);
    }
}
