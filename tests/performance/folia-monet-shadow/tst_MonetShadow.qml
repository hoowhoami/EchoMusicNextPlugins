import QtQuick
import QtTest
import "../../../plugins/folia-lyrics-skin/qml/styles/monet"

TestCase {
    id: testCase
    name:"FoliaMonetShadowPerformance"
    when:windowShown
    visible:true
    width:640
    height:640
    property bool measuring:false
    property real maximumGap:0
    property real previousPulse:0
    property int themeTicks:0
    property var targetFrame:null
    function init(){failOnWarning(/invalid context|TypeError:|Unable to assign|ShaderEffect.*Error/);}
    Component {id:frameComponent;MonetPortraitFrame{width:400;height:400;x:120;y:120;source:Qt.resolvedUrl("../../../plugins/folia-lyrics-skin/qml/styles/cappella/assets/emo/love1.png")}}
    Component {id:legacyComponent;LegacyMonetPortraitFrame{width:400;height:400;x:120;y:120;source:Qt.resolvedUrl("../../../plugins/folia-lyrics-skin/qml/styles/cappella/assets/emo/love1.png")}}
    Component {id:spyComponent;SignalSpy{signalName:"paint"}}
    Timer {
        interval:4
        repeat:true
        running:testCase.measuring
        onTriggered:{const now=foliaTestAssetFixture.monotonicMs();testCase.maximumGap=Math.max(testCase.maximumGap,now-testCase.previousPulse);testCase.previousPulse=now;}
    }
    Timer {
        id:themeChanges
        interval:16
        repeat:true
        onTriggered:{++testCase.themeTicks;testCase.targetFrame.primaryColor=Qt.rgba(1-.6*testCase.themeTicks/24,1-.4*testCase.themeTicks/24,1,1);if(testCase.themeTicks===24)stop();}
    }
    function test_realPortraitThemeTransition(){
        const frame=createTemporaryObject(foliaTestAssetFixture.legacyProbe()?legacyComponent:frameComponent,testCase);
        tryCompare(frame,"layerCount",1,10000);
        waitForRendering(frame);
        const shadow=findChild(frame,"monetPortraitShadow");
        const spy=shadow?createTemporaryObject(spyComponent,testCase,{target:shadow}):null;
        if(spy)verify(spy.valid);
        const before=foliaTestAssetFixture.memory();
        const paintStart=spy?spy.count:0;
        maximumGap=0;
        previousPulse=foliaTestAssetFixture.monotonicMs();
        measuring=true;
        themeTicks=0;
        targetFrame=frame;
        const started=foliaTestAssetFixture.monotonicMs();
        themeChanges.start();
        tryCompare(testCase,"themeTicks",24,30000);
        measuring=false;
        compare(frame.primaryColor,"#6699ff");
        const result={elapsedMs:foliaTestAssetFixture.monotonicMs()-started,maximumGapMs:maximumGap,cpuBitmapPaints:spy?spy.count-paintStart:0,before,after:foliaTestAssetFixture.memory()};
        if(spy)verify(result.cpuBitmapPaints>=5,"The source theme change must actually redraw the old Canvas");
        frame.live=false;
        frame.destroy();
        wait(250);
        result.retired=foliaTestAssetFixture.memory();
        console.info("FOLIA_MONET_SHADOW_PROBE "+JSON.stringify(result));
    }
}
