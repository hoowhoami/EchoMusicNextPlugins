// Affine source masks stay rectangular GPU clips, including rotated ancestors.
pragma ComponentBehavior: Bound
import QtQuick
import "scene-graph.mjs" as Graph
import "render-plan.mjs" as Plan

Item {
    id:root
    property var descriptor:null
    property bool live:true
    property var _clips:[]
    property var _body:null
    property string _maskKey:""
    property int _revision:-1
    readonly property real cacheBytes:0
    readonly property string errorString:""
    function matrix(value:var):matrix4x4{return Qt.matrix4x4(...Graph.qtMatrix(value));}
    function clear():void{if(_body){_body.destroy();_body=null;}for(const clip of _clips)clip.destroy();_clips=[];_maskKey="";_revision=-1;}
    function updateFrame(value:var):void{
        descriptor=value;if(!live||!value){clear();return;}
        const maskKey=JSON.stringify(value.masks.map(mask=>[mask.rect.width,mask.rect.height]));
        if(!_body||maskKey!==_maskKey){
            clear();_maskKey=maskKey;let parentItem=root;
            for(const mask of value.masks){const actor=clipComponent.createObject(parentItem);if(!actor)throw Error("Sonnet GPU clip creation failed");_clips.push(actor);parentItem=actor;}
            _body=vectorComponent.createObject(parentItem);if(!_body)throw Error("Sonnet vector actor creation failed");
        }
        visible=value.visible;opacity=value.alpha;
        let previous=Plan.identity;
        for(let index=0;index<value.masks.length;++index){
            const mask=value.masks[index],world=Graph.multiply(mask.matrix,[1,0,mask.rect.x,0,1,mask.rect.y]);
            _clips[index].width=mask.rect.width;_clips[index].height=mask.rect.height;
            _clips[index].pose=matrix(Graph.multiply(Plan.inverse(previous),world));previous=world;
        }
        _body.pose=matrix(Graph.multiply(Plan.inverse(previous),value.matrix));
        _body.tint=value.tint;
        if(_revision!==value.revision){_body.paths=value.paths;_revision=value.revision;}
    }
    onLiveChanged: {if(!live)clear();else if(descriptor)updateFrame(descriptor);}
    Component.onCompleted: if(descriptor)updateFrame(descriptor)
    Component.onDestruction: clear()
    Component {id:clipComponent;Item{property matrix4x4 pose;clip:true;transform:Matrix4x4{matrix:pose}}}
    Component {id:vectorComponent;SonnetVector{property matrix4x4 pose;live:root.live;transform:Matrix4x4{matrix:pose}}}
}
