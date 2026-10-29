import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet/kernel.mjs" as Sonnet
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet/native-measure.mjs" as Native
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet/pretext.mjs" as Pretext
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet/song-handover.mjs" as SongGate
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet" as NativeSonnet

TestCase {
    id: testCase
    name: "FoliaSonnet"
    visible: true
    when: windowShown
    width: 900
    height: 700
    function init(): void {
        failOnWarning(/(TypeError|ReferenceError|Unable to assign|Invalid property|is not a function)/);
    }
    Component {
        id: layoutComponent
        NativeSonnet.SonnetLayout {
            lyricSource: foliaTestLyricSource
            lyricCount: foliaTestLyricFixture.count
            textService: foliaTestTextService
            baseFont.family: "Helvetica Neue"
            trackRevision: "native-sonnet"
            geometry: ({width:900,height:700,lyricsFontScale:1,theme:{fontFamily:"Helvetica Neue",fontStyle:"sans",fontWeight:null}})
        }
    }
    Component {
        id:sceneComponent
        NativeSonnet.Sonnet {
            preparedLines:[]
            lyricSource:foliaTestLyricSource
            lyricCount:foliaTestLyricFixture.count
            textService:foliaTestTextService
            baseFont.family:"Helvetica Neue"
            trackRevision:"sonnet-visible"
            backgroundColor:"black"
            primaryColor:"white"
            secondaryColor:"#80caff"
            accentColor:"#ff3060"
            settings:({sonnetShowBackgroundDecor:false,sonnetOuterFrameMode:"none"})
            width:900;height:700
            paused:true
        }
    }
    function sourceScene(checkPixels:bool):void {
        const rows=[];
        for(let index=0;index<12;++index){const text=index%2?'under the brightest sky':'星光照亮天空';rows.push({text,start_ms:index*3000,duration_ms:2400,words:[{text,start_ms:index*3000,duration_ms:2400}]});}
        verify(foliaTestLyricFixture.replaceRows(rows));
        const scene=createTemporaryObject(sceneComponent,testCase);
        verify(scene!==null);
        tryVerify(()=>scene.renderReady||scene.errorString.length>0,60000);
        compare(scene.errorString,"");
        verify(scene.renderReady);
        scene.timeSeconds=1.2;
        wait(30);
        verify(scene.actorCount>0&&scene.actorCount<1000);
        verify(scene.renderers.length>0);
        if(checkPixels) {
            let grab=grabImage(scene),ink=0;const before=[];
            for(let y=0;y<grab.height;y+=2)for(let x=0;x<grab.width;x+=2)ink+=grab.red(x,y)+grab.green(x,y)+grab.blue(x,y);
            verify(ink>10000,"Actual source Sonnet scene has no RGB ink");
            grab.save("/tmp/folia-sonnet-native.png");
            for(let y=0;y<grab.height;y+=4)for(let x=0;x<grab.width;x+=4)before.push([grab.red(x,y),grab.green(x,y),grab.blue(x,y)]);
            for(const renderer of scene.renderers)renderer.opacity=0;
            const withoutGlyphs=grabImage(scene);let difference=0,cursor=0;
            for(let y=0;y<withoutGlyphs.height;y+=4)for(let x=0;x<withoutGlyphs.width;x+=4){const prior=before[cursor++];difference+=Math.abs(prior[0]-withoutGlyphs.red(x,y))+Math.abs(prior[1]-withoutGlyphs.green(x,y))+Math.abs(prior[2]-withoutGlyphs.blue(x,y));}
            verify(difference>3000,"Source Shapes alone cannot satisfy the native glyph RGB assertion");
            for(const renderer of scene.renderers)renderer.opacity=1;
        }
        scene.timeSeconds=28;
        tryVerify(()=>scene.renderReady||scene.errorString.length>0,60000);
        compare(scene.errorString,"");
        scene.timeSeconds=.8;
        tryVerify(()=>scene.renderReady||scene.errorString.length>0,60000);
        compare(scene.errorString,"");
        verify(scene.cachedSceneCount<=3);
        scene.live=false;
        compare(scene.actorCount,0);compare(scene.totalCacheBytes,0);compare(scene.cachedSceneCount,0);
        wait(30);compare(scene.actorCount,0);
    }
    function test_completeNativeSourceSceneAndSeek():void {sourceScene(false);}
    function test_sourceScenePixels():void {sourceScene(true);}
    function test_retiredScenesDoNotRetainTrackingKeys():void {
        for(let cycle=0;cycle<3;++cycle){sourceScene(false);gc();}
    }
    function test_fullSettingsFiltersAndCreditsRetire():void {
        const text="actual lyrics reaching their credits";
        verify(foliaTestLyricFixture.replaceRows([{text,start_ms:0,duration_ms:3000,words:[{text,start_ms:0,duration_ms:3000}]}]));
        const scene=createTemporaryObject(sceneComponent,testCase,{
            settings:({sonnetPostProcessEnabled:true,sonnetPostProcessGrain:.3,sonnetPostProcessContrast:.4,
                sonnetPostProcessRgbShift:.5,sonnetPostProcessHalftone:.6,sonnetPostProcessVignette:.7,
                sonnetPostProcessLensDistortion:.4,sonnetPostProcessLensDispersion:.5}),
            songTitle:"Source title wrapped over a real native stage",songArtist:"Actual artist",songAlbum:"Actual album"
        });
        tryVerify(()=>scene.renderReady||scene.errorString.length>0,60000);compare(scene.errorString,"");
        scene.timeSeconds=1.2;wait(50);compare(scene.errorString,"");
        verify(scene._passes.length>=6,"Every enabled source post-processing pass must reach the real chain");
        const initial=scene.totalCacheBytes;verify(initial>0);
        scene.timeSeconds=20;wait(60);compare(scene.errorString,"");
        verify(scene.actorCount>0);verify(scene._creditsPlan!==null);
        scene.settings={sonnetShowOnlyText:true,sonnetEnableTransitions:false,sonnetOuterFrameMode:"none"};
        scene.timeSeconds=.8;wait(60);compare(scene.errorString,"");verify(scene.renderReady);
        scene.live=false;compare(scene.actorCount,0);compare(scene.totalCacheBytes,0);compare(scene.cachedSceneCount,0);
    }
    function test_instrumentalWaitsForConfirmedPlayback():void {
        verify(foliaTestLyricFixture.replaceRows([]));
        const scene=createTemporaryObject(sceneComponent,testCase,{trackRevision:"instrumental-source"});
        wait(180);compare(scene.isInstrumental,false);compare(scene.renderReady,false);
        scene.timeSeconds=2.05;
        tryVerify(()=>scene.isInstrumental&&scene.renderReady||scene.errorString.length>0,60000);
        compare(scene.errorString,"");verify(scene.isInstrumental);verify(scene.renderReady);
        verify(scene.program.paragraphs.length>0);
        scene.live=false;compare(scene.totalCacheBytes,0);
    }
    function test_songCoverAdvancesWhilePaused():void {
        const oldRows=[{text:"source outgoing lyric",start_ms:0,duration_ms:6000,words:[{text:"source outgoing lyric",start_ms:0,duration_ms:6000}]}];
        verify(foliaTestLyricFixture.replaceRows(oldRows));
        const scene=createTemporaryObject(sceneComponent,testCase,{trackRevision:"cover-old"});
        tryVerify(()=>scene.renderReady||scene.errorString.length>0,60000);compare(scene.errorString,"");
        scene.timeSeconds=1;
        scene.trackRevision="cover-new";
        verify(foliaTestLyricFixture.replaceRows([{text:"actual incoming different text",start_ms:0,duration_ms:6000,words:[{text:"actual incoming different text",start_ms:0,duration_ms:6000}]}]));
        tryVerify(()=>scene.handoverActive||scene.errorString.length>0,60000);compare(scene.errorString,"");
        verify(scene.paused);
        tryVerify(()=>!scene.handoverActive||scene.errorString.length>0,3000);compare(scene.errorString,"");
        compare(scene._displaySeed,"cover-new");verify(scene.renderReady);
        compare(scene.coverOpacity,0);scene.live=false;compare(scene.totalCacheBytes,0);
    }
    function test_actualWorkerNativeFontPreparationAndRetirement(): void {
        const rows=[];
        for(let index=0;index<18;++index) {
            const text=index%2 ? "under the brightest sky" : "星光照亮天空👩‍🚀";
            rows.push({text,start_ms:index*3000,duration_ms:2400,words:[{text,start_ms:index*3000,duration_ms:2400}]});
        }
        verify(foliaTestLyricFixture.replaceRows(rows));
        const layout=createTemporaryObject(layoutComponent,testCase);
        verify(layout!==null);
        tryVerify(()=>layout.scene!==null || layout.errorString.length>0,60000);
        compare(layout.errorString,"");
        verify(layout.program.paragraphs.length>1);
        compare(layout.sceneIndex,0);
        verify(!JSON.stringify(layout.program).includes("brightest"));
        verify(layout.measurementBatches>0);
        verify(layout.scene.layout.shots.length>0);
        verify(layout.scene.layout.shots[0].text.some(value=>value.metric.width>0));
        const last=layout.program.paragraphs.length-1;
        layout.requestedIndex=last;
        tryVerify(()=>layout.sceneIndex===last || layout.errorString.length>0,60000);
        compare(layout.errorString,"");
        compare(layout.sceneIndex,last);
        verify(layout.cachedSceneCount<=3);
        layout.live=false;
        compare(layout.program,null);
        compare(layout.scene,null);
        compare(layout.cachedSceneCount,0);
        wait(50);
        compare(layout.scene,null);
        compare(layout.errorString,"");
    }
    function test_sourceTwoObjectBindingParameters():void {
        const state={sawPlaybackReset:false,playbackTime:0,elapsedMs:3001};
        verify(SongGate.isInstrumentalConfirmed(state,{instrumentalCommitSeconds:2,readyGraceMs:3000}));
    }
    function test_pretextStickyQuotesUsePortableCollections(): void {
        Native.configure({pieces:[{text:'"brightest"',pieces:[{segment:'"',index:0,isWordLike:false},{segment:'brightest',index:1,isWordLike:true},{segment:'"',index:10,isWordLike:false}]}],evaluator:(font,text)=>text.length*4});
        Pretext.clearCache();
        const prepared=Pretext.prepareWithSegments('"brightest"','700 50px Test Oracle');
        const result=Pretext.layoutWithLines(prepared,99999,60);
        compare(result.lines.length,1);
        compare(result.lines[0].width,44);
    }
    function test_sourceUnicodeCodePointFallback(): void {
        const placement={x:0,y:0,rotation:0,enterX:0,enterY:0,vertical:false,role:"hero"};
        const values=Sonnet.buildSonnetGlyphLayout({text:"😀",graphemes:[],startTime:0,endTime:1},placement,48,text=>30,{startTime:0,endTime:4});
        compare(values.length,1);
        compare(values[0].char,"😀");
        const joined=Sonnet.buildSonnetGlyphLayout({text:"👩‍🚀",graphemes:[],startTime:0,endTime:1},placement,48,text=>30,{startTime:0,endTime:4});
        compare(joined.length,3); // Original fallback is code points; prepared EGCs stay intact.
        const egc=Sonnet.buildSonnetGlyphLayout({text:"👩‍🚀",graphemes:[{char:"👩‍🚀",startTime:0,endTime:1}],startTime:0,endTime:1},placement,48,text=>30,{startTime:0,endTime:4});
        compare(egc.length,1);
        compare(egc[0].char,"👩‍🚀");
    }
    function test_programAndTransition(): void {
        const program=Sonnet.compileSonnetProgram([{fullText:"under sky!",startTime:2,endTime:5,autoWordSegments:["under"," ","sky!"],words:[{text:"under",startTime:2,endTime:3},{text:"sky!",startTime:3,endTime:5}]}],"native");
        compare(program.paragraphs.length,1);
        compare(program.paragraphs[0].shots.length,1);
        const frame=Sonnet.resolveSonnetTransitionEffectFrame("fast-blur","exit",.5,13);
        verify(frame.blur>0 && frame.blur<14);
        verify(frame.alpha>0 && frame.alpha<1);
    }
}
