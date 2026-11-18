#include "folia-benchmark-support.h"

class FoliaPerformanceTest : public QObject
{
    Q_OBJECT
private slots:
    void realReleaseWindow();
};
void FoliaPerformanceTest::realReleaseWindow()
{
    QTest::failOnWarning(
        QRegularExpression("invalid context|TypeError:|ReferenceError:|is not a function"));
    configureUiTypography();
    const auto mode = qEnvironmentVariable("FOLIA_PERF_MODE", "native");
    const QSet<QString> modes{"native",   "classic",  "cadenza", "partita", "tilt",
                              "claddagh", "cappella", "monet",   "pendolo", "fume",
                              "tempera",  "lumiere",  "sonnet",  "diorama", "still",
                              "metaphor", "hanabi",   "machi",   "nebbia"};
    QVERIFY2(modes.contains(mode), qPrintable("Unknown benchmark mode: " + mode));
    Host host;
    host.shell.attachPlayback(host.playback);
    host.shell.attachTheme(host.theme);
    host.theme.setMotionEnabled(true);
    const auto primaryFont = qEnvironmentVariable("FOLIA_PERF_FONT", "PingFang SC");
    QVERIFY2(QFontDatabase::hasFamily(primaryFont), qPrintable(primaryFont));
    host.theme.setLyricFont(primaryFont);
    const int requestedWidth = qEnvironmentVariableIsSet("FOLIA_PERF_WIDTH")
                                   ? qEnvironmentVariableIntValue("FOLIA_PERF_WIDTH")
                                   : 1100;
    const int requestedHeight = qEnvironmentVariableIsSet("FOLIA_PERF_HEIGHT")
                                    ? qEnvironmentVariableIntValue("FOLIA_PERF_HEIGHT")
                                    : 820;
    QVERIFY(requestedWidth >= 320 && requestedWidth <= 4096);
    QVERIFY(requestedHeight >= 240 && requestedHeight <= 4096);
    host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
    QString installation;
    QTRY_VERIFY_WITH_TIMEOUT(
        !(installation = host.runtime.installationForId("folia-lyrics-skin")).isEmpty(), 10000);
    QTRY_VERIFY_WITH_TIMEOUT(!host.runtime.loading(), 10000);
    QCOMPARE(host.runtime.state(installation), PluginRuntime::Active);
    auto *entry = host.theme.extensions()->entries("skin").first();
    if (mode != "native") {
        QVERIFY(entry->configuration()->patch(
            {{"mode", mode}, {"fontFamilies", QVariantList{primaryFont}}}));
        QTRY_VERIFY(!entry->configuration()->busy());
        QVERIFY(host.runtime.context(installation)->appearance()->useSkin("folia"));
    }
    QQmlComponent component(&host.engine);
    component.setData(R"(
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.Playback
ApplicationWindow {
    id: window
    title: "Folia 性能验收"
    width: 1100; height: 820; visible: false
    required property PlaybackService playback
    readonly property alias presentationPage: page
    Text { anchors.centerIn: parent; visible: !page.visible; text: "Folia 性能验收 · 等待采样准备" }
    PlaybackPage { id: page; playback: window.playback }
    function openPlayback() { page.open(); }
    function closePlayback() { page.close(); }
})",
                      QUrl("qrc:/folia-release-performance.qml"));
    std::unique_ptr<QObject> root(
        component.createWithInitialProperties({{"playback", QVariant::fromValue(&host.playback)},
                                               {"width", requestedWidth},
                                               {"height", requestedHeight}}));
    QVERIFY2(root, qPrintable(component.errorString()));
    auto *window = qobject_cast<QQuickWindow *>(root.get());
    QVERIFY(window);
    host.mainWindow = window;
    auto graphics = window->graphicsConfiguration();
    graphics.setTimestamps(true);
    window->setGraphicsConfiguration(graphics);
    window->setFlag(Qt::WindowStaysOnTopHint);
    window->show();
    QVERIFY2(EchoMusic::Test::prepareNativeInput(window),
             "Performance sampling requires an unlocked, active native window");
    QTRY_COMPARE(window->rendererInterface()->graphicsApi(), QSGRendererInterface::Metal);
    qInfo() << "Native activation" << EchoMusic::Test::nativeWindowInputPolicy(window)
            << QGuiApplication::applicationState() << window->isActive();
    // macOS may constrain an oversized scaled window. Never call differently
    // sized runs an equal-viewport comparison. Native screen DPR is calibrated
    // by the runner; this production layout needs 1100x820 logical pixels.
    QTRY_VERIFY(window->isExposed());
    QCOMPARE(window->width(), requestedWidth);
    QCOMPARE(window->height(), requestedHeight);
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
    QElapsedTimer preparation;
    qint64 manualStartWaitingMs = 0;
    const auto startGate = qEnvironmentVariable("FOLIA_PERF_START_GATE");
    if (!startGate.isEmpty()) {
        QElapsedTimer manualWait;
        manualWait.start();
        qInfo() << "Waiting for manual start gate" << startGate;
        QVERIFY2(awaitEvent([&] { return QFile::exists(startGate); }, 300000),
                 "Manual performance start gate was not opened");
        manualStartWaitingMs = manualWait.elapsed();
        QVERIFY(EchoMusic::Test::prepareNativeInput(window));
    }
    preparation.start();
    QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
    {
        // A late appearance invalidation may replace a whole page while native
        // preparation is in flight. Never keep its raw QObject across event turns.
        // Resolve the actual current visual tree on every poll, as on later cycles.
        const bool ready =
            awaitPresentation(window, mode,
                              qEnvironmentVariableIsSet("FOLIA_PERF_DIAGNOSE")
                                  ? 5000
                                  : (qEnvironmentVariableIsSet("FOLIA_PERF_PREPARATION_MS")
                                         ? qEnvironmentVariableIntValue("FOLIA_PERF_PREPARATION_MS")
                                         : 60000));
        auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
        auto *stage = skin ? visual(skin, "foliaVisualizerStage") : nullptr;
        if (!ready) {
            auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
            auto *native = nativeViewport(window);
            qInfo() << "Readiness native details" << (native ? native->objectName() : QString())
                    << (native ? native->property("resourceActive") : QVariant())
                    << host.playback.lyrics()->rowCount() << host.playback.positionMs()
                    << window->isActive() << QGuiApplication::applicationState()
                    << EchoMusic::Test::nativeWindowInputPolicy(window);
            if (native) {
                qInfo() << "Native viewport" << native->property("focusLine")
                        << native->property("renderTime") << native->width() << native->height();
                for (auto *object : presentationObjects(native))
                    if (object->metaObject()->indexOfProperty("text") >= 0 &&
                        !object->property("text").toString().isEmpty()) {
                        auto *line = qobject_cast<EchoMusic::LyricLine *>(object);
                        qInfo() << "Native text" << object->metaObject()->className()
                                << object->property("text").toString().left(24)
                                << object->property("visible") << object->property("current")
                                << (line ? line->renderBatches() : -1);
                    }
            }
            qInfo() << "Initial readiness failure" << window->visibility() << window->isExposed()
                    << (skin ? skin->property("presentationActive") : QVariant())
                    << (stage ? stage->property("loadedMode") : QVariant())
                    << (stage ? stage->property("errorString") : QVariant())
                    << (renderer ? renderer->property("busy") : QVariant())
                    << presentationResources(window);
            QVariant inspection;
            if (renderer &&
                QMetaObject::invokeMethod(renderer, "inspect", Q_RETURN_ARG(QVariant, inspection)))
                qInfo() << "Renderer preparation"
                        << (inspection.metaType() == QMetaType::fromType<QJSValue>()
                                ? inspection.value<QJSValue>().toVariant()
                                : inspection);
        }
        QVERIFY(ready);
        if (stage)
            QVERIFY2(stage->property("errorString").toString().isEmpty(),
                     qPrintable(stage->property("errorString").toString()));
    }
    const auto preparationMs = preparation.elapsed();
    const auto seekAndPrepare = [&](int settleMs) {
        QSignalSpy acknowledged(&host.playback, &PlaybackService::seekCompleted);
        host.playback.seek(12000);
        if (!awaitEvent(
                [&] {
                    return acknowledged.count() > 0 && host.playback.playing() &&
                           !host.playback.loading() &&
                           std::abs(host.playback.positionMs() - 12000) < 1000 &&
                           host.playback.errorMessage().isEmpty();
                },
                10000))
            return false;
        runEventLoop(settleMs);
        return awaitPresentation(window, mode, 30000);
    };
    QVERIFY2(seekAndPrepare(2000),
             "Seek was not acknowledged or the fresh presentation never drew");
    const auto visibleResourcesAtStart = presentationResources(window);
    qInfo() << "Steady sampling started" << mode;
    const auto before = memory();
    const auto filesBefore = filesUnder(host.temporary.path());
    QVERIFY(presentationReady(window, mode));
    SampleIdentity identity(window, mode);
    identity.check(host.playback, track.id);
    QVERIFY2(identity.failures.isEmpty(), qPrintable(identity.failures.join(';')));
    auto samples = std::make_shared<Samples>();
    samples->clock.start();
    samples->collecting = true;
    const auto connection = connect(
        window, &QQuickWindow::frameSwapped, window,
        [samples, window] {
            const auto now = samples->clock.nsecsElapsed();
            std::lock_guard guard(samples->mutex);
            if (!samples->collecting)
                return;
            if (samples->previous)
                samples->frames.append((now - samples->previous) / 1e6);
            samples->previous = now;
            auto *interface = window->rendererInterface();
            auto *rhi = static_cast<QRhi *>(
                interface->getResource(window, QSGRendererInterface::RhiResource));
            auto *swapchain = static_cast<QRhiSwapChain *>(
                interface->getResource(window, QSGRendererInterface::RhiSwapchainResource));
            if (rhi && swapchain) {
                samples->gpuSupported = rhi->isFeatureSupported(QRhi::Timestamps);
                if (samples->gpuDevice.isEmpty())
                    samples->gpuDevice = QString::fromUtf8(rhi->driverInfo().deviceName);
                // Query the current buffer afresh after endFrame, on the render
                // thread. The completed timestamp may refer to an earlier frame.
                auto *buffer = swapchain->currentFrameCommandBuffer();
                const auto seconds = buffer ? buffer->lastCompletedGpuTime() : 0;
                if (std::isfinite(seconds) && seconds > 0)
                    samples->gpuTimes.append(seconds * 1000);
            }
        },
        Qt::DirectConnection);
    QVector<double> heartbeatGaps;
    QVector<double> workerFrameIntervals;
    QMap<QString, QVector<double>> workerTimings;
    QMap<QString, QVector<double>> presentationTimings;
    const bool observesPresentation =
        identity.renderer &&
        identity.renderer->metaObject()->indexOfProperty("presentationTimingRevision") >= 0;
    qint64 presentationRevision =
        observesPresentation
            ? identity.renderer->property("presentationTimingRevision").toLongLong()
            : 0;
    const bool observesWorker =
        identity.renderer &&
        identity.renderer->metaObject()->indexOfProperty("workerFrameRevision") >= 0;
    qint64 workerRevision =
        observesWorker ? identity.renderer->property("workerFrameRevision").toLongLong() : 0;
    const qint64 initialWorkerRevision = workerRevision;
    QElapsedTimer workerFrameClock;
    workerFrameClock.start();
    QElapsedTimer heartbeatClock;
    heartbeatClock.start();
    QTimer heartbeat;
    heartbeat.setTimerType(Qt::PreciseTimer);
    heartbeat.setInterval(4);
    connect(&heartbeat, &QTimer::timeout, this, [&] {
        heartbeatGaps.append(heartbeatClock.nsecsElapsed() / 1e6);
        heartbeatClock.restart();
        if (observesPresentation && identity.renderer) {
            const auto revision =
                identity.renderer->property("presentationTimingRevision").toLongLong();
            if (revision != presentationRevision) {
                presentationRevision = revision;
                const auto timing = identity.renderer->property("presentationTiming");
                const auto values = timing.metaType() == QMetaType::fromType<QJSValue>()
                                        ? timing.value<QJSValue>().toVariant().toMap()
                                        : timing.toMap();
                for (auto it = values.cbegin(); it != values.cend(); ++it)
                    presentationTimings[it.key()].append(it.value().toDouble());
            }
        }
        if (observesWorker && identity.renderer) {
            const auto revision = identity.renderer->property("workerFrameRevision").toLongLong();
            if (revision != workerRevision) {
                workerFrameIntervals.append(workerFrameClock.nsecsElapsed() / 1e6);
                workerFrameClock.restart();
                workerRevision = revision;
                const auto timing = identity.renderer->property("workerFrameTiming");
                const auto values = timing.metaType() == QMetaType::fromType<QJSValue>()
                                        ? timing.value<QJSValue>().toVariant().toMap()
                                        : timing.toMap();
                for (auto it = values.cbegin(); it != values.cend(); ++it)
                    workerTimings[it.key()].append(it.value().toDouble());
            }
        }
    });
    heartbeat.start();
    const auto cpuStart = cpuMs();
    QJsonObject sampledPeak = before;
    QTimer memorySampler;
    memorySampler.setInterval(100);
    connect(&memorySampler, &QTimer::timeout, this, [&] {
        // Constant-size pointer/property checks piggyback on the memory timer.
        // No QObject traversal, glyph readback or PNG capture during steady state.
        identity.check(host.playback, track.id);
        const auto current = memory();
        for (auto it = current.begin(); it != current.end(); ++it)
            sampledPeak[it.key()] =
                std::max(sampledPeak[it.key()].toDouble(), it.value().toDouble());
    });
    memorySampler.start();
    QElapsedTimer wall;
    wall.start();
    const int sampleMs = qBound(6000, qEnvironmentVariableIntValue("FOLIA_PERF_SAMPLE_MS"), 300000);
    runEventLoop(sampleMs);
    const auto wallMs = wall.elapsed();
    const auto cpuElapsed = cpuMs() - cpuStart;
    heartbeat.stop();
    memorySampler.stop();
    disconnect(connection);
    QVector<double> frames;
    QVector<double> gpuTimes;
    bool gpuSupported = false;
    QString gpuDevice;
    {
        std::lock_guard guard(samples->mutex);
        samples->collecting = false;
        frames = samples->frames;
        gpuTimes = samples->gpuTimes;
        gpuSupported = samples->gpuSupported;
        gpuDevice = samples->gpuDevice;
    }
    QJsonObject workerTimingReport;
    for (auto it = workerTimings.cbegin(); it != workerTimings.cend(); ++it) {
        auto values = distribution(it.value());
        if (it.key() == "payloadBytes") {
            for (const auto &key : {"maximum", "median", "p95", "p99"})
                values[QString(key) + "Bytes"] = values.take(QString(key) + "Ms");
        }
        workerTimingReport[it.key()] = values;
    }
    qInfo() << "Steady worker breakdown" << workerTimingReport;
    QJsonObject presentationTimingReport;
    for (auto it = presentationTimings.cbegin(); it != presentationTimings.cend(); ++it) {
        auto values = distribution(it.value());
        if (!it.key().endsWith("Ms"))
            for (const auto &key : {"maximum", "median", "p95", "p99"})
                values[QString(key) + "Count"] = values.take(QString(key) + "Ms");
        presentationTimingReport[it.key()] = values;
    }
    qInfo() << "Steady presentation breakdown" << presentationTimingReport;
    const auto visibleMemory = memory();
    const auto visibleResourcesAtEnd = presentationResources(window);
    qInfo() << "Steady graphics resources" << visibleResourcesAtStart << visibleResourcesAtEnd;
    identity.check(host.playback, track.id);
    QVERIFY2(identity.failures.isEmpty(), qPrintable(identity.failures.join(';')));
    // Rendering may have an ordinary worker frame in flight. The measured
    // interval has ended; require a new, actually ready frame before accepting
    // its end identity, and keep this wait out of the six-second metrics.
    QElapsedTimer tailReadiness;
    tailReadiness.start();
    QVERIFY2(awaitPresentation(window, mode, 30000),
             "Presentation did not draw a ready frame after steady sampling");
    const auto tailReadinessMs = tailReadiness.elapsed();
    identity.check(host.playback, track.id);
    QVERIFY2(identity.failures.isEmpty(), qPrintable(identity.failures.join(';')));
    QVERIFY(frames.size() > 2);
    window->hide();
    runEventLoop(1000);
    const auto hiddenMemory = memory();
    const auto filesHidden = filesUnder(host.temporary.path());
    const auto hiddenCpuStart = cpuMs();
    QElapsedTimer hiddenWall;
    hiddenWall.start();
    runEventLoop(2000);
    const auto hiddenCpu = cpuMs() - hiddenCpuStart;
    const auto measuredHiddenWall = hiddenWall.elapsed();
    const auto hiddenResources = presentationResources(window);
    QJsonArray cycles;
    const int cycleCount = qBound(0, qEnvironmentVariableIntValue("FOLIA_PERF_CYCLES"), 10);
    for (int cycle = 0; cycle < cycleCount; ++cycle) {
        auto next = track;
        next.id += QString("-cycle-%1").arg(cycle);
        next.title += QString(" %1").arg(cycle);
        host.playback.playTracks({next}, 0, "Authored benchmark", "folia-benchmark");
        QVERIFY(
            awaitEvent([&] { return host.playback.playing() && !host.playback.loading(); }, 10000));
        QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, next.id));
        window->showNormal();
        window->raise();
        window->requestActivate();
        QVERIFY(awaitEvent(
            [&] {
                return window->isVisible() && window->visibility() != QWindow::Minimized &&
                       window->isExposed();
            },
            5000));
        QVERIFY(EchoMusic::Test::prepareNativeInput(window));
        QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
        const bool ready = awaitPresentation(window, mode, 30000);
        if (!ready) {
            auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
            auto *stage = skin ? visual(skin, "foliaVisualizerStage") : nullptr;
            auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
            qInfo() << "Cycle readiness failure" << cycle << window->visibility()
                    << window->isExposed()
                    << (skin ? skin->property("presentationActive") : QVariant())
                    << (stage ? stage->property("loadedMode") : QVariant())
                    << (renderer ? renderer->property("busy") : QVariant())
                    << (renderer ? renderer->property("currentIndex") : QVariant())
                    << presentationResources(window);
#ifdef Q_OS_MACOS
            qInfo() << "Cycle native window" << EchoMusic::Test::nativeWindowInputPolicy(window);
#endif
            QVariant inspection;
            if (renderer &&
                QMetaObject::invokeMethod(renderer, "inspect", Q_RETURN_ARG(QVariant, inspection)))
                qInfo() << "Cycle renderer"
                        << (inspection.metaType() == QMetaType::fromType<QJSValue>()
                                ? inspection.value<QJSValue>().toVariant()
                                : inspection);
        }
        QVERIFY(ready);
        QVERIFY2(seekAndPrepare(1200),
                 "Cycle seek was not acknowledged or fresh presentation never drew");
        const auto visibleCycleMemory = memory();
        const auto visibleResources = presentationResources(window);
        const bool minimized = cycle == cycleCount - 1;
        if (minimized) {
            window->showMinimized();
        } else {
            QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
            window->hide();
        }
        runEventLoop(1000);
        const auto resources = presentationResources(window);
        QVERIFY(!resources["hasDynamicStage"].toBool());
        QCOMPARE(resources["skinRunningFrameAnimationCount"].toInt(), 0);
        const auto hiddenCycleMemory = memory();
        const auto hiddenCycleStorage = filesUnder(host.temporary.path());
        QJsonObject minimizeRestore;
        if (minimized) {
            QCOMPARE(window->visibility(), QWindow::Minimized);
            minimizeRestore["qtMinimized"] = true;
#ifdef Q_OS_MACOS
            const auto nativeMinimized = EchoMusic::Test::nativeWindowInputPolicy(window);
            qInfo() << "Native minimized window" << nativeMinimized;
            minimizeRestore["nativeWindowWhileMinimized"] =
                QJsonObject::fromVariantMap(nativeMinimized);
#endif
            EchoMusic::Test::FrameSpy restoredFrames(window);
            window->showNormal();
            window->raise();
            window->requestActivate();
            QVERIFY(EchoMusic::Test::prepareNativeInput(window));
            QVERIFY(awaitPresentation(window, mode, 60000));
            QVERIFY(awaitEvent([&] { return restoredFrames.count() >= 2; }, 5000));
            minimizeRestore["restored"] = true;
            minimizeRestore["restoredPresentedFrames"] = int(restoredFrames.count());
            minimizeRestore["restoredResources"] = presentationResources(window);
            QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
            window->hide();
            runEventLoop(1000);
            QVERIFY(!presentationResources(window)["hasDynamicStage"].toBool());
        }
        cycles.append(QJsonObject{{"cycle", cycle + 1},
                                  {"minimized", minimized},
                                  {"visible", visibleCycleMemory},
                                  {"hiddenAfter1s", hiddenCycleMemory},
                                  {"visibleResources", visibleResources},
                                  {"hiddenResources", resources},
                                  {"hiddenFixtureStorage", hiddenCycleStorage},
                                  {"minimizeRestore", minimizeRestore}});
    }
    QJsonObject result{
        {"mode", mode},
        {"qt", qVersion()},
        {"primaryFont", primaryFont},
        {"pid", double(QCoreApplication::applicationPid())},
        {"logicalWidth", window->width()},
        {"logicalHeight", window->height()},
        {"dpr", window->devicePixelRatio()},
        {"screenRefreshHz", window->screen()->refreshRate()},
        {"initialPreparationMs", double(preparationMs)},
        {"manualStartWaitingMs", double(manualStartWaitingMs)},
        {"postSampleReadyWaitMs", double(tailReadinessMs)},
        {"sampleValidity", QJsonObject{{"schemaVersion", 1},
                                       {"valid", true},
                                       {"mode", mode},
                                       {"firstFrame", true},
                                       {"seekAcknowledged", true},
                                       {"readyAfterSeek", true},
                                       {"readyAtSampleStart", true},
                                       {"readyAtSampleEnd", true},
                                       {"stablePresentationIdentity", true},
                                       {"foregroundActive", true},
                                       {"playbackPlaying", true},
                                       {"errorFree", true},
                                       {"observerChecks", identity.checks},
                                       {"observerFailures", QJsonArray{}},
                                       {"scope", "fresh ready-frame gates before/after seek and "
                                                 "sample; 100ms constant-size QPointer/identity/"
                                                 "error/foreground activation checks; no "
                                                 "steady-state tree traversal; "
                                                 "tail readiness wait excluded from metrics"}}},
        {"wallMs", double(wallMs)},
        {"cpuMs", cpuElapsed},
        {"cpuPercentOneCore", cpuElapsed / wallMs * 100},
        {"presentedFrameIntervals", distribution(frames)},
        {"workerFrameObservedIntervals", distribution(workerFrameIntervals)},
        {"workerTiming", workerTimingReport},
        {"presentationTiming", presentationTimingReport},
        {"presentationTimingScope", "Completed Machi frame GUI replay building, enqueue snapshot "
                                    "and final presentation submission wall time; excludes "
                                    "asynchronous GPU execution and timer waits"},
        {"keptAboveOtherWindows", true},
        {"workerTimingScope", "Per-result worker evaluation, packet encoding, JSON serialization "
                              "and GUI parse elapsed milliseconds; payloadBytes is the UTF16 "
                              "payload size in bytes; separate from CPU and GPU timing"},
        {"workerFrameRevisionDelta",
         observesWorker ? QJsonValue(double(workerRevision - initialWorkerRevision))
                        : QJsonValue(QJsonValue::Null)},
        {"workerFrameScope", "Worker result revisions observed by the 4ms GUI heartbeat; separate "
                             "from window swaps "
                             "and GPU timestamps; not proof every result was presented"},
        {"guiHeartbeatGaps", distribution(heartbeatGaps)},
        {"visibleResourcesAtStart", visibleResourcesAtStart},
        {"visibleResourcesAtEnd", visibleResourcesAtEnd},
        {"beforeSampling", before},
        {"visibleEnd", visibleMemory},
        {"sampledVisiblePeak", sampledPeak},
        {"hiddenAfter1s", hiddenMemory},
        {"hiddenResources", hiddenResources},
        {"repeatedSongOpenCloseCycles", cycles},
        {"minimizeRestoreScope",
         "last cycle verifies Qt minimized visibility, renderer release, direct restoration "
         "and fresh ready frames; native Cocoa state is recorded separately and must not "
         "be inferred from Qt visibility; preceding cycles use close/hide/show"},
        {"fixtureStorageBeforeSampling", filesBefore},
        {"fixtureStorageHiddenAfter1s", filesHidden},
        {"fixtureStorageScope",
         "logical files in isolated host temporary root, including authored WAV "
         "and installed package; excludes platform caches and driver "
         "allocations"},
        {"hiddenWallMs", double(measuredHiddenWall)},
        {"hiddenCpuMs", hiddenCpu},
        {"gpuTimestampSupported", gpuSupported},
        {"gpuDevice", gpuDevice},
        {"completedGpuDuration", distribution(gpuTimes)},
        {"gpuDurationScope",
         "Qt6.12 QRhi lastCompletedGpuTime seconds converted to ms; asynchronous "
         "previously completed frame, may repeat; timestamps enabled for both "
         "native and Folia; presentation cadence is separate"},
        {"memoryScope", "main process only; includes Qt, Rust PCM and render "
                        "pools; no driver-wide or helper claim"},
        {"samplingInterference", "CPU includes this process's 4ms heartbeat, "
                                 "100ms memory/validity checks and render-thread "
                                 "timestamp/vector/mutex work; same probe for "
                                 "native and Folia; not a pure plugin CPU cost"}};
    const auto output =
        qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/performance-" + mode + ".json";
    write(output, QJsonDocument(result).toJson(QJsonDocument::Indented));
    qInfo().noquote() << "FOLIA_RELEASE_PERFORMANCE"
                      << QJsonDocument(result).toJson(QJsonDocument::Compact);
    host.playback.stop();
}
static bool printNativeScreenInfo()
{
    if (!qEnvironmentVariableIsSet("FOLIA_PERF_SCREEN_INFO"))
        return false;
    const auto *screen = QGuiApplication::primaryScreen();
    if (!screen)
        return false;
    const auto data = QJsonDocument(QJsonObject{{"devicePixelRatio", screen->devicePixelRatio()},
                                                {"width", screen->geometry().width()},
                                                {"height", screen->geometry().height()},
                                                {"screenName", screen->name()}})
                          .toJson(QJsonDocument::Compact);
    std::printf("FOLIA_NATIVE_SCREEN %s\n", data.constData());
    return true;
}
QTEST_MAIN_WRAPPER(FoliaPerformanceTest, QTEST_MAIN_SETUP(); if (printNativeScreenInfo()) return 0;)
#include "folia-performance.moc"
