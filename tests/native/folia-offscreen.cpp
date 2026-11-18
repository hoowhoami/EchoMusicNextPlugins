// No Cocoa windows or activation calls. Verify real Metal pixels before using
// this harness for any plugin cost measurement.
#include "folia-benchmark-support.h"
#include <QAbstractAnimation>
#include <QGuiApplication>
#include <QImage>
#include <QQmlComponent>
#include <QQmlEngine>
#include <QQuickGraphicsConfiguration>
#include <QQuickItem>
#include <QQuickRenderControl>
#include <QQuickRenderTarget>
#include <QQuickWindow>
#include <QtCore/private/qcore_mac_p.h>
#include <QtQuick/private/qquickwindow_p.h>
#include <QtTest>
#include <memory>
#include <rhi/qrhi.h>

class FoliaOffscreenTest : public QObject
{
    Q_OBJECT
private slots:
    void metalTexturePixels();
    void virtualPresentationState();
    void installedPlaybackPage();
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
    const auto mode = qEnvironmentVariable("FOLIA_PERF_MODE", "classic");
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
        QVERIFY(
            entry->configuration()->patch({{"mode", mode}, {"fontFamilies", QVariantList{font}}}));
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
Item {
    id: container
    width: 1100; height: 820
    required property PlaybackService playback
    readonly property alias presentationPage: page
    PlaybackPage { id: page; parent: container; playback: container.playback }
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
    QElapsedTimer auditBeat;
    if (qEnvironmentVariableIsSet("FOLIA_TEST_EXPERIENCE")) {
        auditBeat.start();
        auditHeartbeat.setInterval(4);
        QObject::connect(&auditHeartbeat, &QTimer::timeout, window, [&] {
            const auto gap = auditBeat.nsecsElapsed() / 1e6;
            auditGaps.append(gap);
            if (gap > 100)
                auditStalls.append(QJsonObject{{"phase", auditPhase}, {"gapMs", gap}});
            auditBeat.restart();
        });
        auditHeartbeat.start();
    }
    QElapsedTimer preparation;
    preparation.start();
    QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
    const auto ready = [&] { return presentationContentReady(window, mode); };
    const auto awaitReadyFrame = [&](int timeoutMs) {
        qint64 candidateFrame = -1;
        return awaitEvent(
            [&] {
                if (!ready()) {
                    candidateFrame = -1;
                    return false;
                }
                if (candidateFrame < 0)
                    candidateFrame = session.frameCount;
                return session.frameCount > candidateFrame;
            },
            timeoutMs);
    };
    const bool initialReady = awaitReadyFrame(60000);
    if (!initialReady) {
        qInfo() << "Offscreen not ready" << mode << root->property("presentationPage")
                << presentationResources(window);
        for (auto *object : presentationObjects(window->contentItem()))
            if (!object->objectName().isEmpty())
                qInfo() << object->metaObject()->className() << object->objectName()
                        << object->property("width") << object->property("height")
                        << object->property("visible") << object->property("presentationActive");
    }
    QVERIFY(initialReady);
    const auto preparationMs = preparation.elapsed();
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
        QCOMPARE(picker->size(), QSizeF(40, 40));
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
            samples.append(QJsonObject{{"elapsedMs", duration.elapsed()},
                                       {"positionMs", host.playback.positionMs()},
                                       {"ready", renderer->property("renderReady").toBool()},
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
    observer.start();
    heartbeat.start();
    session.collecting = true;
    runEventLoop(qBound(6000, qEnvironmentVariableIntValue("FOLIA_PERF_SAMPLE_MS"), 300000));
    session.collecting = false;
    observer.stop();
    heartbeat.stop();
    const auto wallMs = wall.elapsed();
    const auto cpuElapsed = cpuMs() - cpuStart;
    const auto completed = session.frameCount - framesBefore;
    QVERIFY(completed > 2);
    QVERIFY(!window->handle());
    identity.checkContent(host.playback, track.id);
    QVERIFY2(identity.failures.isEmpty(), qPrintable(identity.failures.join(';')));
    QVERIFY(host.playback.playing());
    QCOMPARE(host.playback.trackId(), track.id);
    QVERIFY(host.playback.errorMessage().isEmpty());
    const auto activeMemory = memory();
    const auto resourcesAfter = presentationResources(window);
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
