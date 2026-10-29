pragma ComponentBehavior: Bound
import QtQuick

Item{
    id:root
    property var items:[]
    property string epoch:""
    property font baseFont
    property bool live:true
    property var _actors:[]
    property string _epoch:""
    property string _error:""
    property bool _assigning:false
    readonly property string errorString: _error || _actors.map(actor=>actor.errorString).filter(Boolean).join("; ")
    readonly property var renderers: {let values=[];for(const actor of _actors)if("renderers" in actor)values=values.concat(actor.renderers);return values;}
    readonly property real cacheBytes: _actors.reduce((sum,actor)=>sum+actor.cacheBytes,0)
    readonly property int actorCount:_actors.length
    function clear():void{const old=_actors;_actors=[];for(const actor of old){actor.live=false;actor.destroy();}}
    function retire():void{_assigning=true;items=[];_assigning=false;clear();}
    function setFrame(key:string,values:var):void{_assigning=true;epoch=key;items=values;_assigning=false;sync();}
    function sync():void{
        if(_assigning)return;
        if(!live||!visible){clear();return;}
        try{
            if(epoch!==_epoch){clear();_epoch=epoch;_error="";}
            if(items.length!==_actors.length){clear();const actors=[];for(const item of items){const component=item.kind==="glyph"?glyphComponent:vectorComponent;const actor=component.createObject(root,{descriptor:item});if(!actor)throw Error("Sonnet source actor creation failed");actors.push(actor);_actors=actors.slice();}}
            for(let index=0;index<items.length;++index){_actors[index].z=index;_actors[index].updateFrame(items[index]);}
            if(cacheBytes>128*1024*1024)throw Error("Sonnet native glyph caches exceed 128 MiB");
        }catch(error){clear();_error=String(error.message||error);}
    }
    onItemsChanged:sync()
    onEpochChanged:sync()
    onLiveChanged:sync()
    onVisibleChanged:sync()
    Component.onDestruction:clear()
    Component{id:glyphComponent;SonnetGlyphBatch{width:root.width;height:root.height;baseFont:root.baseFont;live:root.live}}
    Component{id:vectorComponent;SonnetVectorActor{width:root.width;height:root.height;live:root.live}}
}
