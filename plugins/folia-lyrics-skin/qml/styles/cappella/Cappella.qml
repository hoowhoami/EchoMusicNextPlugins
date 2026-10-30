// Folia a8da4437 Cappella: real lyric messages, deterministic roles, bounded preheated UI.
pragma ComponentBehavior: Bound
import QtQuick
import QtQml.WorkerScript
import EchoMusic.PluginSdk
import "kernel.mjs" as Chat
import "assets.mjs" as Assets

Item {
    id: root
    required property var preparedLines
    property var lineMetadata: []
    property var metadataBySourceIndex: ({})
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont: Qt.font({
        pixelSize: 18
    })
    property var settings: ({})
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: "#8b5cf6"
    property color backgroundColor: "#141018"
    property string songTitle: ""
    property string coverUrl: ""
    property var avatarSeed: songTitle
    property var customAvatarImages: []
    property var customEmojiImages: []
    property EchoPluginAssets assetsService: null
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property bool exiting: false
    property string animationIntensity: settings.animationIntensity || "normal"
    signal exitFinished
    readonly property var tuning: Chat.settings(settings)
    readonly property var profile: Chat.intensity(animationIntensity)
    readonly property var geometry: Chat.panel(width)
    readonly property string titleText: songTitle.trim() || qsTr("暂无歌曲")
    readonly property var avatars: Assets.avatars.map(name => ({
                id: "builtin-avatar-" + name,
                name,
                url: String(Qt.resolvedUrl("assets/avatar/" + name + ".png"))
            }))
    readonly property var emojis: Assets.emojis.map(name => ({
                id: "builtin-" + name,
                name,
                url: String(Qt.resolvedUrl("assets/emo/" + name + ".png"))
            }))
    readonly property var avatarPack: Assets.customImages(customAvatarImages)
    readonly property var emojiPack: Assets.customImages(customEmojiImages)
    readonly property var activeEmojis: tuning.emojiPackSource === "custom" && emojiPack.length ? emojiPack : emojis
    readonly property bool showEmojiMessages: tuning.showEmoMessages
    readonly property string requiredSourceIndicesKey: _requiredIndicesKey
    readonly property int mountedRowCount: _rows.length
    readonly property int visibleRowCount: _rows.filter(row => row.shown).length
    readonly property int prefixCacheCount: _prefixCache.length
    readonly property int prefixPositionCount: _prefixCache.reduce((sum, entry) => sum + entry.positionCount, 0)
    readonly property string errorString: _workerError || _rows.map(row => row.errorString).filter(error => error).join("; ")
    property real uiSeconds: 0
    property int fontRevision: 0
    property var messages: []
    property var _eligibility: null
    property var _plainMetadata: []
    property var _lyricOffsets: ({})
    property var _rows: []
    property var _prefixCache: []
    property var _prefixQueue: []
    property var _failedKeys: ({})
    property var _worker: null
    property var _pending: null
    property string _workerError: ""
    property string _requiredIndicesKey: ""
    property int _generation: 0
    property bool _completed: false
    property bool _initialSelection: true
    clip: true

    function avatarGridIndex(message: var): int {
        const grid = tuning.avatarSource === "cover" && Boolean(coverUrl) || !avatarUrl(message);
        return grid ? (message.side === "right" ? 8 : [0, 3, 6, 1, 4][message.avatarIndex % 5]) : message.avatarIndex;
    }
    function avatarUrl(message: var): string {
        if (tuning.avatarSource === "color")
            return "";
        if (tuning.avatarSource === "cover" && coverUrl)
            return coverUrl;
        const pool = tuning.avatarSource === "custom" && avatarPack.length ? avatarPack : avatars;
        const image = Chat.pickAvatar(pool, message.avatarIndex, message.side, avatarSeed);
        return image ? image.url : "";
    }
    function rowFor(id: string): var {
        return _rows.find(row => row.message.id === id) || null;
    }
    function scheduleSelection(): void {
        if (_completed)
            selection.restart();
    }
    function clearRows(): void {
        const previous = _rows;
        _rows = [];
        for (const row of previous)
            row.destroy();
        _requiredIndicesKey = "";
    }
    function retire(): void {
        ++_generation;
        selection.stop();
        prefixBuilder.cancel();
        _prefixQueue = [];
        _prefixCache = [];
        _failedKeys = ({});
        _pending = null;
        _workerError = "";
        messages = [];
        _eligibility = null;
        _plainMetadata = [];
        _lyricOffsets = ({});
        clearRows();
        if (_worker) {
            _worker.destroy();
            _worker = null;
        }
        _initialSelection = true;
    }
    function rebuildConversation(): void {
        if (!_completed)
            return;
        if (!live || !visible) {
            retire();
            return;
        }
        ++_generation;
        _workerError = "";
        clearRows();
        messages = [];
        _eligibility = null;
        _initialSelection = true;
        if (!_worker)
            _worker = workerComponent.createObject(root);
        _plainMetadata = JSON.parse(JSON.stringify(Array.from(lineMetadata || [])));
        _pending = {
            generation: _generation,
            metadata: _plainMetadata,
            title: titleText,
            intensity: animationIntensity,
            settings: {
                showEmoMessages: tuning.showEmoMessages
            },
            emojis: activeEmojis
        };
        sendConversation();
    }
    function sendConversation(): void {
        if (_worker && _worker.ready && _pending && live && visible) {
            _worker.sendMessage(_pending);
            _pending = null;
        }
    }
    function acceptConversation(reply: var): void {
        if (!live || !visible || reply.generation !== _generation)
            return;
        _workerError = reply.error || "";
        if (reply.error)
            return;
        messages = reply.messages;
        _eligibility = reply.index;
        _lyricOffsets = reply.lyricOffsets;
        scheduleSelection();
    }
    function cachedPrefix(key: string): var {
        const index = _prefixCache.findIndex(entry => entry.key === key);
        if (index < 0)
            return null;
        const entry = _prefixCache[index];
        if (index !== _prefixCache.length - 1) {
            const order = _prefixCache.slice();
            order.splice(index, 1);
            order.push(entry);
            _prefixCache = order;
        }
        return entry;
    }
    function requestPrefix(job: var): void {
        if (_failedKeys[job.key]) {
            for (const row of _rows)
                if (row.cacheKey === job.key)
                    row.renderError = _failedKeys[job.key];
            return;
        }
        if (cachedPrefix(job.key) || (prefixBuilder.job && prefixBuilder.job.key === job.key) || _prefixQueue.some(item => item.key === job.key))
            return;
        const count = job.clusters.length * (job.clusters.length + 1) / 2;
        if (count > 65536) {
            prefixFailed(job, "Cappella prefix layout exceeds 65536 cached positions");
            return;
        }
        job.positionCount = count;
        _prefixQueue = _prefixQueue.filter(item => _rows.some(row => row.cacheKey === item.key && row.active)).concat([job]);
        nextPrefix();
    }
    function nextPrefix(): void {
        if (prefixBuilder.job || !_prefixQueue.length || !live || !visible)
            return;
        const next = _prefixQueue[0];
        _prefixQueue = _prefixQueue.slice(1);
        if (_rows.some(row => row.cacheKey === next.key && row.active))
            prefixBuilder.prepare(next);
        else
            schedulePrefix();
    }
    function prefixFailed(job: var, message: string): void {
        const keys = Object.keys(_failedKeys);
        if (keys.length >= 32)
            delete _failedKeys[keys[0]];
        _failedKeys[job.key] = message;
        for (const row of _rows)
            if (row.cacheKey === job.key)
                row.renderError = message;
        schedulePrefix();
    }
    function prefixComplete(job: var, prefixes: var): void {
        const entry = {
            key: job.key,
            prefixes,
            plan: job.plan,
            positionCount: job.positionCount
        };
        let entries = _prefixCache.filter(item => item.key !== job.key);
        while (entries.length >= 32 || entries.reduce((sum, item) => sum + item.positionCount, 0) + entry.positionCount > 65536)
            entries.shift();
        entries.push(entry);
        _prefixCache = entries;
        for (const row of _rows)
            if (row.cacheKey === job.key) {
                row.prefix = entry;
                row.publish();
            }
        scheduleSelection();
        nextPrefix();
    }
    function resetFont(): void {
        ++fontRevision;
        prefixBuilder.cancel();
        _prefixQueue = [];
        _prefixCache = [];
        _failedKeys = ({});
        for (const row of _rows) {
            row.prefix = null;
            row.revealStates = [];
            row.scheduleReconcile();
        }
    }
    function syncSelection(): void {
        if (!live || !visible) {
            retire();
            return;
        }
        if (!_eligibility)
            return;
        const candidates = tuning.showText && !exiting ? Chat.visibleCandidates(messages, _eligibility, timeSeconds, 20) : [];
        const upcoming = exiting || !tuning.showText ? -1 : Chat.preheatIndex(_plainMetadata, timeSeconds);
        const preheat = upcoming >= 0 && _lyricOffsets[upcoming] !== undefined ? messages[_lyricOffsets[upcoming]] : null;
        const needed = candidates.slice();
        if (preheat && !needed.some(message => message.id === preheat.id))
            needed.push(preheat);
        const indices = needed.filter(message => message.kind !== "title").map(message => message.lineIndex);
        _requiredIndicesKey = Array.from(new Set(indices)).join(",");
        for (const row of _rows)
            if (!needed.some(message => message.id === row.message.id) && row.shown)
                row.setShown(false, false);
        let rows = _rows.filter(row => needed.some(message => message.id === row.message.id) || row.leaving);
        for (const row of _rows)
            if (rows.indexOf(row) < 0)
                row.destroy();
        for (const message of needed) {
            let row = rows.find(item => item.message.id === message.id);
            if (!row) {
                // At most 20 candidates plus one preheat/exit. Rapid seeks retire older exits.
                while (rows.length >= 21) {
                    const index = rows.findIndex(item => item.leaving);
                    rows.splice(index >= 0 ? index : 0, 1)[0].destroy();
                }
                row = rowComponent.createObject(root, {
                    controller: root,
                    message
                });
                if (row)
                    rows.push(row);
            }
            if (row)
                row.preheating = Boolean(preheat) && message.id === preheat.id && !candidates.some(item => item.id === message.id);
        }
        _rows = rows;
        if (prefixBuilder.job && !rows.some(row => row.cacheKey === prefixBuilder.job.key && row.active))
            prefixBuilder.cancel();
        nextPrefix();
        const readyCandidates = candidates.filter(message => {
            const row = rowFor(message.id);
            return row && row.ready;
        });
        const selected = Chat.fitMessages(readyCandidates, height, message => rowFor(message.id).estimatedHeight);
        let top = geometry.top;
        for (const message of selected) {
            const row = rowFor(message.id);
            row.targetY = top;
            top += row.height + 12;
        }
        for (const row of rows) {
            row.setShown(selected.some(message => message.id === row.message.id), _initialSelection);
            row.advance(0);
        }
        if (selected.length)
            _initialSelection = false;
    }
    function advance(seconds: real): void {
        if (!live || !visible)
            return;
        if (motionEnabled)
            uiSeconds += Math.max(0, seconds);
        for (const row of _rows)
            row.advance(seconds);
        let top = geometry.top;
        for (const row of _rows.filter(row => row.shown).sort((a, b) => a.message.order - b.message.order)) {
            row.targetY = top;
            top += row.height + 12;
        }
        if (exiting && !_rows.some(row => row.leaving || row.shown))
            exitFinished();
    }
    onLineMetadataChanged: rebuildConversation()
    onTitleTextChanged: rebuildConversation()
    onActiveEmojisChanged: rebuildConversation()
    onShowEmojiMessagesChanged: rebuildConversation()
    onAnimationIntensityChanged: rebuildConversation()
    onPreparedLinesChanged: scheduleSelection()
    onCurrentIndexChanged: scheduleSelection()
    onTimeSecondsChanged: scheduleSelection()
    onGeometryChanged: scheduleSelection()
    onTuningChanged: scheduleSelection()
    onExitingChanged: scheduleSelection()
    onMotionEnabledChanged: scheduleSelection()
    onBaseFontChanged: resetFont()
    onLiveChanged: rebuildConversation()
    onVisibleChanged: rebuildConversation()
    Component.onCompleted: {
        _completed = true;
        rebuildConversation();
    }
    Component.onDestruction: {
        _completed = false;
        prefixTask.stop();
        retire();
    }
    Timer {
        id: selection
        interval: 0
        onTriggered: root.syncSelection()
    }
    FrameAnimation {
        running: root.live && root.visible && root.motionEnabled
        onTriggered: root.advance(frameTime)
    }
    PrefixPreparation {
        id: prefixBuilder
        baseFont: root.baseFont
        onCompleted: (job, prefixes) => root.prefixComplete(job, prefixes)
        onFailed: (job, message) => root.prefixFailed(job, message)
    }
    Component {
        id: rowComponent
        CappellaRow {}
    }
    Component {
        id: workerComponent
        WorkerScript {
            source: Qt.resolvedUrl("conversationWorker.mjs")
            onReadyChanged: root.sendConversation()
            onMessage: reply => root.acceptConversation(reply)
        }
    }

    // Deferred work belongs to this component and cannot outlive its QML context.
    function schedulePrefix(): void {
        if (_completed)
            prefixTask.restart();
    }
    Timer {
        id: prefixTask
        interval: 0
        onTriggered: if (root._completed)
            root.nextPrefix()
    }
}
