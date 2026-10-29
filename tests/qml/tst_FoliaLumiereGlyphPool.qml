import QtQuick
import QtQuick.Window
import QtTest
import EchoMusic.PluginSdk
import "../../plugins/folia-lyrics-skin/qml/styles/lumiere" as Lumiere
import "../../plugins/folia-lyrics-skin/qml/styles/sonnet" as Sonnet
import "../fixtures/lumiere/glyph-budget.mjs" as Fixture

TestCase {
    id: testCase
    name: "FoliaLumiereGlyphPool"
    when: windowShown
    visible: true
    width: 640
    height: 480
    property bool pumpFrames: false
    property int swappedFrames: 0
    readonly property font sourceFont: Qt.font({
        family: 'PingFang SC',
        pixelSize: 24
    })
    FrameAnimation {
        running: testCase.pumpFrames
        onTriggered: pulse.x = 638 + (currentFrame % 2)
    }
    Rectangle {
        id: pulse
        y: 479
        width: 1
        height: 1
        color: '#010101'
    }
    Connections {
        target: testCase.Window.window
        function onFrameSwapped() {
            if (testCase.pumpFrames)
                testCase.swappedFrames++;
        }
    }
    Component {
        id: producerComponent
        Lumiere.LumiereGlyphTexture {}
    }
    Component {
        id: pictureComponent
        Item {
            id: picture
            required property var producer
            width: 600
            height: 100
            clip: true
            Rectangle {
                anchors.fill: parent
                color: '#15191d'
            }
            Loader {
                active: picture.producer.output !== null
                sourceComponent: Lumiere.LumiereTextureSlice {
                    source: picture.producer.output
                    texture: picture.producer.texture
                    transformOrigin: Item.TopLeft
                    scale: 600 / texture.width
                }
            }
        }
    }
    Component {
        id: referenceComponent
        Item {
            id: reference
            required property var texture
            property var output: capture
            readonly property bool ready: glyphs.count > 0 && Array.from({
                length: glyphs.count
            }, (_, i) => glyphs.itemAt(i)).every(actor => actor && actor.published && !actor.errorString)
            width: texture.width
            height: texture.height
            onReadyChanged: if (ready)
                capture.scheduleUpdate()
            Sonnet.SonnetFont {
                id: referenceFont
                base: testCase.sourceFont
                familyStack: /^(?:normal normal )?(\d+) ([\d.]+)px (.+)$/.exec(reference.texture.commands[0].style.font)[3]
            }
            Item {
                id: content
                width: reference.width
                height: reference.height
                Repeater {
                    id: glyphs
                    model: reference.texture.commands
                    delegate: GlyphRun {
                        id: glyph
                        required property int index
                        required property var modelData
                        property bool published: false
                        font: referenceFont.value
                        function publish() {
                            if (metrics.length !== 1 || errorString)
                                return;
                            const metric = metrics[0], command = modelData;
                            poses = [
                                {
                                    key: 'reference' + index,
                                    x: command.x,
                                    y: command.y + (command.style.textBaseline === 'middle' ? (metric.emAscent - metric.emDescent) / 2 : 0) - metric.baseline,
                                    opacity: command.style.globalAlpha,
                                    color: command.stroke ? command.style.strokeStyle : command.style.fillStyle
                                }
                            ];
                            published = !errorString;
                        }
                        onLayoutChanged: publish()
                        Component.onCompleted: {
                            const match = /^(?:normal normal )?(\d+) ([\d.]+)px (.+)$/.exec(modelData.style.font);
                            // Independent one-command native reference has no shared atlas packing.
                            runs = [
                                {
                                    key: 'reference' + index,
                                    text: modelData.text,
                                    size: Number(match[2]),
                                    weight: Number(match[1]),
                                    spacing: 0,
                                    strokeWidth: modelData.stroke ? modelData.style.lineWidth : 0,
                                    strokeBitmap: modelData.stroke ? 'fill' : 'reject',
                                    maxBlur: 0,
                                    maxHaloRadius: 0
                                }
                            ];
                            publish();
                        }
                    }
                }
            }
            ShaderEffectSource {
                id: capture
                sourceItem: content
                sourceRect: Qt.rect(0, 0, reference.width, reference.height)
                textureSize: Qt.size(reference.texture.pixelWidth, reference.texture.pixelHeight)
                hideSource: true
                visible: false
                smooth: true
                live: false
            }
        }
    }
    function cleanup() {
        pumpFrames = false;
    }
    function createProducer(texture) {
        const value = createTemporaryObject(producerComponent, testCase, {
            texture,
            baseFont: sourceFont
        });
        verify(value !== null);
        return value;
    }
    function ready(value) {
        tryVerify(() => value.ready || value.errorString.length > 0, 10000);
        compare(value.errorString, '');
        verify(value.ready);
    }
    function fingerprint(image) {
        let total = 0;
        for (let y = 0; y < image.height; y += 2)
            for (let x = 0; x < image.width; x += 2)
                total += image.red(x, y) * 3 + image.green(x, y) * 5 + image.blue(x, y) * 7;
        return total;
    }
    function test_realSourceBudgetBakesThenReleasesAtlasAndStaysStaticAcross120ActualFrames() {
        failOnWarning(/ShaderEffect: Texture|invalid context|TypeError|first argument not a function/);
        compare(GraphicsInfo.api, GraphicsInfo.Metal);
        const value = createProducer(Fixture.texture), picture = createTemporaryObject(pictureComponent, testCase, {
            producer: value
        });
        ready(value);
        compare(value.measuredMetrics.length, 24);
        if (Screen.devicePixelRatio === 2)
            verify(value.preparedBatchCount > 1);
        verify(value.nativeTextureUploads > 0);
        compare(value.nativeBatchCount, 0);
        compare(value.nativeCacheBytes, 0);
        compare(value.cacheBytes, 4096 * 633 * 4);
        compare(value.output.textureSize, Qt.size(4096, 633));
        const revision = value.revision, uploads = value.nativeTextureUploads;
        wait(80);
        const before = fingerprint(grabImage(picture));
        verify(before > 600 * 100 * 10);
        swappedFrames = 0;
        pumpFrames = true;
        tryVerify(() => swappedFrames >= 120, 5000);
        pumpFrames = false;
        compare(value.revision, revision);
        compare(value.nativeTextureUploads, uploads);
        compare(value.nativeCacheBytes, 0);
        compare(fingerprint(grabImage(picture)), before, 'completed GPU pixels survive atlas release and static frames');
        value.visible = false;
        compare(value.cacheBytes, 0);
        compare(value.output, null);
        compare(value.measuredMetrics.length, 0);
        value.visible = true;
        ready(value);
        compare(value.nativeCacheBytes, 0);
        value.live = false;
        compare(value.cacheBytes, 0);
        compare(value.nativeBatchCount, 0);
    }
    function test_batchBoundariesPreserveOrderedSourceOverAgainstIndependentNativeCommands() {
        const texture = JSON.parse(JSON.stringify(Fixture.texture));
        for (let index = 0; index < texture.commands.length; index++) {
            const command = texture.commands[index];
            command.x = 160 + (index % 4) * 12;
            command.style.globalAlpha = .55 + (index % 3) * .15;
            command.style.fillStyle = index % 3 === 0 ? '#ff4422' : index % 3 === 1 ? '#22cc55' : '#4477ff';
            command.style.strokeStyle = index % 3 === 0 ? '#22cc55' : index % 3 === 1 ? '#4477ff' : '#ff4422';
        }
        const value = createProducer(texture), actual = createTemporaryObject(pictureComponent, testCase, {
            producer: value
        });
        ready(value);
        const reference = createTemporaryObject(referenceComponent, testCase, {
            texture
        }), expected = createTemporaryObject(pictureComponent, testCase, {
            producer: reference,
            y: 120
        });
        tryVerify(() => reference.ready, 5000);
        wait(100);
        const a = grabImage(actual), b = grabImage(expected);
        let maximum = 0, changed = 0;
        for (let y = 0; y < a.height; y++)
            for (let x = 0; x < a.width; x++) {
                const aa = [a.red(x, y), a.green(x, y), a.blue(x, y)], bb = [b.red(x, y), b.green(x, y), b.blue(x, y)];
                for (let c = 0; c < 3; c++)
                    maximum = Math.max(maximum, Math.abs(aa[c] - bb[c]));
                if (Math.max(...aa) - Math.min(...aa) > 35)
                    changed++;
            }
        verify(changed > 100, 'reference and result contain real overlapping colored glyphs');
        console.info('LUMIERE_ORDERED_BATCH_RGB', maximum, 'colored', changed, 'batches', value.preparedBatchCount);
        verify(maximum <= 1, 'batching must preserve native source-over order: ' + maximum);
        value.live = false;
    }
    function test_rejectedInputsRecoverAndRetiredCaptureCannotPublishIntoNewGeneration() {
        const value = createProducer(Fixture.texture);
        ready(value);
        const previous = value.output, generation = value._generation;
        const invalid = JSON.parse(JSON.stringify(Fixture.texture));
        for (const command of invalid.commands)
            command.style.font = '500 2048px Arial';
        value.texture = invalid;
        tryVerify(() => value.errorString.length > 0, 5000);
        compare(value.ready, false);
        compare(value.output, null);
        compare(value.cacheBytes, 0);
        value.texture = Fixture.texture;
        value.finishBake(previous, generation);
        compare(value.ready, false);
        value.live = false;
        wait(50);
        compare(value.output, null);
        compare(value.cacheBytes, 0);
        compare(value.nativeBatchCount, 0);
        value.live = true;
        ready(value);
        compare(value.measuredMetrics.length, 24);
        compare(value.nativeCacheBytes, 0);
        verify(value.measuredMetrics.every(metric => metric.key.indexOf('g' + value._generation + ':') === 0));
    }
}
