import QtQuick
import QtTest

TestCase {
    id: testCase
    name: "FoliaCadenza"
    when: windowShown
    visible: true
    width: 1100
    height: 820
    Rectangle {
        anchors.fill: parent
        color: "#080b14"
        z: -1
    }
    function init() {
        failOnWarning(/TypeError:|Error: .*valid color/);
    }
    function prepared(text, start, end) {
        const parts = text.split(" ");
        const words = parts.map((part, index) => ({
                    text: part,
                    startTime: start + index * (end - start) / parts.length,
                    endTime: start + (index + 1) * (end - start) / parts.length
                }));
        return {
            line: {
                fullText: text,
                startTime: start,
                endTime: end,
                words: words,
                isChorus: true
            }
        };
    }
    function createCadenza(values) {
        const component = Qt.createComponent("../../plugins/folia-lyrics-skin/qml/styles/cadenza/Cadenza.qml");
        compare(component.status, Component.Ready, component.errorString());
        return createTemporaryObject(component, testCase, Object.assign({
            width: 1100,
            height: 820,
            preparedLines: [prepared("under the brightest sky", 1, 6)],
            currentIndex: 0,
            timeSeconds: 3,
            baseFont: Qt.font({
                family: "Menlo",
                pixelSize: 40
            }),
            textService: foliaTestTextService,
            accentColor: "#ff4f86",
            settings: {}
        }, values || {}));
    }
    function test_workerMeasuresAndWrapsRealHero() {
        const view = createCadenza();
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.errorString, "");
        verify(view.layout.layout.lines.length >= 2);
        compare(view.layout.placements.filter(p => p.emphasis > 1).length, 1);
        verify(view.renderers.length >= 4);
        for (const renderer of view.renderers)
            compare(renderer.errorString, "");
        const probe = findChild(view, "cadenzaMeasure");
        compare(probe.visible, false);
        compare(probe.cacheBytes, 0);
        verify(view.measurementBatches > 0);
    }
    function test_sparseMissingAndInactiveScopeDropWorkerResults() {
        const sparse = [];
        sparse[8] = prepared("first star", 1, 4);
        sparse[40] = prepared("second sky", 5, 9);
        const view = createCadenza({
            preparedLines: sparse,
            currentIndex: 8,
            timeSeconds: 2
        });
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.layout.text, "first star");
        view.currentIndex = 9;
        tryCompare(view, "layout", null);
        compare(view.renderers.length, 0);
        view.currentIndex = 40;
        view.live = false;
        wait(100);
        compare(view.layout, null);
        compare(view.renderers.length, 0);
        view.live = true;
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.layout.text, "second sky");
    }
    function test_motionPosesKeepMasksAndActualRgb() {
        const view = createCadenza({
            timeSeconds: 4.1
        });
        tryVerify(() => view.layout !== null && view.renderers.length > 0, 10000);
        wait(650);
        const renderer = view.renderers[0];
        tryVerify(() => renderer.textureUploads > 0 && renderer.renderBatches > 0, 5000);
        const revision = renderer.maskRevision;
        const uploads = renderer.textureUploads;
        const layoutRevision = view.layoutRevision;
        view.timeSeconds = 4.5;
        wait(200);
        compare(renderer.maskRevision, revision);
        compare(renderer.textureUploads, uploads);
        compare(view.layoutRevision, layoutRevision);
        compare(view.errorString, "");
        const image = grabImage(view);
        image.save("build/folia-native-qml/cadenza-hero.png");
        let pixels = 0;
        const scale = image.width / view.width;
        for (let y = 80 * scale; y < 700 * scale; y += 2 * scale)
            for (let x = 100 * scale; x < 1000 * scale; x += 2 * scale)
                if (image.red(x, y) > 90)
                    pixels++;
        verify(pixels > 100, "Cadenza native RGB ink count=" + pixels);
    }
    function test_nextSourcePrefetchIsBoundedAndReused() {
        const sparse = [];
        sparse[2] = prepared("brightest sky", 1, 4);
        sparse[50] = prepared("夜空 中 最亮 的 星", 5, 9);
        const view = createCadenza({
            preparedLines: sparse,
            currentIndex: 2,
            timeSeconds: 2
        });
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        const preparation = findChild(view, "foliaCadenzaPreparation");
        tryVerify(() => preparation.prefetchReady === true, 10000);
        verify(preparation.cacheSize <= 2);
        const batches = view.measurementBatches;
        view.currentIndex = 50;
        tryVerify(() => view.layout !== null && view.layout.text === "夜空 中 最亮 的 星", 10000);
        compare(view.measurementBatches, batches);
        view.settings = Object.assign({}, view.settings, {
            cadenzaGlowIntensity: 1.8,
            cadenzaMotionAmount: .6
        });
        wait(40);
        compare(view.measurementBatches, batches);
    }
    function test_staticInputChangesRepaintWithoutFrameClock() {
        const view = createCadenza({
            motionEnabled: false,
            timeSeconds: 5.8
        });
        tryVerify(() => view.layout !== null && view.renderers.length > 0, 10000);
        tryCompare(view, "errorString", "");
        tryVerify(() => view.renderer.textureUploads > 0 && view.renderer.poses.length > 0, 5000);
        const actor = view.renderer.parent;
        const beforeY = actor.y;
        const batches = view.measurementBatches;
        const masks = view.renderer.maskRevision;
        view.primaryColor = "#20ffaa";
        wait(40);
        compare(view.renderer.maskRevision, masks);
        const body = view.renderer.poses[0].color;
        verify(Qt.colorEqual(body, Qt.rgba(32 / 255, 1, 170 / 255, .82)), String(body));
        view.settings = Object.assign({}, view.settings, {
            cadenzaGlowIntensity: 0
        });
        wait(30);
        compare(view.measurementBatches, batches);
        for (const renderer of view.renderers)
            for (const pose of renderer.poses)
                compare(pose.halos.length, 0);
        view.height = 980;
        tryVerify(() => view.layout !== null && view.renderer.parent.y !== beforeY, 10000);
        view.baseFont = Qt.font({
            family: "Times New Roman",
            italic: true,
            letterSpacing: 3
        });
        tryVerify(() => view.layout !== null && view.renderer.font.family === "Times New Roman", 10000);
        compare(view.renderer.font.italic, false);
        compare(view.renderer.font.letterSpacing, 0);
        compare(view.errorString, "");
    }
    function test_safeClusterHalosAndNativeRejectionRecovery() {
        const view = createCadenza({
            preparedLines: [prepared("office👩🏽‍🚀", 1, 6)],
            timeSeconds: 2,
            baseFont: Qt.font({
                family: "Times New Roman"
            })
        });
        tryVerify(() => view.layout !== null && view.renderers.length === 1, 10000);
        tryCompare(view, "errorString", "");
        const renderer = view.renderer;
        const allowed = renderer.metrics[0].graphemes.map(part => part.clusterStart);
        verify(renderer.poses.length < renderer.runs[0].text.length);
        for (const pose of renderer.poses)
            verify(allowed.indexOf(pose.start) >= 0);
        verify(renderer.metrics[0].inkTop < 0);
        const runs = renderer.runs;
        renderer.runs = [
            {
                key: "word",
                text: "M".repeat(8193),
                size: 72,
                maxBlur: 16,
                maxHaloRadius: 40
            }
        ];
        tryVerify(() => view.errorString.length > 0);
        view.timeSeconds = 2.4;
        wait(40);
        verify(view.errorString.length > 0);
        renderer.runs = runs;
        tryCompare(view, "errorString", "");
        verify(renderer.poses.length > 0);
        compare(renderer.poses[0].key, "word");
    }
    function test_rapidSeekDuringAsyncPreparationNeverPublishesWrongSource() {
        const values = [];
        for (let i = 0; i < 20; i++)
            values[i * 3] = prepared("source " + i, i * 5, i * 5 + 4);
        const view = createCadenza({
            preparedLines: values,
            currentIndex: 0,
            timeSeconds: 1
        });
        for (let i = 1; i < 20; i++)
            view.currentIndex = i * 3;
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.layout.text, "source 19");
        view.currentIndex = -1;
        tryCompare(view, "layout", null);
        compare(view.renderers.length, 0);
        view.currentIndex = 57;
        view.visible = false;
        wait(100);
        compare(view.layout, null);
        compare(view.renderers.length, 0);
    }
    function test_sourceCssFortyPixelShadowsUseNativeSigmaTwenty() {
        const single=prepared("光",1,6);single.line.isChorus=false;
        const view = createCadenza({
            preparedLines: [single],
            timeSeconds: 2,
            motionEnabled: false
        });
        tryVerify(() => view.layout !== null && view.renderers.length === 1, 10000);
        const renderer = view.renderer;
        tryVerify(() => renderer.textureUploads > 0 && renderer.poses.length > 0, 5000);
        compare(view.errorString, "");
        compare(renderer.runs[0].maxHaloRadius, 40);
        compare(renderer.poses[0].halos.length, 3);
        for (const halo of renderer.poses[0].halos)
            compare(halo.radius, 20);
        const revision = renderer.maskRevision, uploads = renderer.textureUploads;
        wait(40);
        const glow = grabImage(view);
        glow.save("build/folia-native-qml/cadenza-halo.png");
        view.settings = Object.assign({}, view.settings, {
            cadenzaGlowIntensity: 0
        });
        tryVerify(() => renderer.poses[0].halos.length === 0);
        wait(40);
        const body = grabImage(view);
        body.save("build/folia-native-qml/cadenza-body.png");
        compare(renderer.poses[0].halos.length, 0);
        compare(renderer.maskRevision, revision);
        compare(renderer.textureUploads, uploads);
        let haze=0,maximumDistance=0,left=body.width,top=body.height,right=0,bottom=0;
        const scale=glow.width/view.width;
        for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++)if(body.red(x,y)>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        verify(right>left&&bottom>top,"Native body ink bbox missing");
        for(let y=60*scale;y<700*scale;y+=2*scale)for(let x=100*scale;x<1000*scale;x+=2*scale)
            if(glow.red(x,y)-body.red(x,y)>3&&body.red(x,y)<25){haze++;maximumDistance=Math.max(maximumDistance,Math.hypot(Math.max(left-x,0,x-right),Math.max(top-y,0,y-bottom))/scale);}
        const origin=renderer.parent.mapToItem(view,0,0),unit=renderer.parent.mapToItem(view,1,0),screenScale=Math.hypot(unit.x-origin.x,unit.y-origin.y);
        verify(haze>100,"Real source CSS40 / native sigma20 halo RGB pixels="+haze);
        verify(maximumDistance>10*screenScale,"Source halo must reach beyond native body ink: "+maximumDistance);
        verify(maximumDistance<=3*20*screenScale+4,"Empirical RGB coverage guard for the old 2x-radius regression (including 1 logical pixel sampling margin): "+maximumDistance+" screenScale="+screenScale);

    }
    function test_nearerSourceArrivingDuringPrefetchBecomesTheCachedSuccessor() {
        const lines = [];
        lines[1] = prepared("current lyric", 1, 5);
        const view = createCadenza({
            preparedLines: lines,
            currentIndex: 1
        });
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        const preparation = findChild(view, "foliaCadenzaPreparation");
        let swapped = false;
        function insertNearer() {
            if (!preparation._working || !preparation._jobLine || preparation._jobLine.fullText !== "distant successor")
                return;
            preparation._workingChanged.disconnect(insertNearer);
            swapped = true;
            const fresh = view.preparedLines.slice();
            fresh[10] = prepared("near successor", 5, 8);
            view.preparedLines = fresh;
        }
        preparation._workingChanged.connect(insertNearer);
        const distant = lines.slice();
        distant[40] = prepared("distant successor", 9, 12);
        view.preparedLines = distant;
        tryVerify(() => swapped, 10000);
        tryVerify(() => preparation.prefetchReady, 10000);
        const batches = view.measurementBatches;
        view.currentIndex = 10;
        tryVerify(() => view.layout !== null && view.layout.text === "near successor", 10000);
        compare(view.measurementBatches, batches);
    }
    function test_instrumentalIntroPreparesUpcomingBeforeAnyActiveLine() {
        const lines = [];
        lines[12] = prepared("first upcoming lyric", 10, 15);
        const view = createCadenza({
            preparedLines: lines,
            currentIndex: -1,
            timeSeconds: 0
        });
        const preparation = findChild(view, "foliaCadenzaPreparation");
        compare(view.layout, null);
        compare(view.renderers.length, 0);
        tryVerify(() => preparation.prefetchReady, 10000);
        const batches = view.measurementBatches;
        view.timeSeconds = 10.5;
        view.currentIndex = 12;
        tryVerify(() => view.layout !== null && !view.busy, 10000);
        compare(view.layout.text, "first upcoming lyric");
        compare(view.measurementBatches, batches);
    }
 function test_twentyFourCjkWordsReportActualNativeCache(){
  const text="夜空中最亮的星照耀着远方的人走过春夏秋冬又一年",chars=Array.from(text).slice(0,24),line={fullText:chars.join(""),startTime:1,endTime:8,isChorus:true,words:chars.map((text,index)=>({text:text,startTime:1+index*7/24,endTime:1+(index+1)*7/24}))};
  const view=createCadenza({preparedLines:[{line:line}],timeSeconds:4,motionEnabled:false});tryVerify(()=>view.layout!==null&&view.renderers.length>0,15000);tryVerify(()=>view.renderers.every(renderer=>renderer.textureUploads>0||renderer.cacheBytes===0),5000);wait(100);compare(view.errorString,"");let total=0;for(const renderer of view.renderers)total+=renderer.cacheBytes;console.info("CADENZA_24CJK_NATIVE_CACHE",JSON.stringify({rendererCount:view.renderers.length,totalCacheBytes:total,cacheBytes:view.renderers.map(renderer=>renderer.cacheBytes)}));verify(total>0);
  const concurrent={fullText:chars.join(""),startTime:1,endTime:8,isChorus:true,words:chars.map(text=>({text:text,startTime:1,endTime:8}))};view.preparedLines=[{line:concurrent}];tryVerify(()=>view.layout!==null&&!view.busy,15000);wait(100);compare(view.errorString,"");let allActive=0;for(const renderer of view.renderers)allActive+=renderer.cacheBytes;console.info("CADENZA_24CJK_ALL_ACTIVE_NATIVE_CACHE",JSON.stringify({rendererCount:view.renderers.length,totalCacheBytes:allActive,cacheBytes:view.renderers.map(renderer=>renderer.cacheBytes)}));verify(allActive>0);
 }

}
