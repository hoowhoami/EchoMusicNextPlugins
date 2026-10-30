// Folia a8da4437 whole-song newspaper/camera renderer. See fume-reference.md.
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Window
import EchoMusic.PluginSdk
import "api.mjs" as Fume
import "frame.mjs" as Frame
import "background.mjs" as Background
import "vector.mjs" as Vector
import "../../shared/renderHints.mjs" as Hints

Item {
    id: root
    required property var preparedLines
    property int currentIndex: -1
    property real timeSeconds: 0
    property font baseFont
    property var settings: ({})
    property color backgroundColor: dark ? "#111111" : "white"
    property color primaryColor: "white"
    property color secondaryColor: "#999999"
    property color accentColor: primaryColor
    property bool dark: true
    property bool live: true
    property bool motionEnabled: true
    property bool paused: false
    property real bassPower: 0
    property real vocalPower: 0
    property real audioPower: 0
    property var audioBands: ({})
    property string themeName: dark ? "dark" : "light"
    property string avatarSeed: "fume"
    property var nextStartBySourceIndex: ({})
    property EchoPluginText textService: null
    property EchoPluginReadModel lyricSource: null
    property var previewRows: null
    property int lyricCount: 0
    property real lyricOffsetMs: 0
    property string trackRevision: ""
    readonly property var article: preparation.article
    readonly property bool busy: preparation.busy
    readonly property bool renderReady: preparation.sourceCurrent && article !== null && !_budgetRejected && _actors.length === _batches.length && !grow.running && _actors.every(actor => actor.posesCurrent && !actor._prepareRejected && !actor.errorString && actor.glyph.ready && actor.glyph.metrics.length === actor.commands.length)
    readonly property int layoutRevision: preparation.layoutRevision
    readonly property int measurementBatches: preparation.measurementBatches
    readonly property int readBatches: preparation.readBatches
    readonly property int refinementRounds: preparation.refinementRounds
    readonly property real maxRequestedFontSize: preparation.maxRequestedFontSize
    readonly property int visibleBlockCount: _visibleCount
    readonly property int rendererCount: _actors.length
    readonly property var renderers: {
        const revision = _paintRevision;
        return _actors.map(actor => actor.glyph);
    }
    readonly property real totalCacheBytes: {
        const revision = _paintRevision;
        return nativeCacheBytes();
    }
    readonly property real peakCacheBytes: _peakCacheBytes
    readonly property real cacheBudgetBytes: 128 * 1024 * 1024
    readonly property var camera: _cameraState.camera
    readonly property string errorString: preparation.errorString || _renderError || background.errorString || batchErrors()
    readonly property var tuning: Frame.tuning(settings)
    readonly property real devicePixelRatio: root.Window.window ? root.Window.window.devicePixelRatio : 1
    readonly property var theme: ({
            name: themeName,
            fontStyle: "sans",
            fontFamily: baseFont.family,
            fontFamilyStack: [],
            fontWeight: typeof settings.fontWeight === "number" ? settings.fontWeight : null,
            primaryColor: String(primaryColor),
            secondaryColor: String(secondaryColor),
            accentColor: String(accentColor),
            animationIntensity: settings.animationIntensity || "normal",
            wordColors: settings.wordColors || []
        })
    property var _cameraState: Fume.createFumeCameraState()
    property var _batches: []
    property var _actors: []
    property bool _budgetRejected: false
    property int _groupRunLimit: 16
    property real _peakCacheBytes: 0
    property var _stamps: []
    property var _decorCommands: []
    property var _decorRecorder: Vector.createRecorder()
    readonly property real decorTextureBytes: background.textureBytes
    property var _background: null
    property var _overview: null
    property real _overviewStart: Infinity
    property real _fadeDuration: Infinity
    property int _visibleCount: 0
    property real _cameraX: 0
    property real _cameraY: 0
    property real _cameraScale: 1
    property string _renderError: ""
    property bool _hasPrinted: false
    property bool _ready: false
    property bool _drawing: false
    property int _paintRevision: 0
    property real _epoch: Date.now()
    function batchErrors(): string {
        const revision = _paintRevision;
        for (const actor of _actors)
            if (actor.errorString)
                return actor.errorString;
        return "";
    }
    function clearPool(): void {
        grow.stop();
        cacheCheck.stop();
        const retired = _actors;
        _actors = [];
        _batches = [];
        for (const actor of retired) {
            actor.visible = false;
            actor.destroy();
        }
        ++_paintRevision;
    }
    function resetBudget(): void {
        _budgetRejected = false;
        _renderError = "";
    }
    function nativeCacheBytes(): real {
        // Item descriptors/UBOs are exclusive. The shared window pool reports
        // immutable source pixels, curve geometry and all four color targets.
        const shared = new Map();
        let total = 0;
        for (const actor of _actors) {
            total += actor.cacheBytes;
            if (actor.sharedCacheKey)
                shared.set(actor.sharedCacheKey, Math.max(shared.get(actor.sharedCacheKey) || 0, actor.sharedCacheBytes));
        }
        for (const bytes of shared.values())
            total += bytes;
        return _actors.length ? total + decorTextureBytes : 0;
    }
    function checkCache(): void {
        const total = nativeCacheBytes();
        _peakCacheBytes = Math.max(_peakCacheBytes, total);
        ++_paintRevision;
        if (total > cacheBudgetBytes && !_budgetRejected) {
            _budgetRejected = true;
            _renderError = "Fume visible cache exceeds 128 MiB (" + total + " bytes)";
            clearPool();
            _stamps = [];
            updateDecor();
        }
    }
    function scheduleCacheCheck(): void {
        if (_ready)
            cacheCheck.restart();
    }
    function updatePool(batches: var): void {
        if (_budgetRejected)
            return;
        _batches = batches;
        while (_actors.length > batches.length) {
            const retired = _actors[_actors.length - 1];
            _actors = _actors.slice(0, -1);
            retired.visible = false;
            retired.destroy();
        }
        for (let i = 0; i < _actors.length && !_budgetRejected; i++)
            _actors[i].commands = batches[i];
        checkCache();
        if (!_budgetRejected && _actors.length < batches.length)
            grow.restart();
    }
    function splitRejectedGroup(actor: var): void {
        if (_budgetRejected || _actors.indexOf(actor) < 0 || actor.commands.length <= 1)
            return;
        // Keep every complete shaping context. Smaller groups retain the same
        // paint order and source poses; no glyph or effect is removed.
        _groupRunLimit = Math.max(1, Math.min(_groupRunLimit - 1, Math.floor(actor.commands.length / 2)));
        const commands = _batches.reduce((all, group) => all.concat(group), []);
        clearPool();
        try {
            updatePool(Frame.batches(commands, tuning.glowIntensity > 0, _groupRunLimit));
        } catch (error) {
            _budgetRejected = true;
            _renderError = String(error.message || error);
        }
    }
    function growPool(): void {
        if (!live || !visible || _budgetRejected || _actors.length >= _batches.length)
            return;
        const actor = batchComponent.createObject(paper, {
            commands: _batches[_actors.length]
        });
        if (!actor) {
            _renderError = "Fume native glyph group creation failed";
            clearPool();
            return;
        }
        _actors = _actors.concat([actor]);
        checkCache();
        if (!_budgetRejected && _actors.length < _batches.length)
            grow.restart();
    }
    function rebuildScene(): void {
        if (!_ready)
            return;
        resetBudget();
        clearPool();
        _peakCacheBytes = 0;
        _groupRunLimit = 16;
        _hasPrinted = false;
        _cameraState = Fume.createFumeCameraState();
        Fume.syncFumeCameraToArticle(_cameraState, article);
        _overview = article ? Fume.resolveArticleOverviewCamera(article, {
            width: width,
            height: height
        }) : null;
        const blocks = article ? article.chronologicalBlocks : [], last = blocks.length ? blocks[blocks.length - 1] : null;
        _overviewStart = last ? last.line.startTime + Math.max(Hints.getLineRenderEndTime(last.line) - last.line.startTime, 0) * .5 : Infinity;
        _fadeDuration = Fume.resolveFumePassedFadeDuration(blocks.map(block => block.line), tuning.textHoldRatio);
        _background = Background.buildFumeBackgroundScene({
            viewport: {
                width: width,
                height: height
            },
            world: {
                width: article ? article.width : Math.max(width * 1.8, width),
                height: article ? article.height : Math.max(height * 1.8, height)
            },
            paperBounds: article ? article.paperBounds : undefined,
            seed: avatarSeed + ":" + themeName
        });
        draw(1 / 60);
    }
    function draw(dt: real): void {
        if (!_ready || _drawing)
            return;
        if (!live || !visible) {
            clearPool();
            _stamps = [];
            _decorCommands = [];
            _visibleCount = 0;
            return;
        }
        if (_budgetRejected)
            return;
        _drawing = true;
        try {
            const viewport = {
                width: width,
                height: height
            };
            let restore = 0;
            if (article && timeSeconds >= article.firstRenderableStartTime)
                _hasPrinted = true;
            if (article) {
                const result = Fume.stepFumeCamera(_cameraState, {
                    article: article,
                    time: timeSeconds,
                    now: Date.now() - _epoch,
                    dt: dt,
                    lineIndex: currentIndex,
                    viewport: viewport,
                    overviewCamera: _overview,
                    overviewStartTime: _overviewStart,
                    cameraSpeed: tuning.cameraSpeed,
                    cameraTrackingMode: tuning.cameraTrackingMode,
                    staticMode: !motionEnabled,
                    animationIntensity: theme.animationIntensity
                });
                restore = result.overviewTextRestoreProgress;
            }
            _cameraX = _cameraState.camera.x;
            _cameraY = _cameraState.camera.y;
            _cameraScale = _cameraState.camera.scale;
            const commands = [], stamps = [], glow = Fume.resolveFumeGlowBases(theme.animationIntensity, tuning.glowIntensity);
            let visibleCount = 0;
            if (article && settings.showText !== false) {
                for (const block of article.blocks) {
                    if (!Fume.isFumeBlockOnScreen(block, _cameraState.camera, viewport))
                        continue;
                    ++visibleCount;
                    const ordered = article.chronologicalBlocks, index = ordered.indexOf(block), next = index + 1 < ordered.length ? ordered[index + 1].line.startTime : null;
                    const recorded = Frame.recordBlock(block, {
                        time: timeSeconds,
                        theme: theme,
                        glowIntensity: tuning.glowIntensity,
                        activeGlowBoost: glow.activeGlowBoost,
                        passedGlowBase: glow.passedGlowBase,
                        minimumDeviceScale: Fume.CAMERA_SCALE_MIN * devicePixelRatio,
                        showPrintStamp: !tuning.hidePrintSymbols
                    }, next, {
                        time: timeSeconds,
                        theme: theme,
                        passedGlowBase: glow.passedGlowBase,
                        passedFadeDuration: _fadeDuration,
                        overviewTextRestoreProgress: restore,
                        snapshotScale: Math.max(1, Math.min(2, devicePixelRatio)),
                        textHoldRatio: tuning.textHoldRatio
                    });
                    commands.push.apply(commands, recorded.text);
                    stamps.push.apply(stamps, recorded.stamps);
                }
            }
            const batches = Frame.batches(commands, tuning.glowIntensity > 0, _groupRunLimit);
            // Prepare one bounded group per GUI turn; frames update existing poses only.
            updatePool(batches);
            _visibleCount = visibleCount;
            _stamps = stamps;
            if (!_budgetRejected)
                _renderError = "";
            ++_paintRevision;
            updateDecor();
        } catch (error) {
            _renderError = String(error.message || error);
        } finally {
            _drawing = false;
        }
    }
    function schedule(): void {
        if (_ready)
            drawTask.restart();
    }
    onArticleChanged: rebuildScene()
    onTimeSecondsChanged: schedule()
    onCurrentIndexChanged: {
        resetBudget();
        schedule();
    }
    onSettingsChanged: {
        resetBudget();
        _fadeDuration = article ? Fume.resolveFumePassedFadeDuration(article.chronologicalBlocks.map(block => block.line), tuning.textHoldRatio) : Infinity;
        schedule();
    }
    onThemeChanged: schedule()
    onBaseFontChanged: schedule()
    onPausedChanged: schedule()
    onMotionEnabledChanged: schedule()
    onLiveChanged: {
        if (live)
            rebuildScene();
        else
            draw(1 / 60);
    }
    onVisibleChanged: {
        if (visible)
            rebuildScene();
        else
            draw(1 / 60);
    }
    onDevicePixelRatioChanged: schedule()
    onAvatarSeedChanged: rebuildScene()
    onThemeNameChanged: rebuildScene()
    onWidthChanged: rebuildScene()
    onHeightChanged: rebuildScene()
    Component.onDestruction: {
        _ready = false;
        drawTask.stop();
        cacheCheck.stop();
        clearPool();
    }
    Component.onCompleted: {
        _ready = true;
        rebuildScene();
    }
    FumeLayout {
        id: preparation
        lyricSource: root.lyricSource
        previewRows: root.previewRows
        lyricCount: root.lyricCount
        lyricOffsetMs: root.lyricOffsetMs
        trackRevision: root.trackRevision
        textService: root.textService
        viewportWidth: root.width
        viewportHeight: root.height
        baseFont: root.baseFont
        live: root.live && root.visible
        geometry: ({
                theme: {
                    name: root.themeName,
                    fontStyle: "sans",
                    fontFamily: root.baseFont.family,
                    fontFamilyStack: [],
                    fontWeight: root.theme.fontWeight
                },
                lyricsFontScale: typeof root.settings.lyricsFontScale === "number" ? root.settings.lyricsFontScale : 1,
                tuning: {
                    heroScale: root.tuning.heroScale
                }
            })
    }
    FrameAnimation {
        running: root.live && root.visible && !root.paused && root.motionEnabled && !root._budgetRejected
        onTriggered: root.draw(Math.max(1 / 240, Math.min(.05, frameTime)))
    }
    Item {
        id: stage
        anchors.fill: parent
        visible: root.article !== null || root.lyricCount === 0
        scale: root.article && root.settings.showText !== false ? (root._hasPrinted ? 1 : .985) : 1
        transformOrigin: Item.Center
        Behavior on scale {
            enabled: root.live && root.motionEnabled
            NumberAnimation {
                duration: 450
                easing.type: Easing.OutCubic
            }
        }
        FumeDecor {
            id: background
            anchors.fill: parent
            commands: root._decorCommands
            stamps: root._stamps
            cameraX: root._cameraX
            cameraY: root._cameraY
            cameraScale: root._cameraScale
            devicePixelRatio: root.devicePixelRatio
        }
        Item {
            id: paper
            x: root.width * .5 - root._cameraX * root._cameraScale
            y: root.height * .5 - root._cameraY * root._cameraScale
            scale: root._cameraScale
            transformOrigin: Item.TopLeft
        }
    }
    Timer {
        id: grow
        interval: 0
        onTriggered: root.growPool()
    }
    Timer {
        id: cacheCheck
        interval: 0
        onTriggered: root.checkCache()
    }
    Component {
        id: batchComponent
        FumeBatch {
            id: actor
            baseFont: root.baseFont
            deviceScale: root._cameraScale * root.devicePixelRatio
            // The source camera clamps every step to CAMERA_SCALE_MAX. The
            // entry tween is monotone .985 -> 1; text/hero/viewport sizing is
            // already in each requested font size, and poses have unit scale.
            // DPR is applied by GlyphRun, outside this logical-scale bound.
            maximumRasterScale: Fume.CAMERA_SCALE_MAX
            glowEnabled: root.tuning.glowIntensity > 0
            onErrorStringChanged: ++root._paintRevision
            // Retiring a pool here would re-enter the cacheBytes binding while
            // it is notifying. Check the complete accepted pool on its own turn.
            onCacheBytesChanged: root.scheduleCacheCheck()
            onSharedCacheBytesChanged: root.scheduleCacheCheck()
            // A required commands value can reject before Component.onCompleted.
            // The owned timer runs after creation and checks actor membership.
            onBudgetRejected: splitTask.restart()
            Timer {
                id: splitTask
                interval: 0
                onTriggered: if (root._ready && actor._completed)
                    root.splitRejectedGroup(actor)
            }
        }
    }
    FumeLoading {
        anchors.centerIn: parent
        visible: root.live && root.busy
        backgroundColor: root.backgroundColor
        primaryColor: root.primaryColor
        secondaryColor: root.secondaryColor
        animate: root.live && root.motionEnabled
    }
    function updateDecor(): void {
        if (!live || !visible || tuning.disableGeometricBackground || !motionEnabled || !_background) {
            _decorCommands = [];
            return;
        }
        let projection, parallax;
        if (article) {
            const v = Fume.resolveFumeBackgroundView(_background, _cameraState.camera, {
                width,
                height
            });
            projection = {
                x: width * .5 - v.backgroundCameraX * v.backgroundScale,
                y: height * .5 - v.backgroundCameraY * v.backgroundScale,
                scale: v.backgroundScale
            };
            parallax = {
                cameraX: v.backgroundCameraX,
                cameraY: v.backgroundCameraY,
                originX: v.backgroundCenterX,
                originY: v.backgroundCenterY,
                strength: .72
            };
        } else {
            projection = {
                x: width * .5 - _background.width * .5,
                y: height * .5 - _background.height * .5,
                scale: 1
            };
        }
        _decorCommands = Vector.recordBackground(_decorRecorder, {
            scene: _background,
            theme,
            time: article ? timeSeconds : timeSeconds + (Date.now() - _epoch) * .00018,
            audioLevels: audioLevels(),
            objectOpacityMultiplier: tuning.backgroundObjectOpacity * 2,
            parallax
        }, projection);
    }
    function audioLevels(): var {
        const band = (key, fallback) => Math.max(0, Math.min(1, typeof audioBands[key] === "number" ? audioBands[key] : fallback)) * 255;
        return {
            power: band("audioPower", audioPower),
            bass: band("bass", bassPower),
            lowMid: band("lowMid", 0),
            mid: band("mid", 0),
            vocal: band("vocal", vocalPower),
            treble: band("treble", 0)
        };
    }

    Timer {
        id: drawTask
        interval: 0
        onTriggered: if (root._ready)
            root.draw(1 / 60)
    }
}
