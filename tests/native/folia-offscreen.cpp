// No Cocoa windows or activation calls. Verify real Metal pixels before using
// this harness for any plugin cost measurement.
#include "EchoGpuSurface.h"
#include "GlyphRunStaticLayout_p.h"
#include "FloatTexture.h"
#include "folia-benchmark-support.h"
#include <QAbstractAnimation>
#include <QGuiApplication>
#include <QImage>
#include <QQmlComponent>
#include <QQmlEngine>
#include <QQmlExpression>
#include <QQuickGraphicsConfiguration>
#include <QQuickItem>
#include <QQuickRenderControl>
#include <QQuickRenderTarget>
#include <QQuickWindow>
#include <QResource>
#include <QtCore/private/qcore_mac_p.h>
#include <QtEndian>
#include <QtQuick/private/qquickwindow_p.h>
#include <QtTest>
#include <array>
#include <cstring>
#include <memory>
#include <rhi/qrhi.h>

class FoliaOffscreenTest : public QObject
{
    Q_OBJECT
private slots:
    void metalTexturePixels();
    void bloomPaddedAndTightPixels();
    void glyphBakingPixels();
    void floatTextureCodecPixels();
    void virtualPresentationState();
    void installedPlaybackPage();
    void sonnetNativeSequenceDescriptor();
    void staticGlyphAtlasConsumerRecovery();
};

void FoliaOffscreenTest::metalTexturePixels()
{
    QCOMPARE(QGuiApplication::platformName(), QString("offscreen"));
    QQuickRenderControl control;
    QQuickWindow window(&control);
    window.resize(64, 64);
    QQuickGraphicsConfiguration config;
    config.setTimestamps(true);
    window.setGraphicsConfiguration(config);
    QQmlEngine engine;
    QQmlComponent component(&engine);
    component.setData("import QtQuick; Rectangle { width: 64; height: 64; color: '#31b765' }",
                      QUrl("qrc:/folia-offscreen-rectangle.qml"));
    std::unique_ptr<QObject> root(component.create());
    QVERIFY2(root, qPrintable(component.errorString()));
    qobject_cast<QQuickItem *>(root.get())->setParentItem(window.contentItem());
    QVERIFY(control.initialize());
    QCOMPARE(window.rendererInterface()->graphicsApi(), QSGRendererInterface::Metal);
    auto *rhi = control.rhi();
    QVERIFY(rhi);
    qInfo() << "Offscreen native device" << rhi->driverInfo().deviceName;
    std::unique_ptr<QRhiTexture> texture(
        rhi->newTexture(QRhiTexture::RGBA8, QSize(64, 64), 1,
                        QRhiTexture::RenderTarget | QRhiTexture::UsedAsTransferSource));
    QVERIFY(texture->create());
    std::unique_ptr<QRhiRenderBuffer> depth(
        rhi->newRenderBuffer(QRhiRenderBuffer::DepthStencil, QSize(64, 64), 1));
    QVERIFY(depth->create());
    QRhiTextureRenderTargetDescription description(QRhiColorAttachment(texture.get()));
    description.setDepthStencilBuffer(depth.get());
    std::unique_ptr<QRhiTextureRenderTarget> target(rhi->newTextureRenderTarget(description));
    std::unique_ptr<QRhiRenderPassDescriptor> pass(target->newCompatibleRenderPassDescriptor());
    target->setRenderPassDescriptor(pass.get());
    QVERIFY(target->create());
    window.setRenderTarget(QQuickRenderTarget::fromRhiRenderTarget(target.get()));
    QRhiReadbackResult pixels;
    control.polishItems();
    control.beginFrame();
    control.sync();
    control.render();
    auto *update = rhi->nextResourceUpdateBatch();
    update->readBackTexture(texture.get(), &pixels);
    control.commandBuffer()->resourceUpdate(update);
    control.endFrame();
    QCOMPARE(pixels.pixelSize, QSize(64, 64));
    QVERIFY(pixels.data.size() >= 64 * 64 * 4);
    const auto *center =
        reinterpret_cast<const uchar *>(pixels.data.constData()) + (32 * 64 + 32) * 4;
    QVERIFY(qAbs(int(center[0]) - 49) <= 1);
    QVERIFY(qAbs(int(center[1]) - 183) <= 1);
    QVERIFY(qAbs(int(center[2]) - 101) <= 1);
    qInfo() << "Offscreen completed GPU ms"
            << control.commandBuffer()->lastCompletedGpuTime() * 1000 << "desktopVisible"
            << window.isVisible();
    window.setRenderTarget({});
    root.reset();
    control.invalidate();
}

// The test owns a logical visible/hidden session, rather than a native desktop
// surface. This adapter never invokes QWindow's platform-window creation path.
class OffscreenWindowPrivate : public QQuickWindowPrivate
{
public:
    void setVisible(bool value) override
    {
        const bool changed = visible != value;
        visible = value;
        visibility = value ? QWindow::Windowed : QWindow::Hidden;
        if (changed) {
            emit q_func() -> visibleChanged(value);
            emit q_func() -> visibilityChanged(visibility);
        }
    }
};
class OffscreenWindow : public QQuickWindow
{
public:
    explicit OffscreenWindow(QQuickRenderControl *control)
        : QQuickWindow(*new OffscreenWindowPrivate, control)
    {
    }
};

class WallClockDriver : public QAnimationDriver
{
public:
    qint64 elapsed() const override
    {
        return clock.isValid() ? clock.elapsed() : 0;
    }

protected:
    void start() override
    {
        clock.start();
        QAnimationDriver::start();
    }

private:
    QElapsedTimer clock;
};

class OffscreenSession
{
public:
    QQuickRenderControl control;
    OffscreenWindow window{&control};
    WallClockDriver animation;
    std::unique_ptr<QRhiTexture> texture;
    std::unique_ptr<QRhiRenderBuffer> depth;
    std::unique_ptr<QRhiTextureRenderTarget> target;
    std::unique_ptr<QRhiRenderPassDescriptor> pass;
    QTimer timer;
    QElapsedTimer clock;
    qint64 nextFrameNs = 0, frameCount = 0;
    bool collecting = false;
    QVector<double> completedIntervals, renderWall, gpuTimes;
    qint64 previousCompletion = 0;
    explicit OffscreenSession()
    {
        animation.install();
    }
    ~OffscreenSession()
    {
        timer.stop();
        window.setVisible(false);
        window.setRenderTarget({});
        control.invalidate();
        animation.uninstall();
    }
    bool initialize(QSize size, qreal dpr)
    {
        window.resize(size);
        window.contentItem()->setSize(size);
        QQuickGraphicsConfiguration configuration;
        configuration.setTimestamps(true);
        window.setGraphicsConfiguration(configuration);
        if (!control.initialize() || !control.rhi())
            return false;
        const auto pixels = size * dpr;
        auto *rhi = control.rhi();
        texture.reset(
            rhi->newTexture(QRhiTexture::RGBA8, pixels, 1,
                            QRhiTexture::RenderTarget | QRhiTexture::UsedAsTransferSource));
        depth.reset(rhi->newRenderBuffer(QRhiRenderBuffer::DepthStencil, pixels, 1));
        if (!texture->create() || !depth->create())
            return false;
        QRhiTextureRenderTargetDescription description(QRhiColorAttachment(texture.get()));
        description.setDepthStencilBuffer(depth.get());
        target.reset(rhi->newTextureRenderTarget(description));
        pass.reset(target->newCompatibleRenderPassDescriptor());
        target->setRenderPassDescriptor(pass.get());
        if (!target->create())
            return false;
        auto renderTarget = QQuickRenderTarget::fromRhiRenderTarget(target.get());
        renderTarget.setDevicePixelRatio(dpr);
        window.setRenderTarget(renderTarget);
        window.setVisible(true);
        timer.setSingleShot(true);
        timer.setTimerType(Qt::PreciseTimer);
        QObject::connect(&timer, &QTimer::timeout, &window, [this] {
            if (window.isVisible())
                frame();
            nextFrameNs += 16666667;
            const auto now = clock.nsecsElapsed();
            if (nextFrameNs <= now)
                nextFrameNs = now + 16666667;
            timer.start(int(std::max<qint64>(1, (nextFrameNs - now + 999999) / 1000000)));
        });
        clock.start();
        timer.start(0);
        return !window.handle();
    }
    void frame(QRhiReadbackResult *readback = nullptr)
    {
        // Metal uses autoreleased objects. The manual render loop owns the
        // per-frame pool that Qt's window render loop normally provides.
        const QMacAutoReleasePool releasePool;
        const auto began = clock.nsecsElapsed();
        animation.advance();
        control.polishItems();
        control.beginFrame();
        if (!control.rhi()->isRecordingFrame() || !control.commandBuffer())
            qFatal("Cannot record offscreen Metal frame");
        control.sync();
        control.render();
        auto *buffer = control.commandBuffer();
        if (readback) {
            auto *update = control.rhi()->nextResourceUpdateBatch();
            update->readBackTexture(texture.get(), readback);
            buffer->resourceUpdate(update);
        }
        control.endFrame();
        if (control.rhi()->isDeviceLost())
            qFatal("Offscreen Metal device was lost");
        // The redirected window has no swapchain. Texture consumers still
        // need their completion notification after Metal has finished.
        emit window.frameSwapped();
        ++frameCount;
        if (collecting) {
            const auto ended = clock.nsecsElapsed();
            renderWall.append((ended - began) / 1e6);
            if (previousCompletion)
                completedIntervals.append((ended - previousCompletion) / 1e6);
            previousCompletion = ended;
            const auto seconds = buffer->lastCompletedGpuTime();
            if (std::isfinite(seconds) && seconds > 0)
                gpuTimes.append(seconds * 1000);
        }
    }
};
void FoliaOffscreenTest::staticGlyphAtlasConsumerRecovery()
{
    const auto shaders = qEnvironmentVariable("FOLIA_GPU_FIXTURE_SHADERS");
    if (shaders.isEmpty())
        QSKIP("Set FOLIA_GPU_FIXTURE_SHADERS to the host's built GPU fixture "
              "shaders");
    QTest::failOnWarning(QRegularExpression("No QSGTexture provided"));
    Host host;
    const auto directory =
        package(host.temporary.path(), "export function activate(c) {}",
                {"lifecycle", "operations", "graphics.rhi", "graphics.glyphAtlases", "text.glyphs"},
                {"graphics"});
    for (const auto *name : {"fixture.vert", "glyph.frag"}) {
        QFile file(shaders + "/" + name + ".qsb");
        QVERIFY(file.open(QIODevice::ReadOnly));
        write(directory + "/" + name + ".qsb", file.readAll());
    }
    host.runtime.importDirectory(directory);
    QVERIFY(awaitEvent(
        [&] { return host.runtime.state(host.installation()) == PluginRuntime::Active; }, 5000));
    auto *scope = host.runtime.context(host.installation());
    auto *gpu = scope->graphics();
    QVERIFY(gpu);
    OffscreenSession session;
    QVERIFY(session.initialize({360, 144}, 1));
    host.mainWindow = &session.window;
    GlyphRun glyph(session.window.contentItem());
    glyph.setProperty("plugin", QVariant::fromValue(scope));
    glyph.setSize({180, 100});
    glyph.setPosition({150, 0});
    glyph.setRuns(
        {QVariantMap{{"key", "borrowed"}, {"text", "Atlas"}, {"size", 32}, {"maxBlur", 0}}});
    QVERIFY(glyph.errorString().isEmpty());
    EchoGpuSurface surface;
    surface.setParentItem(session.window.contentItem());
    surface.setSize({96, 64});
    surface.setGraphics(gpu);
    auto *atlas = surface.importGlyphAtlas(&glyph);
    QVERIFY(atlas);
    QVERIFY(awaitEvent([&] { return atlas->ready() && glyph.renderBatches() > 0; }, 10000));
    auto *pipeline = gpu->createRenderPipeline(
        {{"vertexShader", "fixture.vert.qsb"},
         {"fragmentShader", "glyph.frag.qsb"},
         {"blend", "none"},
         {"topology", "triangle-strip"},
         {"vertexLayout",
          QVariantMap{
              {"stride", 8},
              {"attributes",
               QVariantList{QVariantMap{{"location", 0}, {"offset", 0}, {"format", "float2"}}}}}}});
    auto *vertices = gpu->createBuffer({{"size", 32}, {"usage", QStringList{"vertex"}}},
                                       host.engine.evaluate("[-1,1,1,1,-1,-1,1,-1]"));
    auto *sampler = gpu->createSampler();
    QVERIFY(pipeline && vertices && sampler);
    const auto draw = [&]() {
        const auto level = atlas->fragments().first().toMap()["levels"].toList().first().toMap();
        auto values = level["uv"].toList();
        values.append(1.);
        values.append(0.);
        values.append(0.);
        values.append(0.);
        auto *uniform = gpu->createBuffer({{"size", 32}, {"usage", QStringList{"uniform"}}},
                                          host.engine.toScriptValue(values));
        auto *page = qobject_cast<EchoGpuResource *>(
            atlas->pages().value(level["page"].toInt()).value<QObject *>());
        if (!uniform || !page)
            return QByteArray();
        const bool accepted = surface.submit(
            {{"passes",
              QVariantList{QVariantMap{
                  {"pipeline", pipeline->id()},
                  {"bindings",
                   QVariantList{
                       QVariantMap{{"binding", 0}, {"kind", "uniform"}, {"resource", "frame"}},
                       QVariantMap{
                           {"binding", 1}, {"kind", "uniform"}, {"resource", uniform->id()}},
                       QVariantMap{{"binding", 2},
                                   {"kind", "texture"},
                                   {"resource", page->id()},
                                   {"sampler", sampler->id()}}}},
                  {"draws",
                   QVariantList{QVariantMap{{"count", 4}, {"vertexBuffer", vertices->id()}}}}}}}});
        if (!accepted) {
            uniform->dispose();
            return QByteArray();
        }
        auto *operation = surface.readback();
        const auto hold = host.engine.newQObject(operation);
        if (!awaitEvent([&] { return operation->finished(); }, 10000) ||
            operation->state() != EchoPluginOperation::Succeeded) {
            uniform->dispose();
            return QByteArray();
        }
        const auto pixels = operation->result().toMap()["data"].toByteArray();
        uniform->dispose();
        return pixels;
    };
    const auto reference = draw();
    QVERIFY(!reference.isEmpty());
    int ink = 0, clear = 0;
    for (int i = 0; i < reference.size(); i += 4) {
        ink += quint8(reference[i]) > 32;
        clear += reference[i + 3] == 0;
    }
    QVERIFY(ink > 15 && clear > 15);
    for (int cycle = 0; cycle < 3; ++cycle) {
        const auto generation = atlas->generation();
        QPointer<EchoGpuResource> oldPage =
            qobject_cast<EchoGpuResource *>(atlas->pages().first().value<QObject *>());
        QVERIFY(QMetaObject::invokeMethod(&session.window, "sceneGraphAboutToStop",
                                          Qt::DirectConnection));
        QVERIFY(!atlas->ready());
        QVERIFY(
            awaitEvent([&] { return atlas->ready() && atlas->generation() > generation; }, 10000));
        QVERIFY(!oldPage || !oldPage->active());
        QCOMPARE(draw(), reference);
    }
    surface.setPaused(true);
    QVERIFY(awaitEvent([&] { return surface.drained(); }, 10000));
    QVERIFY(!atlas->ready());
    QVERIFY(host.runtime.setEnabled(scope->installationId(), false));
    QVERIFY(awaitEvent([&] { return !atlas->active(); }, 10000));
    QVERIFY(!session.window.handle());
}

void FoliaOffscreenTest::floatTextureCodecPixels()
{
    if (!qEnvironmentVariableIsSet("FOLIA_FLOAT_CODEC_SHADER"))
        QSKIP("Bake tests/native/shaders/float-codec.frag and set "
              "FOLIA_FLOAT_CODEC_SHADER");
    Host host;
    host.runtime.importDirectory(package(host.temporary.path(), "export function activate(c) {}",
                                         {"graphics.floatTexture", "graphics.floatTexture.base64"},
                                         {"graphics"}));
    QVERIFY(awaitEvent(
        [&] { return host.runtime.state(host.installation()) == PluginRuntime::Active; }, 5000));
    auto *gpu = host.runtime.context(host.installation())->graphics();
    QVERIFY(gpu && gpu->active());
    const auto budget = gpu->memoryBudget();
    OffscreenSession session;
    QVERIFY(session.initialize({64, 32}, 1));
    QQmlComponent component(&host.engine);
    component.setData(R"(
import QtQuick
import EchoMusic.PluginSdk
Item {
    id: view; width: 64; height: 32
    required property url shader
    FloatTexture { id: pixels; objectName: "codecPixels"; width: 1; height: 1 }
    ShaderEffect { anchors.fill: parent; property var source: pixels; fragmentShader: view.shader }
})",
                      QUrl("qrc:/folia-float-codec.qml"));
    std::unique_ptr<QObject> object(component.createWithInitialProperties(
        {{"shader", QUrl::fromLocalFile(qEnvironmentVariable("FOLIA_FLOAT_CODEC_SHADER"))}}));
    QVERIFY2(object, qPrintable(component.errorString()));
    auto *item = qobject_cast<QQuickItem *>(object.get());
    item->setParentItem(session.window.contentItem());
    auto *source = object->findChild<FloatTexture *>("codecPixels");
    QVERIFY(source);
    source->setGraphics(gpu);
    QByteArray bytes(6 * 16, Qt::Uninitialized);
    for (int pixel = 0; pixel < 6; ++pixel) {
        const std::array<float, 4> channels{-.5f + pixel * .125f, 2.f - pixel * .1f,
                                            .25f + pixel * .05f, 1.f};
        for (int channel = 0; channel < 4; ++channel) {
            quint32 bits;
            memcpy(&bits, &channels[channel], 4);
            qToLittleEndian(bits, bytes.data() + pixel * 16 + channel * 4);
        }
    }
    const auto encoded = QString::fromLatin1(bytes.toBase64());
    QString packed;
    for (int i = 0; i < bytes.size(); i += 2)
        packed.append(QChar(qFromLittleEndian<quint16>(bytes.constData() + i)));
    const auto verifyPixels = [&] {
        QRhiReadbackResult result;
        session.frame(&result);
        if (result.data.isEmpty())
            return false;
        const QImage image(reinterpret_cast<const uchar *>(result.data.constData()), 64, 32,
                           QImage::Format_RGBA8888);
        for (int pixel = 0; pixel < 6; ++pixel) {
            const auto actual = image.pixelColor((pixel % 3) * 64 / 3 + 10, (pixel / 3) * 16 + 8);
            if (qAbs(actual.red() - qRound((.25f + pixel * .0625f) * 255)) > 1 ||
                qAbs(actual.green() - qRound((.5f - pixel * .025f) * 255)) > 1 ||
                qAbs(actual.blue() - qRound((.25f + pixel * .05f) * 255)) > 1 ||
                actual.alpha() != 255)
                return false;
        }
        return true;
    };
    QVERIFY(source->uploadBase64(3, 2, encoded));
    QVERIFY(awaitEvent(verifyPixels, 5000));
    QVERIFY(awaitEvent([&] { return source->textureUploads() == 1; }, 5000));
    QVERIFY(source->uploadPacked(3, 2, packed));
    QVERIFY(verifyPixels());
    QCOMPARE(source->textureUploads(), 1);
    const std::array<quint32, 24> patterns{
        0,          0x80000000, 1,          0x80000001, 0x007fffff, 0x807fffff,
        0x00800000, 0x80800000, 0x7f7fffff, 0xff7fffff, 0x3f800000, 0xbf800000,
        0x3f000000, 0xbf000000, 0x40000000, 0xc0000000, 0x3f800001, 0xbf800001,
        0x3f7fffff, 0xbf7fffff, 0x12345678, 0x92345678, 0x6abcdef0, 0xeabcdef0};
    QByteArray special(96, Qt::Uninitialized);
    QString specialPacked;
    for (int i = 0; i < int(patterns.size()); ++i)
        qToLittleEndian(patterns[i], special.data() + i * 4);
    for (int i = 0; i < special.size(); i += 2)
        specialPacked.append(QChar(qFromLittleEndian<quint16>(special.constData() + i)));
    QVERIFY(source->uploadBase64(3, 2, QString::fromLatin1(special.toBase64())));
    QVERIFY(awaitEvent([&] { return source->textureUploads() == 2; }, 5000));
    QVERIFY(source->uploadPacked(3, 2, specialPacked));
    session.frame();
    QCOMPARE(source->textureUploads(),
             2); // Identical finite bits, including signed zero/subnormals.
    QVERIFY(source->uploadBase64(3, 2, encoded));
    QVERIFY(awaitEvent(verifyPixels, 5000));
    for (int cycle = 0; cycle < 3; ++cycle) {
        item->setVisible(false);
        QVERIFY(awaitEvent([&] { return budget->native.used.load() == 0; }, 5000));
        QVERIFY(!source->uploadBase64(3, 2, encoded));
        item->setVisible(true);
        QVERIFY(source->uploadBase64(3, 2, encoded));
        QVERIFY(awaitEvent(verifyPixels, 5000));
        QCOMPARE(budget->native.used.load(), 96);
    }
    QVERIFY(host.runtime.setEnabled(host.installation(), false));
    QVERIFY(awaitEvent(
        [&] { return budget->native.used.load() == 0 && budget->floatTextures.load() == 0; },
        5000));
    QVERIFY(!source->uploadBase64(3, 2, encoded));
    QVERIFY(!session.window.handle());
}

void FoliaOffscreenTest::bloomPaddedAndTightPixels()
{
    OffscreenSession session;
    QVERIFY(session.initialize(QSize(540, 420), 2));
    QQmlEngine engine;
    QQmlComponent component(&engine);
    const auto directory =
        QUrl::fromLocalFile(qEnvironmentVariable("FOLIA_TEST_BLOOM_DIR")).toString();
    component.setData(("import QtQuick\nimport \"" + directory + "\" as Native\n" + R"(
Item {
    id: root
    width: 540; height: 420
    property bool tight: false
    property real density: 2
    property int samples: 1
    readonly property real bytes: bloom.cacheBytes
    Item {
        id: raw
        width: 379.25; height: 287.75
        Rectangle { x: 1; y: 1; width: 115.5; height: 63.25; color: "#ecb13a"; radius: 17 }
        Rectangle { x: 338.5; y: 244.5; width: 40.75; height: 43.25; color: "#36d6e8"; rotation: 17 }
        Text { x: 32; y: 98; font.pixelSize: 38; text: "山河 ffi á"; color: "#f6d99b" }
    }
    Native.LumiereBloom {
        id: bloom
        x: 65; y: 60; width: raw.width; height: raw.height
        source: raw; tightTargets: root.tight; resolution: root.density; samples: root.samples
        options: ({ strength: 1.3, threshold: .42, knee: .3, levels: 6, spread: .9, padding: 0, tint: [1,.8,.6] })
    }
})")
                          .toUtf8(),
                      QUrl("qrc:/folia-bloom-parity.qml"));
    std::unique_ptr<QObject> root(component.create());
    QVERIFY2(root, qPrintable(component.errorString()));
    auto *item = qobject_cast<QQuickItem *>(root.get());
    item->setParentItem(session.window.contentItem());
    auto read = [&] {
        runEventLoop(400);
        QRhiReadbackResult pixels;
        session.frame(&pixels);
        return pixels.data;
    };
    for (const double density : {1., 1.25, 2., 3.})
        for (const int samples : {1, 4}) {
            root->setProperty("density", density);
            root->setProperty("samples", samples);
            root->setProperty("tight", false);
            const auto padded = read();
            const auto oldBytes = root->property("bytes").toDouble();
            root->setProperty("tight", true);
            const auto tight = read();
            QVERIFY(root->property("bytes").toDouble() < oldBytes);
            QCOMPARE(tight.size(), padded.size());
            int maximum = 0, changed = 0, bright = 0;
            for (qsizetype i = 0; i < tight.size(); ++i) {
                const int delta = qAbs(int(uchar(tight[i])) - int(uchar(padded[i])));
                maximum = std::max(maximum, delta);
                changed += delta > 2;
                bright += uchar(tight[i]) > 32;
            }
            qInfo() << "Bloom allocation parity" << density << samples << maximum << changed
                    << "bytes" << oldBytes << root->property("bytes");
            QVERIFY(bright > 10000);
            QVERIFY2(maximum <= 3 && changed < tight.size() / 1000,
                     "Tight targets changed source bloom pixels");
        }
    QVERIFY(!session.window.handle());
}

void FoliaOffscreenTest::glyphBakingPixels()
{
    configureUiTypography();
    OffscreenSession session;
    QVERIFY(session.initialize(QSize(540, 170), 2));
    QQmlEngine engine;
    QQmlComponent component(&engine);
    const auto directory =
        QUrl::fromLocalFile(qEnvironmentVariable("FOLIA_TEST_BLOOM_DIR")).toString();
    component.setData(("import QtQuick\nimport \"" + directory + "\" as Native\n" + R"(
Item {
    id: root
    width: 540; height: 170
    property string sampling: "static"
    property bool outline: false
    readonly property bool ready: glyph.ready
    readonly property string error: glyph.errorString
    Native.LumiereGlyphTexture {
        id: glyph
        glyphSampling: root.sampling
        baseFont: Qt.font({ family: "Arial" })
        texture: ({ width: 520, height: 150, pixelWidth: 1040, pixelHeight: 300, resolution: 2,
            commands: [{kind: "text",text: "山河 office ffi á 😀",x:12,y:70,stroke:root.outline,
                style: {matrix:[2,0,0,0,2,0], font:'640 38px "Arial"', textBaseline:"middle", globalCompositeOperation:"source-over", globalAlpha:.8, fillStyle:"#dbac5f",strokeStyle:"#dbac5f",lineWidth:1.5}}] })
    }
    ShaderEffect {
        x: 10; y: 10; width: 520; height: 150
        property var source: glyph.output
        property real outputAlpha: 1
        fragmentShader: ")" +
                       directory + R"(/glyph-prime.frag.qsb"
    }
})")
                          .toUtf8(),
                      QUrl("qrc:/folia-glyph-bake-parity.qml"));
    std::unique_ptr<QObject> root(component.create());
    QVERIFY2(root, qPrintable(component.errorString()));
    qobject_cast<QQuickItem *>(root.get())->setParentItem(session.window.contentItem());
    auto read = [&] {
        QRhiReadbackResult pixels;
        session.frame(&pixels);
        return pixels.data;
    };
    for (const bool outline : {false, true}) {
        root->setProperty("outline", outline);
        root->setProperty("sampling", "static");
        QVERIFY2(awaitEvent([&] { return root->property("ready").toBool(); }, 15000),
                 qPrintable(root->property("error").toString()));
        runEventLoop(100);
        const auto before = read();
        root->setProperty("sampling", "canvas");
        QVERIFY2(awaitEvent([&] { return root->property("ready").toBool(); }, 15000),
                 qPrintable(root->property("error").toString()));
        runEventLoop(100);
        const auto after = read();
        QCOMPARE(before.size(), after.size());
        int maximum = 0, changed = 0, visible = 0;
        for (qsizetype i = 0; i < before.size(); ++i) {
            const int delta = qAbs(int(uchar(before[i])) - int(uchar(after[i])));
            maximum = std::max(maximum, delta);
            changed += delta > 2;
            visible += uchar(after[i]) > 32;
        }
        qInfo() << "Glyph bake parity" << outline << maximum << changed;
        QVERIFY(visible > 1000);
        QVERIFY2(maximum <= 3 && changed < before.size() / 1000,
                 "Compact glyph baking changed pixels");
    }
    QVERIFY(!session.window.handle());
}

void FoliaOffscreenTest::virtualPresentationState()
{
    QCOMPARE(QGuiApplication::platformName(), QString("offscreen"));
    QQuickRenderControl control;
    OffscreenWindow window(&control);
    window.resize(64, 64);
    window.setVisible(true);
    QVERIFY(window.isVisible());
    QCOMPARE(window.visibility(), QWindow::Windowed);
    QVERIFY(!window.handle());
    QVERIFY(control.initialize());
    QCOMPARE(window.rendererInterface()->graphicsApi(), QSGRendererInterface::Metal);
    QVERIFY(!window.handle());
    qInfo() << "Virtual presentation has no native window" << !window.handle()
            << control.rhi()->driverInfo().deviceName;
    window.setVisible(false);
    QVERIFY(!window.isVisible());
    QCOMPARE(window.visibility(), QWindow::Hidden);
    QVERIFY(!window.handle());
    control.invalidate();
}

void FoliaOffscreenTest::installedPlaybackPage()
{
    QTest::failOnWarning(
        QRegularExpression("invalid context|TypeError:|ReferenceError:|is not a function"));
    configureUiTypography();
    auto mode = qEnvironmentVariable("FOLIA_PERF_MODE", "classic");
    Host host;
    host.shell.attachPlayback(host.playback);
    host.shell.attachTheme(host.theme);
    host.theme.setMotionEnabled(true);
    if (qEnvironmentVariableIsSet("FOLIA_TEST_CHROME")) {
        host.theme.setFloatingFrosted(true);
        host.theme.setMode(ThemeStore::Dark);
    }
    if (qEnvironmentVariableIsSet("FOLIA_UI_LIGHT"))
        host.theme.setMode(ThemeStore::Light);
    const auto font = qEnvironmentVariable("FOLIA_PERF_FONT", "PingFang SC");
    QVERIFY(QFontDatabase::hasFamily(font));
    host.theme.setLyricFont(font);
    host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
    QString installation;
    QTRY_VERIFY_WITH_TIMEOUT(
        !(installation = host.runtime.installationForId("folia-lyrics-skin")).isEmpty(), 10000);
    QTRY_VERIFY_WITH_TIMEOUT(!host.runtime.loading(), 10000);
    QCOMPARE(host.runtime.state(installation), PluginRuntime::Active);
    auto *entry = host.theme.extensions()->entries("skin").first();
    if (mode != "native") {
        QVariantMap values;
        const auto settingsFile = qEnvironmentVariable("FOLIA_TEST_SETTINGS");
        if (!settingsFile.isEmpty()) {
            QFile file(settingsFile);
            QVERIFY(file.open(QIODevice::ReadOnly));
            values = QJsonDocument::fromJson(file.readAll()).object().toVariantMap();
            QVERIFY(!values.isEmpty());
        }
        values["mode"] = mode;
        values["fontFamilies"] = QVariantList{font};
        QVERIFY(entry->configuration()->patch(values));
        QTRY_VERIFY(!entry->configuration()->busy());
        QVERIFY(host.runtime.context(installation)->appearance()->useSkin("folia"));
    }
    OffscreenSession session;
    QVERIFY(session.initialize(qEnvironmentVariableIsSet("FOLIA_UI_NARROW") ? QSize(760, 620)
                                                                            : QSize(1100, 820),
                               qApp->primaryScreen()->devicePixelRatio()));
    auto *window = &session.window;
    host.mainWindow = window;
    QQmlComponent component(&host.engine);
    component.setData(R"(
import QtQuick
import EchoMusic.Playback
import EchoMusic.Theme
Item {
    id: container
    width: 1100; height: 820
    required property PlaybackService playback
    readonly property alias presentationPage: page
    PlaybackPage { id: page; parent: container; playback: container.playback }
    Connections { target: Theme.store.extensions; function onRequestRaised(action) { if(action === "skins") Qt.callLater(page.openSkins); } }
    function openPlayback() { page.open(); }
    function closePlayback() { page.close(); }
})",
                      QUrl("qrc:/folia-offscreen-playback.qml"));
    std::unique_ptr<QObject> root(
        component.createWithInitialProperties({{"playback", QVariant::fromValue(&host.playback)}}));
    QVERIFY2(root, qPrintable(component.errorString()));
    auto *item = qobject_cast<QQuickItem *>(root.get());
    QVERIFY(item);
    item->setParentItem(window->contentItem());
    if (qEnvironmentVariableIsSet("FOLIA_UI_NARROW"))
        item->setSize(window->size());
    // Shared readiness resolves the production page through the owning window.
    window->setProperty("presentationPage", root->property("presentationPage"));
    const auto track = audioFixture(host);
    host.playback.setVolume(1);
    host.playback.playTracks({track}, 0, "Authored benchmark", "folia-benchmark");
    QVERIFY2(awaitEvent([&] { return host.playback.playing() && !host.playback.loading(); }, 10000),
             qPrintable(host.playback.errorMessage()));
    QJsonArray rows;
    for (int i = 0; i < 80; ++i)
        rows.append(
            QJsonObject{{"text", QString("山河依旧，光落在你的肩头 %1 — office ffi á").arg(i)},
                        {"start_ms", i * 4000},
                        {"duration_ms", 3500},
                        {"translation", QString("Authored translation %1 in the moonlight").arg(i)},
                        {"words", QJsonArray{}}});
    QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, track.id));
    QTimer auditHeartbeat;
    QVector<double> auditGaps;
    QJsonArray auditStalls;
    QString auditPhase = "initial";
    QElapsedTimer auditBeat, auditPhaseTime;
    auditPhaseTime.start();
    if (qEnvironmentVariableIsSet("FOLIA_TEST_EXPERIENCE") ||
        qEnvironmentVariableIsSet("FOLIA_TEST_STUDIO_LATENCY") ||
        qEnvironmentVariableIsSet("FOLIA_TEST_STYLE_CYCLE")) {
        auditBeat.start();
        auditHeartbeat.setInterval(4);
        QObject::connect(&auditHeartbeat, &QTimer::timeout, window, [&] {
            const auto gap = auditBeat.nsecsElapsed() / 1e6;
            auditGaps.append(gap);
            if (gap > 100)
                auditStalls.append(QJsonObject{
                    {"phase", auditPhase},
                    {"gapMs", gap},
                    {"atMs", auditPhaseTime.elapsed()},
                    {"loadedMode", visual(window->contentItem(), "foliaVisualizerStage")
                                       ? visual(window->contentItem(), "foliaVisualizerStage")
                                             ->property("loadedMode")
                                             .toString()
                                       : QString{}}});
            auditBeat.restart();
        });
        auditHeartbeat.start();
    }
    const auto computeReference = qEnvironmentVariable("ECHO_GLYPH_REFERENCE_COMPUTE_RCC");
    if (!computeReference.isEmpty()) {
        Q_CLEANUP_RESOURCE(echo_plugin_glyph_canvas_compute_shaders);
        QVERIFY(QResource::registerResource(computeReference));
        QFile selected(":/qt/qml/EchoMusic/PluginSdk/shaders/glyph-canvas/vertical.comp.qsb");
        QVERIFY(selected.open(QIODevice::ReadOnly));
        QCOMPARE(selected.readAll(), QByteArray("unsupported-compute-test"));
    }
    const auto reference = qEnvironmentVariable("ECHO_GLYPH_REFERENCE_RCC");
    if (!reference.isEmpty()) {
        Q_CLEANUP_RESOURCE(echo_plugin_glyph_canvas_shaders);
        QVERIFY(QResource::registerResource(reference));
        QFile expected(qEnvironmentVariable("ECHO_GLYPH_REFERENCE_QSB"));
        QFile selected(":/qt/qml/EchoMusic/PluginSdk/shaders/glyph-canvas/blur.frag.qsb");
        QVERIFY(expected.open(QIODevice::ReadOnly));
        QVERIFY(selected.open(QIODevice::ReadOnly));
        QCOMPARE(selected.readAll(), expected.readAll());
    }
    QElapsedTimer preparation;
    preparation.start();
    QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
    const auto ready = [&] { return presentationContentReady(window, mode); };
    const auto awaitReadyFrame = [&](int timeoutMs) {
        qint64 candidateFrame = -1;
        bool failed = false;
        const bool settled = awaitEvent(
            [&] {
                auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
                if (stage && !presentationError(stage).isEmpty()) {
                    failed = true;
                    return true;
                }
                if (!ready()) {
                    candidateFrame = -1;
                    return false;
                }
                if (candidateFrame < 0)
                    candidateFrame = session.frameCount;
                return session.frameCount > candidateFrame;
            },
            timeoutMs);
        return settled && !failed;
    };
    const bool initialReady = awaitReadyFrame(60000);
    if (!initialReady) {
        qInfo() << "Offscreen not ready" << mode << root->property("presentationPage")
                << presentationResources(window);
        QJsonArray states;
        for (auto *object : presentationObjects(window->contentItem())) {
            const auto type = QString::fromLatin1(object->metaObject()->className());
            if (type.startsWith("LumiereSceneView") || type.startsWith("Nebbia")) {
                auto wrapper = host.engine.newQObject(object);
                auto inspect = wrapper.property("inspect");
                if (inspect.isCallable())
                    states.append(QJsonObject{
                        {"type", type},
                        {"state",
                         QJsonValue::fromVariant(inspect.callWithInstance(wrapper).toVariant())}});
            }
        }
        QFile diagnostic(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/not-ready.json");
        if (diagnostic.open(QIODevice::WriteOnly))
            diagnostic.write(QJsonDocument(states).toJson());
        for (auto *object : presentationObjects(window->contentItem()))
            if (!object->objectName().isEmpty())
                qInfo() << object->metaObject()->className() << object->objectName()
                        << object->property("width") << object->property("height")
                        << object->property("visible") << object->property("presentationActive");
    }
    QVERIFY(initialReady);
    const auto preparationMs = preparation.elapsed();
    if (qEnvironmentVariableIsSet("FOLIA_TEST_STYLE_REENTRY")) {
        QTest::failOnWarning(QRegularExpression("Folia presentation failed"));
        QTest::failOnWarning(QRegularExpression("Binding loop detected"));
        QJsonArray created, results;
        QString seen;
        QTimer observe;
        observe.setInterval(4);
        QObject::connect(&observe, &QTimer::timeout, window, [&] {
            auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
            if (!stage)
                return;
            const auto loaded = stage->property("loadedMode").toString();
            if (!loaded.isEmpty() && loaded != seen) {
                created.append(loaded);
                seen = loaded;
            }
            QVERIFY(stage->property("layerCount").toInt() <= 1);
        });
        observe.start();
        const auto choose = [&](const QString &selected) {
            mode = selected;
            return entry->configuration()->patch({{"mode", mode}}) &&
                   awaitEvent([&] { return !entry->configuration()->busy(); }, 10000);
        };
        auto *initial = visual(window->contentItem(), "foliaVisualizerStage");
        QPointer<QObject> kept = initial ? nativeObject(initial->property("renderer")) : nullptr;
        QVERIFY(kept);
        const auto originalMode = mode;
        QVERIFY(choose("lumiere"));
        QVERIFY(awaitEvent(
            [&] {
                auto *cover = visual(window->contentItem(), "foliaStyleSwitchCover");
                return cover && cover->isVisible() && cover->opacity() > .05;
            },
            1000));
        QVERIFY(choose(originalMode));
        QVERIFY(awaitReadyFrame(30000));
        auto *returned = visual(window->contentItem(), "foliaVisualizerStage");
        QVERIFY(kept && nativeObject(returned->property("renderer")) == kept.data());
        QVERIFY(!kept->property("paused").toBool());
        const auto resumedAt = kept->property("timeSeconds").toDouble();
        runEventLoop(100);
        QVERIFY(kept->property("timeSeconds").toDouble() > resumedAt);
        results.append(QJsonObject{{"case", "cancel-back-keeps-renderer"}, {"ready", true}});
        QVERIFY(choose("lumiere"));
        QVERIFY(awaitEvent(
            [&] {
                auto *cover = visual(window->contentItem(), "foliaStyleSwitchCover");
                return cover && cover->isVisible() && cover->opacity() > .05;
            },
            1000));
        QVERIFY(choose("machi"));
        QVERIFY(choose("cadenza"));
        QVERIFY(awaitReadyFrame(30000));
        QVERIFY(!created.contains("lumiere") && !created.contains("machi"));
        results.append(QJsonObject{{"case", "rapid-last-wins"}, {"created", created}});
        host.playback.pause();
        QVERIFY(awaitEvent([&] { return !host.playback.playing(); }, 5000));
        QVERIFY(choose("classic"));
        QVERIFY(awaitReadyFrame(30000));
        results.append(QJsonObject{{"case", "paused-switch"}, {"ready", true}});
        host.theme.setMotionEnabled(false);
        QVERIFY(awaitEvent(
            [&] {
                auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
                return stage && !stage->property("motionEnabled").toBool();
            },
            5000));
        QVector<double> coverOpacities;
        QTimer sampleCover;
        sampleCover.setInterval(4);
        QObject::connect(&sampleCover, &QTimer::timeout, window, [&] {
            if (auto *cover = visual(window->contentItem(), "foliaStyleSwitchCover"))
                coverOpacities.append(cover->opacity());
        });
        sampleCover.start();
        QVERIFY(choose("partita"));
        QVERIFY(awaitReadyFrame(30000));
        sampleCover.stop();
        QVERIFY(!coverOpacities.isEmpty());
        for (const auto value : coverOpacities)
            QVERIFY(value == 0 || value == 1);
        results.append(QJsonObject{{"case", "reduced-motion"}, {"samples", coverOpacities.size()}});
        host.theme.setMotionEnabled(true);
        QVERIFY(choose("lumiere"));
        window->setVisible(false);
        runEventLoop(1000);
        auto resources = presentationResources(window);
        QVERIFY(!resources["hasDynamicStage"].toBool());
        QCOMPARE(resources["glyphRunCount"].toInt(), 0);
        QCOMPARE(resources["skinRunningFrameAnimationCount"].toInt(), 0);
        window->setVisible(true);
        QVERIFY(awaitReadyFrame(30000));
        results.append(QJsonObject{{"case", "hidden-cancel-restore"}, {"ready", true}});
        QVERIFY(choose("machi"));
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        window->setVisible(false);
        runEventLoop(1200);
        QVERIFY(!presentationResources(window)["hasDynamicStage"].toBool());
        QCOMPARE(presentationResources(window)["glyphRunCount"].toInt(), 0);
        observe.stop();
        QFile evidence(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/style-reentry.json");
        QVERIFY(evidence.open(QIODevice::WriteOnly));
        evidence.write(QJsonDocument(results).toJson());
        QVERIFY(!window->handle());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_STYLE_CYCLE")) {
        QTest::failOnWarning(QRegularExpression("Binding loop detected"));
        if (qEnvironmentVariableIsSet("FOLIA_TEST_STRICT_PRESENTATION"))
            QTest::failOnWarning(QRegularExpression("Folia presentation failed"));
        QJsonArray results;
        bool passed = true;
        const auto selection = qgetenv("FOLIA_STYLE_CYCLE_MODES");
        const QByteArrayList modes =
            selection.isEmpty()
                ? QByteArrayList{"still",    "classic",  "cadenza", "partita", "tilt",
                                 "claddagh", "cappella", "pendolo", "fume",    "tempera",
                                 "lumiere",  "sonnet",   "monet",   "diorama", "metaphor",
                                 "hanabi",   "nebbia",   "machi",   "fume",    "nebbia",
                                 "lumiere",  "hanabi"}
                : selection.split(',');
        for (const auto &next : modes) {
            mode = QString::fromLatin1(next);
            QElapsedTimer switching;
            switching.start();
            auditPhase = "style-" + mode;
            auditPhaseTime.restart();
            qInfo() << "Style request" << mode;
            auditGaps.clear();
            auditStalls = {};
            qint64 constructed = -1, retired = -1, feedback = -1, feedbackFrame = -1;
            auto *initialStage = visual(window->contentItem(), "foliaVisualizerStage");
            QPointer<QObject> previous =
                initialStage ? nativeObject(initialStage->property("renderer")) : nullptr;
            const bool hadPrevious = !previous.isNull();
            QTimer observer;
            observer.setInterval(4);
            QObject::connect(&observer, &QTimer::timeout, window, [&] {
                auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
                auto *cover = visual(window->contentItem(), "foliaStyleSwitchCover");
                if (cover && cover->isVisible() && cover->opacity() > .03 && feedback < 0) {
                    if (feedbackFrame < 0)
                        feedbackFrame = session.frameCount;
                    else if (session.frameCount > feedbackFrame)
                        feedback = switching.elapsed();
                }
                if (hadPrevious && !previous && retired < 0)
                    retired = switching.elapsed();
                if (stage && stage->property("loadedMode").toString() == mode &&
                    nativeObject(stage->property("renderer")) && constructed < 0)
                    constructed = switching.elapsed();
            });
            observer.start();
            QVERIFY(entry->configuration()->patch({{"mode", mode}}));
            QVERIFY(awaitEvent([&] { return !entry->configuration()->busy(); }, 10000));
            const auto committed = switching.elapsed();
            const bool rendered = awaitReadyFrame(30000);
            const auto first = switching.elapsed();
            runEventLoop(1500);
            observer.stop();
            auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
            const auto error = stage ? presentationError(stage) : QString("No stage");
            results.append(QJsonObject{{"mode", mode},
                                       {"ready", rendered},
                                       {"firstFrameMs", first},
                                       {"configurationCommittedMs", committed},
                                       {"feedbackFrameMs", feedback},
                                       {"rendererConstructedMs", constructed},
                                       {"previousDestroyedMs", retired},
                                       {"guiHeartbeatGaps", distribution(auditGaps)},
                                       {"guiStalls", auditStalls},
                                       {"error", error},
                                       {"resources", presentationResources(window)},
                                       {"memory", memory()}});
            qInfo() << "Style cycle" << mode << rendered << first << error.left(160);
            passed = passed && rendered && error.isEmpty();
            QFile evidence(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/style-cycle.json");
            QVERIFY(evidence.open(QIODevice::WriteOnly));
            evidence.write(QJsonDocument(results).toJson());
        }
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        QVERIFY(
            awaitEvent([&] { return !visual(window->contentItem(), "foliaPlaybackPage"); }, 10000));
        QCOMPARE(presentationResources(window)["glyphRunCount"].toInt(), 0);
        QVERIFY(passed);
        QVERIFY(!window->handle());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_FUME_PIXELS") ||
        qEnvironmentVariableIsSet("FOLIA_TEST_STYLE_PIXELS")) {
        host.playback.pause();
        QVERIFY(awaitEvent([&] { return !host.playback.playing(); }, 5000));
        auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
        auto *background = visual(skin, "foliaBackgroundHost");
        if (background)
            background->setVisible(false);
        auto *stage = visual(skin, "foliaVisualizerStage");
        auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
        QVERIFY(renderer);
        renderer->setProperty("paused", true);
        renderer->setProperty("motionEnabled", false);
        for (double time : {14.5, 16.01, 17.0, 20.25}) {
            const int index = int(time / 4);
            host.playback.seek(qRound64(time * 1000));
            QVERIFY(awaitEvent(
                [&] { return std::abs(host.playback.positionMs() - qRound64(time * 1000)) < 50; },
                10000));
            renderer->setProperty("timeSeconds", time);
            renderer->setProperty("currentIndex", index);
            if (mode == "fume") {
                auto state = renderer->property("_cameraState").value<QJSValue>();
                auto retarget = state.property("retarget");
                retarget.setProperty("sourceLineIndex", index);
                retarget.setProperty("startedAt", -1000);
                retarget.setProperty("bridgeMode", "none");
                auto camera = state.property("camera");
                auto block = renderer->property("article")
                                 .value<QJSValue>()
                                 .property("chronologicalBlocks")
                                 .property(index);
                camera.setProperty("x", block.property("x").toNumber());
                camera.setProperty("y", block.property("y").toNumber());
                camera.setProperty("scale", 1.);
                camera.setProperty("velocityX", 0.);
                camera.setProperty("velocityY", 0.);
                camera.setProperty("velocityScale", 0.);
                for (int i = 0; i < 360; ++i)
                    QVERIFY(QMetaObject::invokeMethod(renderer, "draw", Q_ARG(double, 1. / 60)));
            }
            QVERIFY2(awaitReadyFrame(30000), qPrintable(presentationError(renderer)));
            if (mode == "lumiere" || mode == "hanabi") {
                // The ready image may precede a just-issued seek/settings
                // request. Observe explicitly requested worker frames before
                // comparing a frozen pose, rather than capturing its predecessor.
                for (int i = 0; i < 2; ++i) {
                    const auto previous = renderer->property("workerFrameRevision").toLongLong();
                    QVERIFY(QMetaObject::invokeMethod(renderer, "requestFrame"));
                    QVERIFY(awaitEvent(
                        [&] {
                            return renderer->property("workerFrameRevision").toLongLong() >
                                   previous;
                        },
                        30000));
                    QVERIFY2(awaitReadyFrame(30000), qPrintable(presentationError(renderer)));
                }
            }
            runEventLoop(800);
            QVERIFY2(awaitReadyFrame(30000), qPrintable(presentationError(renderer)));
            QRhiReadbackResult pixels;
            session.frame(&pixels);
            QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()),
                         pixels.pixelSize.width(), pixels.pixelSize.height(),
                         QImage::Format_RGBA8888);
            QVERIFY(image.copy().save(qEnvironmentVariable("FOLIA_CAPTURE_DIR") +
                                      QString("/foreground-%1.png").arg(qRound(time * 1000))));
        }
        QVERIFY(!window->handle());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_STUDIO_LATENCY")) {
        auto *context = host.runtime.context(installation);
        QJsonArray cycles;
        for (int cycle = 0; cycle < 2; ++cycle) {
            auditPhase = "studio-open";
            QElapsedTimer elapsed;
            elapsed.start();
            auto *operation = context->executeCommand("folia.studio.open", {});
            QPointer<QObject> dialog;
            QVERIFY(awaitEvent(
                [&] {
                    for (auto *child : context->children())
                        if (child->inherits("EchoMusic::EchoPluginDialog") &&
                            child->property("active").toBool())
                            for (auto *owner : child->children()) {
                                auto *popup = nativeObject(owner->property("popup"));
                                auto *shell =
                                    popup ? nativeObject(popup->property("item")) : nullptr;
                                if (shell && shell->property("visible").toBool()) {
                                    dialog = child;
                                    return true;
                                }
                            }
                    return false;
                },
                10000));
            const auto shellMs = elapsed.elapsed();
            QVERIFY(awaitEvent([&] { return operation->finished(); }, 30000));
            const auto bodyMs = elapsed.elapsed();
            QCOMPARE(operation->state(), EchoPluginOperation::Succeeded);
            auto *preview = visual(window->contentItem(), "foliaStudioPreview");
            QVERIFY(preview);
            QVERIFY2(awaitEvent([&] { return preview->property("renderReady").toBool(); }, 30000),
                     qPrintable(preview->property("errorString").toString()));
            const auto previewMs = elapsed.elapsed();
            QVERIFY(dialog);
            auditPhase = "studio-close";
            elapsed.restart();
            QVERIFY(QMetaObject::invokeMethod(dialog, "close"));
            const auto closeCallMs = elapsed.elapsed();
            QVERIFY(awaitEvent([&] { return !context->ui()->state()["foliaStudioOpen"].toBool(); },
                               15000));
            const auto closedMs = elapsed.elapsed();
            QVERIFY(awaitReadyFrame(30000));
            cycles.append(QJsonObject{{"shellMs", shellMs},
                                      {"bodyMs", bodyMs},
                                      {"previewMs", previewMs},
                                      {"closeCallMs", closeCallMs},
                                      {"closedMs", closedMs},
                                      {"mainReadyMs", elapsed.elapsed()}});
        }
        QFile file(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/studio-latency.json");
        QVERIFY(file.open(QIODevice::WriteOnly));
        file.write(QJsonDocument(QJsonObject{{"cycles", cycles},
                                             {"heartbeat", distribution(auditGaps)},
                                             {"stalls", auditStalls}})
                       .toJson());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_DIALOG_REENTRY")) {
        auto *context = host.runtime.context(installation);
        int pendingCloses = 0;
        for (int cycle = 0; cycle < 4; ++cycle) {
            auto *first = context->executeCommand("folia.studio.open", {});
            auto *second = context->executeCommand("folia.studio.open", {});
            QPointer<QObject> dialog;
            QVERIFY(awaitEvent(
                [&] {
                    for (auto *child : context->children())
                        if (child->inherits("EchoMusic::EchoPluginDialog") &&
                            child->property("active").toBool()) {
                            for (auto *owner : child->children()) {
                                auto *popup = nativeObject(owner->property("popup"));
                                auto *shell =
                                    popup ? nativeObject(popup->property("item")) : nullptr;
                                if (shell && shell->property("visible").toBool()) {
                                    dialog = child;
                                    return true;
                                }
                            }
                        }
                    return false;
                },
                10000));
            pendingCloses += first->state() < EchoPluginOperation::Succeeded;
            QVERIFY(awaitEvent([&] { return second->finished(); }, 10000));
            QVERIFY(QMetaObject::invokeMethod(dialog, "close"));
            const bool finished =
                awaitEvent([&] { return first->finished() && second->finished(); }, 10000);
            if (!finished)
                qInfo() << "Studio unfinished" << cycle << first->state() << second->state()
                        << (dialog ? dialog->property("active") : QVariant())
                        << context->ui()->state()["foliaStudioOpen"];
            QVERIFY(finished);
            QCOMPARE(first->state(), EchoPluginOperation::Succeeded);
            QCOMPARE(second->state(), EchoPluginOperation::Succeeded);
            QVERIFY(first->errorMessage().isEmpty());
            QVERIFY(second->errorMessage().isEmpty());
            qInfo() << "Studio reentry cycle" << cycle << "results" << first->result()
                    << second->result() << "dialog active"
                    << (dialog ? dialog->property("active") : QVariant()) << "studio flag"
                    << context->ui()->state()["foliaStudioOpen"];
            QVERIFY(awaitEvent([&] { return !context->ui()->state()["foliaStudioOpen"].toBool(); },
                               10000));
            QVERIFY(awaitReadyFrame(30000));
            auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
            QVERIFY(skin && skin->property("commandError").toString().isEmpty());
        }
        QVERIFY(pendingCloses > 0);
        auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
        auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
        QVERIFY(renderer);
        QVERIFY(renderer->setProperty("_budgetRejected", true));
        const QString diagnostic = "Canvas curve preparation exceeds the bounded native budget";
        QVERIFY(renderer->setProperty("_renderError", diagnostic));
        auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
        auto *failure = visual(skin, "foliaRenderError");
        QVERIFY(failure);
        QVERIFY(awaitEvent([&] { return failure->property("visible").toBool(); }, 5000));
        QCOMPARE(failure->property("detail").toString(), diagnostic);
        QVERIFY(!failure->property("message").toString().contains("Canvas"));
        auto *retry = visual(failure, "foliaRenderRetry");
        QVERIFY(retry);
        QVERIFY(QMetaObject::invokeMethod(retry, "clicked"));
        QVERIFY(awaitReadyFrame(30000));
        QVERIFY(skin->property("presentationError").toString().isEmpty());
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        QVERIFY(
            awaitEvent([&] { return !visual(window->contentItem(), "foliaPlaybackPage"); }, 10000));
        QCOMPARE(presentationResources(window)["glyphRunCount"].toInt(), 0);
        QVERIFY(!window->handle());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_GLYPH_RESTART")) {
        QTest::failOnWarning(QRegularExpression("No QSGTexture provided"));
        auto *toggle = visual(window->contentItem(), "foliaCapsulePlayToggle");
        QVERIFY(toggle);
        for (int cycle = 0; cycle < 12; ++cycle) {
            QVERIFY(QMetaObject::invokeMethod(toggle, "clicked"));
            runEventLoop(70);
            session.frame();
        }
        host.playback.pause();
        QVERIFY(awaitEvent([&] { return !host.playback.playing(); }, 5000));
        host.theme.setMotionEnabled(false);
        // Finish the transport color transition already started by pause.
        runEventLoop(750);
        session.frame();
        const auto capture = [&] {
            QRhiReadbackResult pixels;
            session.frame(&pixels);
            return QImage(reinterpret_cast<const uchar *>(pixels.data.constData()),
                          pixels.pixelSize.width(), pixels.pixelSize.height(),
                          QImage::Format_RGBA8888)
                .copy();
        };
        const auto reference = capture();
        QVERIFY(!reference.isNull());
        const auto folder = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
        QDir().mkpath(folder);
        QVERIFY(reference.save(folder + "/before-restart.png"));
        for (int cycle = 0; cycle < 3; ++cycle) {
            QVERIFY(
                QMetaObject::invokeMethod(window, "sceneGraphAboutToStop", Qt::DirectConnection));
            runEventLoop(20);
            const auto restored = capture();
            QVERIFY(restored.save(folder + QString("/restart-%1.png").arg(cycle)));
            QCOMPARE(restored, reference);
        }
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !visual(window->contentItem(), "foliaPlaybackPage");
            },
            10000));
        QCOMPARE(presentationResources(window)["floatTextureCount"].toInt(), 0);
        QCOMPARE(presentationResources(window)["glyphRunCount"].toInt(), 0);
        QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
        QVERIFY(awaitReadyFrame(30000));
        QVERIFY(!window->handle());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_UI_ISSUES")) {
        const auto folder = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
        QDir().mkpath(folder);
        const bool fixed = qEnvironmentVariableIsSet("FOLIA_UI_EXPECT_FIXED");
        QJsonObject report;
        auto *folia = visual(window->contentItem(), "foliaPlaybackPage");
        QVERIFY(folia);
        QVERIFY(folia->setProperty("timelineOpen", true));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return visual(folia, "foliaLyricsTimeline") != nullptr;
            },
            5000));
        auto *timeline = visual(folia, "foliaLyricsTimeline");
        QVERIFY(timeline);
        auto *close = visual(folia, "foliaTimelineClose");
        QVERIFY(close);
        report["closeTooltip"] = close->property("tooltipText").toString();
        int peak = 0, last = 0;
        for (int n = 0; n < 30; ++n) {
            runEventLoop(16);
            QRhiReadbackResult pixels;
            session.frame(&pixels);
            QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()),
                         pixels.pixelSize.width(), pixels.pixelSize.height(),
                         QImage::Format_RGBA8888);
            const auto sample =
                image.copy(timeline->mapRectToScene(timeline->boundingRect()).toAlignedRect())
                    .convertToFormat(QImage::Format_ARGB32);
            last = 0;
            for (int y = 0; y < sample.height(); y += 2)
                for (int x = 0; x < sample.width(); x += 2) {
                    const auto c = sample.pixel(x, y);
                    last += qRed(c) > 100 && qBlue(c) > 100 && qGreen(c) < 65;
                }
            peak = std::max(last, peak);
            if (n == 29)
                QVERIFY(image.copy().save(folder + "/timeline.png"));
        }
        report["magentaSamplesPeak"] = peak;
        report["magentaSamplesLast"] = last;
        QVERIFY(QMetaObject::invokeMethod(close, "clicked"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !visual(folia, "foliaLyricsTimeline");
            },
            5000));
        auto *shared = visual(folia, "foliaSharedCapsule");
        QVERIFY(shared);
        const auto surfaceMagenta = [&](QQuickItem *surface, const QString &name) {
            int peak = 0;
            for (int frame = 0; frame < 20; ++frame) {
                runEventLoop(16);
                QRhiReadbackResult pixels;
                session.frame(&pixels);
                if (pixels.data.isEmpty())
                    return -1;
                QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()),
                             pixels.pixelSize.width(), pixels.pixelSize.height(),
                             QImage::Format_RGBA8888);
                const auto sample =
                    image.copy(surface->mapRectToScene(surface->boundingRect()).toAlignedRect())
                        .convertToFormat(QImage::Format_ARGB32);
                int count = 0;
                for (int y = 0; y < sample.height(); y += 2)
                    for (int x = 0; x < sample.width(); x += 2) {
                        const auto c = sample.pixel(x, y);
                        count += qRed(c) > 100 && qBlue(c) > 100 && qGreen(c) < 65;
                    }
                peak = std::max(peak, count);
                if (frame == 19)
                    image.copy().save(folder + "/" + name + ".png");
            }
            return peak;
        };
        QVERIFY(shared->setProperty("modalAction", "volume"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return visual(folia, "foliaCapsulePanel");
            },
            5000));
        const auto volumeMagenta = surfaceMagenta(visual(folia, "foliaCapsulePanel"), "volume");
        report["volumeMagentaPeak"] = volumeMagenta;
        auto *volumeClose = visual(folia, "foliaCapsulePanelClose");
        QVERIFY(volumeClose);
        if (fixed)
            QVERIFY(volumeClose->property("tooltipText").toString().isEmpty());
        QVERIFY(QMetaObject::invokeMethod(volumeClose, "clicked"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !visual(folia, "foliaCapsulePanel");
            },
            5000));
        bool started = false;
        QVERIFY(QMetaObject::invokeMethod(shared, "startPositioning", Q_RETURN_ARG(bool, started)));
        QVERIFY(started);
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return visual(folia, "foliaCapsulePositionHint");
            },
            5000));
        const auto positionMagenta =
            surfaceMagenta(visual(folia, "foliaCapsulePositionHint"), "position");
        report["positionMagentaPeak"] = positionMagenta;
        QVERIFY(QMetaObject::invokeMethod(shared, "cancelPositioning"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !visual(folia, "foliaCapsulePositionHint");
            },
            5000));
        if (fixed) {
            QVERIFY(volumeMagenta >= 0 && volumeMagenta < 100);
            QVERIFY(positionMagenta >= 0 && positionMagenta < 100);
        }
        auto *picker = visual(folia, "foliaStylePicker");
        QVERIFY(picker);
        QVERIFY(QMetaObject::invokeMethod(picker, "clicked"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return visual(window->contentItem(), "foliaStyleStudio");
            },
            10000));
        auto *studio = visual(window->contentItem(), "foliaStyleStudio");
        auto *preview = visual(studio, "foliaStudioPreview");
        QVERIFY(preview);
        QVERIFY2(awaitEvent(
                     [&] {
                         session.frame();
                         return preview->property("renderReady").toBool();
                     },
                     30000),
                 qPrintable(preview->property("errorString").toString()));
        auto *tabs = visual(studio, "foliaStudioTabs");
        QVERIFY(tabs);
        QVERIFY(QMetaObject::invokeMethod(tabs, "picked", Q_ARG(int, 2)));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return visual(studio, "foliaFontStyleSans");
            },
            10000));
        runEventLoop(200);
        session.frame();
        QJsonArray centers;
        for (const auto &key : {"Sans", "Serif", "Mono", "Custom"}) {
            auto *tile = visual(studio, QString("foliaFontStyle") + key);
            QVERIFY(tile);
            qreal low = 1e6, high = -1e6;
            for (auto *child : presentationObjects(tile)) {
                auto *text = qobject_cast<QQuickItem *>(child);
                if (!text ||
                    !QString::fromLatin1(text->metaObject()->className()).startsWith("QQuickText"))
                    continue;
                const auto bounds = text->mapRectToItem(tile, text->boundingRect());
                low = std::min(low, bounds.top());
                high = std::max(high, bounds.bottom());
            }
            const auto delta = (low + high) / 2 - tile->height() / 2;
            centers.append(delta);
            if (fixed)
                QVERIFY2(std::abs(delta) < .51,
                         qPrintable(QString("Tile %1 center delta %2").arg(key).arg(delta)));
        }
        report["fontTileCenterDeltas"] = centers;
        QRhiReadbackResult pixels;
        session.frame(&pixels);
        QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()),
                     pixels.pixelSize.width(), pixels.pixelSize.height(), QImage::Format_RGBA8888);
        QVERIFY(image.copy().save(folder + "/fonts.png"));
        auto *dialog = nativeObject(studio->property("dialog"));
        QVERIFY(dialog);
        QVERIFY(QMetaObject::invokeMethod(dialog, "close"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !visual(window->contentItem(), "foliaStyleStudio");
            },
            10000));
        auto *skinPicker = visual(folia, "foliaSkinPicker");
        report["skinPickerAvailable"] = skinPicker != nullptr;
        auto *sourceAction = visual(window->contentItem(), "lyricSourceAction");
        QVERIFY(sourceAction && skinPicker);
        const auto hostRight = sourceAction->mapRectToScene(sourceAction->boundingRect()).right();
        for (auto *action : {picker, skinPicker}) {
            QCOMPARE(action->size(), sourceAction->size());
            QCOMPARE(action->property("glyphSize"), sourceAction->property("glyphSize"));
            QVERIFY(qAbs(action->mapRectToScene(action->boundingRect()).right() - hostRight) < .01);
            auto *colors = nativeObject(action->property("colors"));
            auto *hostColors = nativeObject(sourceAction->property("colors"));
            QVERIFY(colors && hostColors);
            for (const auto *field : {"text", "tone", "mutedSurface", "hover", "neutralPressed"})
                QCOMPARE(colors->property(field), hostColors->property(field));
        }
        QTest::mouseMove(
            window,
            sourceAction->mapToScene(QPointF(sourceAction->width() / 2, sourceAction->height() / 2))
                .toPoint());
        runEventLoop(250);
        QRhiReadbackResult toolsPixels;
        session.frame(&toolsPixels);
        QImage toolsImage(reinterpret_cast<const uchar *>(toolsPixels.data.constData()),
                          toolsPixels.pixelSize.width(), toolsPixels.pixelSize.height(),
                          QImage::Format_RGBA8888);
        QVERIFY(toolsImage.copy().save(folder + "/tools.png"));

        if (skinPicker) {
            const auto pickPoint =
                skinPicker->mapToScene(QPointF(skinPicker->width() / 2, skinPicker->height() / 2))
                    .toPoint();
            QTest::mouseMove(window, pickPoint);
            runEventLoop(100);
            session.frame();
            QVERIFY(skinPicker->isVisible() && skinPicker->isEnabled());
            QTest::mouseClick(window, Qt::LeftButton, Qt::NoModifier, pickPoint);
            QVERIFY(awaitEvent(
                [&] {
                    session.frame();
                    return visual(window->contentItem(), "simpleLyricSkinCard");
                },
                10000));
            auto *simple = visual(window->contentItem(), "simpleLyricSkinCard");
            QVERIFY(simple);
            QTest::mouseClick(
                window, Qt::LeftButton, Qt::NoModifier,
                simple->mapToScene(QPointF(simple->width() / 2, simple->height() / 2)).toPoint());
            QVERIFY(awaitEvent(
                [&] {
                    session.frame();
                    return host.theme.extensions()->selectedSkin() == "lyric" &&
                           !visual(window->contentItem(), "foliaPlaybackPage");
                },
                10000));
            auto *drawer = window->contentItem()->findChild<QObject *>("lyricSkinDrawer");
            if (drawer)
                QVERIFY(QMetaObject::invokeMethod(drawer, "close"));
            QVERIFY(host.runtime.context(installation)->appearance()->useSkin("folia"));
            QVERIFY(awaitReadyFrame(30000));
        } else if (fixed)
            QFAIL("No way to change the lyric skin");
        auto *pageObject = nativeObject(root->property("presentationPage"));
        QVERIFY(pageObject);
        auto *skinHost = visual(window->contentItem(), "pluginPlaybackSkinHost");
        QVERIFY(skinHost);
        QElapsedTimer closing;
        closing.start();
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        report["closeCallMs"] = closing.elapsed();
        QJsonArray frames;
        bool firstChange = false;
        while (closing.elapsed() < 2000 && pageObject->property("visible").toBool()) {
            runEventLoop(12);
            session.frame();
            const auto alpha = skinHost->opacity();
            frames.append(QJsonObject{{"ms", closing.elapsed()}, {"opacity", alpha}});
            if (alpha < .99 && !firstChange) {
                report["firstFadeMs"] = closing.elapsed();
                firstChange = true;
            }
        }
        QVERIFY(!pageObject->property("visible").toBool());
        report["closedMs"] = closing.elapsed();
        report["closeFrames"] = frames;
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !visual(window->contentItem(), "foliaPlaybackPage");
            },
            10000));
        QCOMPARE(presentationResources(window)["floatTextureCount"].toInt(), 0);
        QCOMPARE(presentationResources(window)["glyphRunCount"].toInt(), 0);
        QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
        QVERIFY(awaitReadyFrame(30000));
        for (int cycle = 0; cycle < 2; ++cycle) {
            QPointer<QQuickItem> previous = visual(window->contentItem(), "foliaPlaybackPage");
            QVERIFY(previous);
            QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
            runEventLoop(70);
            session.frame();
            QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
            QVERIFY(awaitReadyFrame(30000));
            QVERIFY(previous && visual(window->contentItem(), "foliaPlaybackPage") == previous);
        }
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        QVERIFY(awaitEvent(
            [&] {
                session.frame();
                return !pageObject->property("visible").toBool() &&
                       !visual(window->contentItem(), "foliaPlaybackPage");
            },
            10000));
        QCOMPARE(presentationResources(window)["floatTextureCount"].toInt(), 0);
        QCOMPARE(presentationResources(window)["glyphRunCount"].toInt(), 0);
        report["rapidReopens"] = 2;
        write(folder + "/ui-issues.json", QJsonDocument(report).toJson());
        if (fixed) {
            QVERIFY(peak < 100);
            QVERIFY(report["closeTooltip"].toString().isEmpty());
            QVERIFY(firstChange);
            QVERIFY(report["firstFadeMs"].toInt() < 150);
        }
        return;
    }
    QSignalSpy acknowledged(&host.playback, &PlaybackService::seekCompleted);
    if (qEnvironmentVariableIsSet("FOLIA_TEST_CACHE_UI")) {
        QVERIFY(mode == "fume" || mode == "hanabi");
        QJsonArray samples;
        for (const auto &source : {QString("builtin"), QString("live")}) {
            auto *picker = visual(window->contentItem(), "foliaStylePicker");
            QVERIFY(picker);
            QVERIFY(QMetaObject::invokeMethod(picker, "clicked"));
            QVERIFY(awaitEvent([&] { return visual(window->contentItem(), "foliaStyleStudio"); },
                               10000));
            auto *studio = visual(window->contentItem(), "foliaStyleStudio");
            auto *preview = visual(window->contentItem(), "foliaStudioPreview");
            QVERIFY(preview);
            QVERIFY(preview->setProperty("source", source));
            QVERIFY2(awaitEvent([&] { return preview->property("renderReady").toBool(); }, 60000),
                     qPrintable(preview->property("errorString").toString()));
            QVERIFY(!presentationResources(window)["hasDynamicStage"].toBool());
            auto *dialog = nativeObject(studio->property("dialog"));
            QVERIFY(dialog);
            QElapsedTimer restored;
            restored.start();
            QVERIFY(QMetaObject::invokeMethod(dialog, "close"));
            QVERIFY(awaitEvent([&] { return !visual(window->contentItem(), "foliaStyleStudio"); },
                               10000));
            QVERIFY(awaitReadyFrame(60000));
            QObject *preparation = nullptr;
            for (auto *object : presentationObjects(window->contentItem()))
                if (QString::fromLatin1(object->metaObject()->className())
                        .startsWith(mode == "fume" ? "FumeLayout" : "LumiereProgram")) {
                    preparation = object;
                    break;
                }
            QVERIFY(preparation);
            QCOMPARE(preparation->property("readBatches").toInt(), 0);
            samples.append(QJsonObject{
                {"preview", source}, {"restoredMs", restored.elapsed()}, {"readBatches", 0}});
        }
        write(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/cache-ui.json",
              QJsonDocument(QJsonObject{{"mode", mode}, {"samples", samples}}).toJson());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_CHROME")) {
        auto *picker = visual(window->contentItem(), "foliaStylePicker");
        auto *capsule = visual(window->contentItem(), "foliaPlayerCapsule");
        auto *shared = visual(window->contentItem(), "foliaSharedCapsule");
        QVERIFY(picker && capsule && shared);
        QCOMPARE(picker->size(), QSizeF(36, 36));
        auto *scene = visual(window->contentItem(), "foliaPresentationScene");
        QVERIFY(scene);
        QCOMPARE(nativeObject(shared->property("backdropSource")), static_cast<QObject *>(scene));
        // A stationary pointer must settle. Before this regression, the frost
        // sampled its own playback tree and filled most frames with magenta.
        const auto center =
            capsule->mapToScene(QPointF(capsule->width() / 2, capsule->height() / 2)).toPoint();
        for (int frame = 0; frame < 120; ++frame) {
            QTest::mouseMove(window, frame < 70 ? center : QPoint(10, 10));
            runEventLoop(30);
            QRhiReadbackResult pixels;
            session.frame(&pixels);
            QVERIFY(!pixels.data.isEmpty());
            const QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()),
                               pixels.pixelSize.width(), pixels.pixelSize.height(),
                               QImage::Format_RGBA8888);
            const auto box = capsule->mapRectToScene(capsule->boundingRect());
            const auto sample = image
                                    .copy(QRectF(box.x() * window->effectiveDevicePixelRatio(),
                                                 box.y() * window->effectiveDevicePixelRatio(),
                                                 box.width() * window->effectiveDevicePixelRatio(),
                                                 box.height() * window->effectiveDevicePixelRatio())
                                              .toAlignedRect())
                                    .convertToFormat(QImage::Format_ARGB32);
            if (frame == 60 || frame == 119)
                QVERIFY(image.copy().save(qEnvironmentVariable("FOLIA_CAPTURE_DIR") +
                                          QString("/capsule-%1.png").arg(frame)));
            int magenta = 0;
            for (int y = 0; y < sample.height(); ++y)
                for (int x = 0; x < sample.width(); ++x) {
                    const auto pixel = sample.pixel(x, y);
                    magenta += qRed(pixel) > 100 && qBlue(pixel) > 100 && qGreen(pixel) < 50;
                }
            QVERIFY2(
                magenta < 100,
                qPrintable(
                    QString("Magenta backdrop pixels at frame %1: %2").arg(frame).arg(magenta)));
            if (frame == 60)
                QVERIFY(shared->property("expanded").toBool());
            if (frame == 119)
                QVERIFY(!shared->property("expanded").toBool());
        }
        QVERIFY(capsule->metaObject()->indexOfProperty("sourceOrigin") >= 0);
        const auto origin = capsule->property("sourceOrigin").toPointF();
        const auto offset = shared->property("liveBottomOffset").toDouble();
        QVERIFY(entry->configuration()->patch({{"playerBottomBarOffset", offset + 32}}));
        QVERIFY(awaitEvent(
            [&] {
                return !entry->configuration()->busy() &&
                       qAbs(capsule->property("sourceOrigin").toPointF().y() - origin.y()) > 10;
            },
            5000));
        const auto moved = capsule->mapRectToItem(scene, capsule->boundingRect());
        QCOMPARE(capsule->property("sourceOrigin").toPointF().y(), moved.y() - 72);
        QVERIFY(entry->configuration()->patch({{"playerBottomBarOffset", offset}}));
        QVERIFY(awaitEvent([&] { return !entry->configuration()->busy(); }, 5000));
        QVERIFY(visual(shared, "foliaCapsuleBackdrop"));
        host.theme.setFloatingFrosted(false);
        QVERIFY(awaitEvent([&] { return !visual(shared, "foliaCapsuleBackdrop"); }, 5000));
        host.theme.setFloatingFrosted(true);
        QVERIFY(
            awaitEvent([&] { return visual(shared, "foliaCapsuleBackdrop") != nullptr; }, 5000));
        QVERIFY(QMetaObject::invokeMethod(picker, "clicked"));
        QVERIFY(awaitEvent(
            [&] { return visual(window->contentItem(), "foliaStyleStudio") != nullptr; }, 10000));
        runEventLoop(2000);
        auto *shelf = visual(window->contentItem(), "foliaStudioStyleShelf");
        QVERIFY(shelf);
        const auto cell = shelf->property("cellWidth").toDouble();
        QVERIFY(qAbs(shelf->property("cellHeight").toDouble() - ((cell - 8) * .625 + 8)) < .01);
        auto *choice = visual(window->contentItem(), "foliaStudioStyle-metaphor");
        QVERIFY(choice);
        QVERIFY(QMetaObject::invokeMethod(choice, "clicked"));
        QVERIFY(awaitEvent(
            [&] { return entry->configuration()->values().value("mode").toString() == "metaphor"; },
            10000));
        auto *preview = visual(window->contentItem(), "foliaStudioPreview");
        QVERIFY(preview);
        QVERIFY2(awaitEvent([&] { return preview->property("renderReady").toBool(); }, 30000),
                 qPrintable(preview->property("errorString").toString()));
        runEventLoop(300);
        QRhiReadbackResult pixels;
        session.frame(&pixels);
        QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()),
                     pixels.pixelSize.width(), pixels.pixelSize.height(), QImage::Format_RGBA8888);
        QVERIFY(image.copy().save(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/studio.png"));
        QVERIFY(!window->handle());
        return;
    }
    auditPhase = "seek-12000";
    host.playback.seek(12000);
    QVERIFY(awaitEvent(
        [&] {
            return acknowledged.count() > 0 && host.playback.playing() &&
                   !host.playback.loading() && std::abs(host.playback.positionMs() - 12000) < 1000;
        },
        10000));
    runEventLoop(2000);
    QVERIFY(awaitReadyFrame(30000));
    const auto framesBeforeCapture = session.frameCount;
    QVERIFY(awaitEvent([&] { return session.frameCount > framesBeforeCapture; }, 5000));
    QRhiReadbackResult pixels;
    session.frame(&pixels);
    QCOMPARE(pixels.pixelSize, session.texture->pixelSize());
    QVERIFY(!pixels.data.isEmpty());
    QImage image(reinterpret_cast<const uchar *>(pixels.data.constData()), pixels.pixelSize.width(),
                 pixels.pixelSize.height(), QImage::Format_RGBA8888);
    QVERIFY(image.copy().save(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/offscreen-" + mode +
                              ".png"));
    QVERIFY(!window->handle());
    if (qEnvironmentVariableIsSet("FOLIA_TEST_HANABI")) {
        QVERIFY(mode == "hanabi");
        int blanks = 0;
        const auto startPosition = host.playback.positionMs();
        QElapsedTimer duration;
        duration.start();
        for (int frame = 0; frame < 180; ++frame) {
            runEventLoop(30);
            QRhiReadbackResult result;
            session.frame(&result);
            QImage pixels(reinterpret_cast<const uchar *>(result.data.constData()),
                          result.pixelSize.width(), result.pixelSize.height(),
                          QImage::Format_RGBA8888);
            const auto rgb = pixels.convertToFormat(QImage::Format_ARGB32);
            int colored = 0;
            for (int y = rgb.height() / 8; y < rgb.height() * 7 / 8; y += 4)
                for (int x = rgb.width() / 16; x < rgb.width() * 15 / 16; x += 4) {
                    const auto pixel = rgb.pixel(x, y);
                    const int high = std::max({qRed(pixel), qGreen(pixel), qBlue(pixel)}),
                              low = std::min({qRed(pixel), qGreen(pixel), qBlue(pixel)});
                    colored += high > 70 && high - low > 30;
                }
            blanks += colored < 100;
            if (frame % 30 == 0)
                QVERIFY(pixels.copy().save(qEnvironmentVariable("FOLIA_CAPTURE_DIR") +
                                           QString("/continuity-%1.png").arg(frame)));
        }
        QCOMPARE(blanks, 0);
        QVERIFY(host.playback.positionMs() - startPosition > 4000);
        QJsonArray cycles;
        for (int cycle = 0; cycle < 3; ++cycle) {
            QElapsedTimer closing;
            closing.start();
            QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
            const auto invocation = closing.elapsed();
            QVERIFY(awaitEvent(
                [&] { return !presentationResources(window).value("hasDynamicStage").toBool(); },
                10000));
            const auto retired = closing.elapsed();
            QElapsedTimer opening;
            opening.start();
            QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
            QVERIFY2(awaitReadyFrame(60000),
                     qPrintable(presentationResources(window).value("error").toString()));
            cycles.append(QJsonObject{{"closeCallMs", invocation},
                                      {"retiredMs", retired},
                                      {"reopenReadyMs", opening.elapsed()}});
        }
        const auto program = [&]() -> QObject * {
            for (auto *object : presentationObjects(window->contentItem()))
                if (QString::fromLatin1(object->metaObject()->className())
                        .startsWith("LumiereProgram"))
                    return object;
            return nullptr;
        };
        QVERIFY(program());
        QCOMPARE(program()->property("readBatches").toInt(), 0);
        const auto oldSignature = program()->property("signature").toString();
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        QVERIFY(awaitEvent(
            [&] { return !presentationResources(window).value("hasDynamicStage").toBool(); },
            10000));
        auto changed = rows;
        auto first = changed[0].toObject();
        first["text"] = first["text"].toString() + " Cache invalidation";
        changed[0] = first;
        QVERIFY(host.playback.lyricText()->replace({{"lines", changed}}, track.id));
        QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
        QVERIFY(awaitReadyFrame(60000));
        QVERIFY(program());
        QVERIFY(program()->property("readBatches").toInt() > 0);
        QVERIFY(program()->property("signature").toString() != oldSignature);
        write(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/continuity.json",
              QJsonDocument(QJsonObject{{"initialPreparationMs", preparationMs},
                                        {"sampleMs", duration.elapsed()},
                                        {"blankFrames", blanks},
                                        {"cycles", cycles}})
                  .toJson());
        return;
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_EXPERIENCE")) {
        QJsonObject preparationDetails;
        auto *initialStage = visual(window->contentItem(), "foliaVisualizerStage");
        auto *initialRenderer =
            initialStage ? nativeObject(initialStage->property("renderer")) : nullptr;
        if (initialRenderer)
            for (const auto *key :
                 {"measurementBatches", "readBatches", "refinementRounds", "maxRequestedFontSize"})
                if (initialRenderer->property(key).isValid())
                    preparationDetails[key] =
                        QJsonValue::fromVariant(initialRenderer->property(key));
        const auto folder = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
        QJsonArray samples, cycles, seeks;
        const auto capture = [&](const QString &name) {
            QRhiReadbackResult result;
            session.frame(&result);
            QImage pixels(reinterpret_cast<const uchar *>(result.data.constData()),
                          result.pixelSize.width(), result.pixelSize.height(),
                          QImage::Format_RGBA8888);
            return pixels.copy()
                .scaled(550, 410, Qt::KeepAspectRatio, Qt::SmoothTransformation)
                .save(folder + "/" + name + ".png");
        };
        QElapsedTimer duration;
        duration.start();
        auditPhase = "playing";
        int frame = 0;
        double peak = memory().value("footprintBytes").toDouble();
        while (duration.elapsed() < 12000) {
            runEventLoop(80);
            auto *stage = visual(window->contentItem(), "foliaVisualizerStage");
            auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
            QVERIFY(renderer);
            QVERIFY2(presentationError(renderer).isEmpty(),
                     qPrintable(presentationError(renderer)));
            QVERIFY(capture(QString("play-%1").arg(frame, 3, 10, QChar('0'))));
            QJsonValue renderState;
            if (mode == "lumiere") {
                auto wrapper = host.engine.newQObject(renderer);
                auto inspect = wrapper.property("inspect");
                if (inspect.isCallable())
                    renderState =
                        QJsonValue::fromVariant(inspect.callWithInstance(wrapper).toVariant());
            }
            samples.append(QJsonObject{{"elapsedMs", duration.elapsed()},
                                       {"positionMs", host.playback.positionMs()},
                                       {"ready", presentationContentReady(window, mode)},
                                       {"renderState", renderState},
                                       {"resources", presentationResources(window)}});
            peak = std::max(peak, memory().value("footprintBytes").toDouble());
            ++frame;
        }
        auditPhase = "pause";
        host.playback.pause();
        QVERIFY(awaitEvent([&] { return !host.playback.playing(); }, 5000));
        QVERIFY(capture("paused"));
        for (const int position : {41000, 14500}) {
            auditPhase = QString("seek-%1").arg(position);
            const auto old = acknowledged.count();
            QElapsedTimer seeking;
            seeking.start();
            host.playback.seek(position);
            QVERIFY(awaitEvent(
                [&] {
                    return acknowledged.count() > old &&
                           std::abs(host.playback.positionMs() - position) < 50;
                },
                10000));
            const bool ready = awaitReadyFrame(60000);
            seeks.append(QJsonObject{
                {"positionMs", position}, {"readyMs", seeking.elapsed()}, {"ready", ready}});
            QVERIFY2(ready, qPrintable(QString("Seek %1 failed for %2").arg(position).arg(mode)));
            QVERIFY(capture(QString("seek-%1").arg(position)));
            runEventLoop(500);
            QVERIFY(capture(QString("settled-seek-%1").arg(position)));
        }
        host.playback.play();
        QVERIFY(awaitEvent([&] { return host.playback.playing(); }, 10000));
        for (int cycle = 0; cycle < 3; ++cycle) {
            auditPhase = QString("close-%1").arg(cycle);
            QElapsedTimer closing;
            closing.start();
            QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
            const auto invocation = closing.elapsed();
            QVERIFY(awaitEvent(
                [&] { return !presentationResources(window).value("hasDynamicStage").toBool(); },
                15000));
            const auto retired = closing.elapsed();
            const auto resources = presentationResources(window);
            QCOMPARE(resources.value("floatTextureCount").toInt(), 0);
            QCOMPARE(resources.value("glyphRunCount").toInt(), 0);
            QCOMPARE(EchoMusic::GlyphStaticLayout::statistics().liveResults, qsizetype(0));
            QVERIFY(capture(QString("closed-%1").arg(cycle)));
            auditPhase = QString("reopen-%1").arg(cycle);
            QElapsedTimer opening;
            opening.start();
            QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
            const bool ready = awaitReadyFrame(60000);
            cycles.append(QJsonObject{{"closeCallMs", invocation},
                                      {"retiredMs", retired},
                                      {"readyMs", opening.elapsed()},
                                      {"ready", ready},
                                      {"retiredResources", resources},
                                      {"memory", memory()}});
            if (!ready) {
                capture(QString("failed-reopen-%1").arg(cycle));
                qInfo() << "REOPEN_STATE" << presentationResources(window);
                for (auto *object : presentationObjects(window->contentItem())) {
                    const auto error = presentationError(object);
                    if (!error.isEmpty())
                        qInfo() << "REOPEN_ERROR" << object->metaObject()->className()
                                << object->objectName() << error;
                    if (QString::fromLatin1(object->metaObject()->className())
                            .startsWith("Diorama"))
                        qInfo() << "DIORAMA_STATE" << object->metaObject()->className()
                                << object->property("busy") << object->property("paragraphCount")
                                << object->property("resourceCount")
                                << object->property("errorString");
                }
            }
            QVERIFY2(ready, qPrintable(QString("Reopen %1 failed for %2").arg(cycle).arg(mode)));
            QVERIFY(capture(QString("reopen-%1").arg(cycle)));
            runEventLoop(500);
            QVERIFY(capture(QString("settled-reopen-%1").arg(cycle)));
        }
        auditHeartbeat.stop();
        write(folder + "/experience.json",
              QJsonDocument(QJsonObject{{"mode", mode},
                                        {"measurement", "offscreen-metal"},
                                        {"nativeWindowCreated", window->handle() != nullptr},
                                        {"initialPreparationMs", preparationMs},
                                        {"preparationDetails", preparationDetails},
                                        {"sampleMs", duration.elapsed()},
                                        {"peakFootprintBytes", peak},
                                        {"heartbeat", distribution(auditGaps)},
                                        {"stalls", auditStalls},
                                        {"samples", samples},
                                        {"seeks", seeks},
                                        {"cycles", cycles}})
                  .toJson());
        return;
    }
    const auto before = memory();
    const auto resourcesBefore = presentationResources(window);
    SampleIdentity identity(window, mode);
    identity.checkContent(host.playback, track.id);
    QVERIFY2(identity.failures.isEmpty(), qPrintable(identity.failures.join(';')));
    QJsonObject sampledPeak = before;
    QMap<QString, QVector<double>> workerTimings, presentationTimings;
    qint64 workerRevision =
        identity.renderer ? identity.renderer->property("workerFrameRevision").toLongLong() : 0;
    qint64 presentationRevision =
        identity.renderer ? identity.renderer->property("presentationTimingRevision").toLongLong()
                          : 0;
    const auto workerStart = workerRevision;
    QTimer observer;
    observer.setInterval(100);
    QObject::connect(&observer, &QTimer::timeout, &session.window, [&] {
        identity.checkContent(host.playback, track.id);
        if (window->handle() && !identity.failures.contains("Native window created"))
            identity.failures.append("Native window created");
        const auto current = memory();
        for (auto it = current.begin(); it != current.end(); ++it)
            sampledPeak[it.key()] =
                std::max(sampledPeak[it.key()].toDouble(), it.value().toDouble());
    });
    QTimer heartbeat;
    heartbeat.setTimerType(Qt::PreciseTimer);
    heartbeat.setInterval(4);
    QElapsedTimer heartbeatClock;
    heartbeatClock.start();
    QVector<double> heartbeatGaps;
    QObject::connect(&heartbeat, &QTimer::timeout, &session.window, [&] {
        heartbeatGaps.append(heartbeatClock.nsecsElapsed() / 1e6);
        heartbeatClock.restart();
        const auto observeTiming = [&](const char *revisionKey, const char *valueKey,
                                       qint64 &previous, QMap<QString, QVector<double>> &samples) {
            if (!identity.renderer)
                return;
            const auto revision = identity.renderer->property(revisionKey).toLongLong();
            if (revision == previous)
                return;
            previous = revision;
            const auto timing = identity.renderer->property(valueKey);
            const auto values = timing.metaType() == QMetaType::fromType<QJSValue>()
                                    ? timing.value<QJSValue>().toVariant().toMap()
                                    : timing.toMap();
            for (auto it = values.cbegin(); it != values.cend(); ++it)
                samples[it.key()].append(it.value().toDouble());
        };
        observeTiming("workerFrameRevision", "workerFrameTiming", workerRevision, workerTimings);
        observeTiming("presentationTimingRevision", "presentationTiming", presentationRevision,
                      presentationTimings);
    });
    QElapsedTimer wall;
    wall.start();
    const auto cpuStart = cpuMs();
    const auto framesBefore = session.frameCount;
    const auto layoutsBefore = EchoMusic::GlyphStaticLayout::statistics();
    observer.start();
    heartbeat.start();
    session.collecting = true;
    qInfo() << "FOLIA_SAMPLE_BEGIN" << mode;
    runEventLoop(qBound(6000, qEnvironmentVariableIntValue("FOLIA_PERF_SAMPLE_MS"), 300000));
    session.collecting = false;
    observer.stop();
    heartbeat.stop();
    const auto wallMs = wall.elapsed();
    const auto cpuElapsed = cpuMs() - cpuStart;
    const auto completed = session.frameCount - framesBefore;
    const auto layoutsAfter = EchoMusic::GlyphStaticLayout::statistics();
    QVERIFY(completed > 2);
    // A busy RenderControl can keep submitting an unchanged scene. Animated
    // worker styles must advance their own scene, not just the window counter.
    if (mode == "lumiere" || mode == "hanabi" || mode == "machi")
        QVERIFY2(workerRevision - workerStart > wallMs / 200,
                 "Animated worker scene stopped advancing during sampling");
    QVERIFY(!window->handle());
    identity.checkContent(host.playback, track.id);
    QVERIFY2(identity.failures.isEmpty(), qPrintable(identity.failures.join(';')));
    QVERIFY(host.playback.playing());
    QCOMPARE(host.playback.trackId(), track.id);
    QVERIFY(host.playback.errorMessage().isEmpty());
    const auto activeMemory = memory();
    const auto resourcesAfter = presentationResources(window);
    if (qEnvironmentVariableIsSet("FOLIA_TEST_GLYPH_INPUTS")) {
        QMap<QByteArray, QList<QObject *>> groups;
        for (auto *object : presentationObjects(window->contentItem())) {
            auto *glyph = qobject_cast<GlyphRun *>(object);
            if (!glyph || glyph->measurementOnly() || glyph->runs().isEmpty() ||
                !glyph->isVisible())
                continue;
            QByteArray key;
            QDataStream stream(&key, QIODevice::WriteOnly);
            stream << glyph->font() << glyph->runs()
                   << glyph->window()->effectiveDevicePixelRatio();
            groups[key].append(glyph);
        }
        QJsonArray inputs;
        for (auto it = groups.cbegin(); it != groups.cend(); ++it) {
            qint64 bytes = 0;
            for (auto *object : it.value())
                bytes += object->property("cacheBytes").toLongLong();
            inputs.append(QJsonObject{{"identicalLiveInputs", it.value().size()},
                                      {"reportedCacheBytes", double(bytes)}});
        }
        write(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/glyph-inputs.json",
              QJsonDocument(inputs).toJson());
    }
    QJsonArray sourceCanvasWork;
    if (identity.renderer) {
        const auto packet = identity.renderer->property("_recording").value<QJSValue>();
        const auto events = packet.property("events");
        for (quint32 i = 0; i < events.property("length").toUInt(); ++i) {
            const auto event = events.property(i);
            if (event.property("kind").toString() != "canvas")
                continue;
            const auto commands = event.property("commands");
            int shadows = 0, text = 0;
            double maximumBlur = 0;
            for (quint32 j = 0; j < commands.property("length").toUInt(); ++j) {
                const auto command = commands.property(j);
                const auto blur = command.property("style").property("shadowBlur").toNumber();
                text += command.property("kind").toString() == "text";
                shadows += std::isfinite(blur) && blur > 0;
                if (std::isfinite(blur))
                    maximumBlur = std::max(maximumBlur, blur);
            }
            sourceCanvasWork.append(QJsonObject{{"width", event.property("width").toInt()},
                                                {"height", event.property("height").toInt()},
                                                {"version", event.property("version").toInt()},
                                                {"commands", commands.property("length").toInt()},
                                                {"textCommands", text},
                                                {"shadowCommands", shadows},
                                                {"maximumBlur", maximumBlur}});
        }
    }
    QVERIFY(awaitReadyFrame(30000));
    window->setVisible(false);
    runEventLoop(1000);
    const auto hiddenMemory = memory();
    const auto hiddenResources = presentationResources(window);
    const auto layoutsHidden = EchoMusic::GlyphStaticLayout::statistics();
    QCOMPARE(layoutsHidden.liveResults, qsizetype(0));
    QVERIFY(!hiddenResources["hasDynamicStage"].toBool());
    QCOMPARE(hiddenResources["skinRunningFrameAnimationCount"].toInt(), 0);
    const auto hiddenCpuStart = cpuMs();
    runEventLoop(2000);
    const auto hiddenCpu = cpuMs() - hiddenCpuStart;
    QJsonArray cycles;
    for (int cycle = 0; cycle < qBound(0, qEnvironmentVariableIntValue("FOLIA_PERF_CYCLES"), 10);
         ++cycle) {
        auto next = track;
        next.id += QString("-cycle-%1").arg(cycle);
        host.playback.playTracks({next}, 0, "Authored benchmark", "folia-benchmark");
        QVERIFY(
            awaitEvent([&] { return host.playback.playing() && !host.playback.loading(); }, 10000));
        QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, next.id));
        window->setVisible(true);
        QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
        QVERIFY(awaitReadyFrame(60000));
        const auto activeCycleResources = presentationResources(window);
        const auto activeCycleMemory = memory();
        QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
        window->setVisible(false);
        runEventLoop(1000);
        const auto retired = presentationResources(window);
        QVERIFY(!retired["hasDynamicStage"].toBool());
        QCOMPARE(retired["skinRunningFrameAnimationCount"].toInt(), 0);
        QVERIFY(!window->handle());
        cycles.append(QJsonObject{{"cycle", cycle + 1},
                                  {"activeMemory", activeCycleMemory},
                                  {"activeResources", activeCycleResources},
                                  {"retiredMemory", memory()},
                                  {"retiredResources", retired}});
    }
    QJsonObject workerReport, presentationReport;
    for (auto it = workerTimings.cbegin(); it != workerTimings.cend(); ++it) {
        auto values = distribution(it.value());
        if (it.key() == "payloadBytes")
            for (const auto &key : {"maximum", "median", "p95", "p99"})
                values[QString(key) + "Bytes"] = values.take(QString(key) + "Ms");
        workerReport[it.key()] = values;
    }
    for (auto it = presentationTimings.cbegin(); it != presentationTimings.cend(); ++it) {
        auto values = distribution(it.value());
        if (!it.key().endsWith("Ms"))
            for (const auto &key : {"maximum", "median", "p95", "p99"})
                values[QString(key) + "Count"] = values.take(QString(key) + "Ms");
        presentationReport[it.key()] = values;
    }
    const QJsonObject result{
        {"mode", mode},
        {"measurement", "offscreen-metal"},
        {"nativeWindowCreated", false},
        {"qt", qVersion()},
        {"gpuDevice", QString::fromUtf8(session.control.rhi()->driverInfo().deviceName)},
        {"logicalWidth", window->width()},
        {"logicalHeight", window->height()},
        {"dpr", window->effectiveDevicePixelRatio()},
        {"primaryFont", font},
        {"initialPreparationMs", double(preparationMs)},
        {"wallMs", double(wallMs)},
        {"cpuMs", cpuElapsed},
        {"cpuPercentOneCore", cpuElapsed / wallMs * 100},
        {"completedOffscreenFrames", double(completed)},
        {"completedOffscreenFramesPerSecond", completed * 1000. / wallMs},
        {"completedFrameIntervals", distribution(session.completedIntervals)},
        {"renderWall", distribution(session.renderWall)},
        {"completedGpuDuration", distribution(session.gpuTimes)},
        {"gpuTimestampSupported", session.control.rhi()->isFeatureSupported(QRhi::Timestamps)},
        {"beforeSampling", before},
        {"sampledPeak", sampledPeak},
        {"workerTiming", workerReport},
        {"sourceCanvasWorkAtSampleEnd", sourceCanvasWork},
        {"presentationTiming", presentationReport},
        {"workerFrameRevisionDelta", double(workerRevision - workerStart)},
        {"staticGlyphLayouts",
         QJsonObject{{"hits", double(layoutsAfter.hits - layoutsBefore.hits)},
                     {"builds", double(layoutsAfter.builds - layoutsBefore.builds)},
                     {"liveResults", double(layoutsAfter.liveResults)},
                     {"hiddenLiveResults", double(layoutsHidden.liveResults)}}},
        {"guiHeartbeatGaps", distribution(heartbeatGaps)},
        {"validityChecks", identity.checks},
        {"validityFailures", QJsonArray{}},
        {"repeatedLogicalSessionCycles", cycles},
        {"hiddenCpuMsOver2s", hiddenCpu},
        {"activeEnd", activeMemory},
        {"hiddenAfter1s", hiddenMemory},
        {"activeResourcesBefore", resourcesBefore},
        {"activeResourcesAfter", resourcesAfter},
        {"hiddenResources", hiddenResources},
        {"scope", "Real installed plugin, production PlaybackPage, authored PCM "
                  "and 80 lyric rows. "
                  "Single-thread RenderControl with real wall-clock animation "
                  "paced at 60Hz; all frames "
                  "completed into a Metal texture. CPU includes the fixture, "
                  "audio and harness; not desktop "
                  "presentation FPS or OS visibility acceptance. Logical "
                  "offscreen session visibility "
                  "drives production resource lifetime; no native window or "
                  "application activation."}};
    write(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/offscreen-performance-" + mode + ".json",
          QJsonDocument(result).toJson(QJsonDocument::Indented));
    qInfo().noquote() << "FOLIA_OFFSCREEN_PERFORMANCE"
                      << QJsonDocument(result).toJson(QJsonDocument::Compact);
    host.playback.stop();
    root.reset();
}

void FoliaOffscreenTest::sonnetNativeSequenceDescriptor()
{
    const auto directory = qEnvironmentVariable("FOLIA_SONNET_DIR");
    QVERIFY(!directory.isEmpty());
    OffscreenSession session;
    QVERIFY(session.initialize({260, 130}, 2));
    QQmlEngine engine;
    QQmlComponent component(&engine, QUrl::fromLocalFile(directory + "/SonnetGlyphBatch.qml"));
    const QVariantMap run{{"key", "r0"},
                          {"text", "山河 ffi"},
                          {"size", 32.},
                          {"weight", 400},
                          {"spacing", 0},
                          {"strokeWidth", 0},
                          {"strokeBitmap", "fill"},
                          {"maxBlur", 0},
                          {"maxHaloRadius", 0}};
    const QVariantMap pose{{"key", "r0"},        {"x", 12},           {"y", 64},
                           {"scale", 1},         {"rotation", 0},     {"opacity", 1},
                           {"color", "#ffffff"}, {"tint", "#ffffff"}, {"halos", QVariantList{}}};
    const QVariantMap descriptor{{"family", "PingFang SC"},
                                 {"runs", QVariantList{run}},
                                 {"composition", "source-over"},
                                 {"poses", QVariantList{pose}}};
    std::unique_ptr<QObject> batch(
        component.createWithInitialProperties({{"width", 260},
                                               {"height", 130},
                                               {"baseFont", QFont("PingFang SC")},
                                               {"descriptor", descriptor}}));
    QVERIFY2(batch, qPrintable(component.errorString()));
    QVERIFY2(batch->property("errorString").toString().isEmpty(),
             qPrintable(batch->property("errorString").toString()));
    auto *item = qobject_cast<QQuickItem *>(batch.get());
    QVERIFY(item);
    item->setParentItem(session.window.contentItem());
    auto *glyph = batch->findChild<EchoMusic::GlyphRun *>();
    QVERIFY(glyph);
    QVERIFY(awaitEvent(
        [&] {
            return glyph->property("ready").toBool() &&
                   glyph->property("renderBatches").toInt() > 0;
        },
        10000));
    runEventLoop(50);
    QRhiReadbackResult first;
    session.frame(&first);
    QVERIFY(!first.data.isEmpty());
    bool painted = false;
    for (qsizetype i = 3; i < first.data.size(); i += 4)
        painted = painted || uchar(first.data[i]) > 0;
    QVERIFY(painted);
    {
        QQmlExpression same(QQmlEngine::contextForObject(batch.get()), batch.get(),
                            "updateFrame(JSON.parse(JSON.stringify(descriptor)))");
        same.evaluate();
        QVERIFY2(!same.hasError(), qPrintable(same.error().toString()));
    }
    QVERIFY(batch->property("errorString").toString().isEmpty());
    runEventLoop(50);
    QRhiReadbackResult second;
    session.frame(&second);
    QCOMPARE(first.pixelSize, second.pixelSize);
    QCOMPARE(first.data, second.data);
    {
        QQmlExpression bad(QQmlEngine::contextForObject(batch.get()), batch.get(),
                           "{ const value = JSON.parse(JSON.stringify(descriptor)); "
                           "value.runs[0].text = 'x'.repeat(8193); updateFrame(value); }");
        bad.evaluate();
        QVERIFY2(!bad.hasError(), qPrintable(bad.error().toString()));
    }
    QVERIFY(!batch->property("errorString").toString().isEmpty());
    QCOMPARE(glyph->runs().first().toMap().value("text").toString(), QString("山河 ffi"));
    batch.reset();
    runEventLoop(50);
    QVERIFY(!session.window.handle());
}

int main(int argc, char **argv)
{
    qputenv("QT_QPA_PLATFORM", "offscreen");
    qputenv("QT_QUICK_BACKEND", "rhi");
    qputenv("QSG_RHI_BACKEND", "metal");
    QQuickWindow::setSceneGraphBackend("rhi");
    QQuickWindow::setGraphicsApi(QSGRendererInterface::Metal);
    QGuiApplication app(argc, argv);
    FoliaOffscreenTest test;
    return QTest::qExec(&test, argc, argv);
}
#include "folia-offscreen.moc"
