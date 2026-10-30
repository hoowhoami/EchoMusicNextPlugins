import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/monet"

TestCase {
    id: testCase
    name: "FoliaMonetFrame"
    when: windowShown
    visible: true
    width: 800
    height: 800
    Rectangle { id: background; anchors.fill: parent; color: "white"; z: -1 }
    Component { id: decoration; MonetFrameDecoration { motionEnabled: false } }
    function init() {
        failOnWarning(/TypeError:|QML.*(assign|non-existent)|ShaderEffect.*(Error|null)/);
    }
    function test_cssShadowPairs_data() {
        return [
            {tag:"square-white",square:true,back:"white"},
            {tag:"square-dark",square:true,back:"#14283c"},
            {tag:"rect-white",square:false,back:"white"},
            {tag:"rect-dark",square:false,back:"#14283c"}
        ];
    }
    function test_cssShadowPairs(data) {
        background.color=data.back;
        const item=createTemporaryObject(decoration,testCase,{
            square:data.square,width:data.square?320:296,height:data.square?320:400,
            x:data.square?240:252,y:data.square?180:160,
            primaryColor:"#ff9966",accentColor:"#6699ff",backgroundColor:"#361528"
        });
        verify(item.rendererActive);
        waitForRendering(item);
        compare(item.errorString,"");
        let saved=false;
        verify(testCase.grabToImage(result=>{saved=result.saveToFile("build/folia-monet-frame-reference/native/"+data.tag+"-dpr"+Screen.devicePixelRatio+".png");}));
        tryVerify(()=>saved,5000);
        for(let i=0;i<120;++i){item.primaryColor=i%2?"#667799":"#998877";waitForRendering(item);}
        compare(item.textureBytes,0);
        item.live=false;
        compare(item.rendererActive,false);
    }
}
