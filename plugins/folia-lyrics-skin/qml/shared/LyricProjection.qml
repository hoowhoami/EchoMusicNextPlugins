// Read-only, per-presentation filtering. Host lyric rows and playback remain untouched.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "lyricFilter.mjs" as Filter

QtObject {
    id: root
    property EchoPluginReadModel source: null
    property int count: 0
    property bool enabled: false
    property string pattern: ""
    property string title: ""
    property string artist: ""
    readonly property var matcher: Filter.compile(pattern, enabled)
    property var _cache: ({
            first: -1
        })
    signal modelReset
    signal dataChanged
    signal rowsInserted
    signal rowsRemoved
    function invalidate(): void {
        _cache = {
            first: -1
        };
        modelReset();
    }
    function row(index: int): var {
        if (!source)
            return null;
        const value = source.row(index);
        if (!matcher || value.filtered)
            return value;
        if (_cache.first < 0) {
            _cache.first = 0;
            while (_cache.first < count && source.row(_cache.first).filtered)
                ++_cache.first;
        }
        return Filter.project(value, index, _cache.first, matcher, title, artist);
    }
    onMatcherChanged: invalidate()
    onSourceChanged: invalidate()
    onCountChanged: invalidate()
    onTitleChanged: invalidate()
    onArtistChanged: invalidate()
    property Connections sourceSignals: Connections {
        target: root.source
        function onModelReset(): void {
            root.invalidate();
        }
        function onDataChanged(): void {
            root._cache = {
                first: -1
            };
            root.dataChanged();
        }
        function onRowsInserted(): void {
            root._cache = {
                first: -1
            };
            root.rowsInserted();
        }
        function onRowsRemoved(): void {
            root._cache = {
                first: -1
            };
            root.rowsRemoved();
        }
    }
}
