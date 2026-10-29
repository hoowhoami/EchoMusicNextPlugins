// Complete-context native masks are immutable across source glyph animation frames.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk

Item {
    id: root
    property var descriptor: null
    property font baseFont
    property bool live: true
    property bool _ready: false
    property string _signature: ""
    property string _error: ""
    readonly property string errorString: _error || glyph.errorString
    readonly property var renderers: [glyph]
    readonly property real cacheBytes: glyph.cacheBytes
    function canonical(value: var): var {
        if (value === null || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(canonical);
        const result = ({});
        for (const key of Object.keys(value).sort()) result[key] = canonical(value[key]);
        return result;
    }
    function colour(value: var): color {
        if (typeof value === "string" && value.indexOf("rgb") === 0) {
            const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(value);
            if (!match) throw Error("Invalid source Sonnet rgba colour");
            return Qt.rgba(Number(match[1])/255,Number(match[2])/255,Number(match[3])/255,match[4]===undefined?1:Number(match[4]));
        }
        return value;
    }
    function updateFrame(value: var): void {
        descriptor = value;
        if (!_ready || !live || !value) return;
        const signature=JSON.stringify(canonical([value.family,value.runs,value.composition]));
        if (signature !== _signature) {
            families.familyStack=value.family; families.refresh();
            glyph.font=families.value;
            glyph.runs=value.runs;
            if (glyph.errorString || JSON.stringify(canonical(JSON.parse(JSON.stringify(glyph.runs)))) !== JSON.stringify(canonical(value.runs))) {
                _error=glyph.errorString || "Sonnet native layout rejected its input"; return;
            }
            glyph.composition=value.composition;
            _signature=signature;_error="";
        }
        if (_error) return;
        const poses=value.poses.map(input=>{
            const pose=Object.assign({},input);
            pose.color=colour(input.color);pose.tint=colour(input.tint);
            pose.halos=input.halos.map(halo=>Object.assign({},halo,{color:colour(halo.color)}));
            return pose;
        });
        glyph.poses=poses;
        if(glyph.errorString)_error=glyph.errorString;
    }
    function clear(): void { glyph.visible=false; glyph.poses=[]; glyph.runs=[]; _signature=""; }
    onLiveChanged: { if(!live) clear();else if(_ready){glyph.visible=true;_error="";updateFrame(descriptor);} }
    onBaseFontChanged: { _signature=""; if(_ready)updateFrame(descriptor); }
    Component.onCompleted: { _ready=true;updateFrame(descriptor); }
    Component.onDestruction: clear()
    SonnetFont {id:families;base:root.baseFont}
    GlyphRun {id:glyph;anchors.fill:parent;visible:root.live}
}
