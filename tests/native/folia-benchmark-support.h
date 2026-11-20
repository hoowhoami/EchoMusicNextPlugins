#pragma once
// Release-only measurement against the real installed package and PlaybackPage.
// Run one mode per process; setup, decoding and initial preparation are
// measured separately.
#include "EchoPluginAppearance.h"
#include "EchoPluginViewContext.h"
#include "LyricLine.h"
#include "PluginRuntimeTestFixture.h"
#include <QDirIterator>
#include <QFontDatabase>
#include <QImage>
#include <QQuickGraphicsConfiguration>
#include <QQuickItemGrabResult>
#include <QScreen>
#include <algorithm>
#include <cstdio>
#include <memory>
#include <mutex>
#include <rhi/qrhi.h>
#include <sys/resource.h>
#ifdef Q_OS_MACOS
#include <mach/mach.h>
#endif
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

namespace
{
void runEventLoop(int milliseconds)
{
    QEventLoop loop;
    QTimer::singleShot(milliseconds, Qt::PreciseTimer, &loop, &QEventLoop::quit);
    loop.exec();
}
template <typename Predicate> bool awaitEvent(Predicate predicate, int timeoutMs)
{
    if (predicate())
        return true;
    QEventLoop loop;
    QTimer poll, deadline;
    poll.setTimerType(Qt::PreciseTimer);
    poll.setInterval(5);
    deadline.setTimerType(Qt::PreciseTimer);
    deadline.setSingleShot(true);
    bool ready = false;
    QObject::connect(&poll, &QTimer::timeout, &loop, [&] {
        if ((ready = predicate()))
            loop.quit();
    });
    QObject::connect(&deadline, &QTimer::timeout, &loop, &QEventLoop::quit);
    poll.start();
    deadline.start(timeoutMs);
    loop.exec();
    return ready;
}
QJsonObject filesUnder(const QString &directory)
{
    QDirIterator files(directory, QDir::Files | QDir::NoSymLinks, QDirIterator::Subdirectories);
    qint64 bytes = 0, count = 0;
    while (files.hasNext()) {
        files.next();
        bytes += files.fileInfo().size();
        ++count;
    }
    return {{"fileCount", double(count)}, {"logicalBytes", double(bytes)}};
}
QObject *nativeObject(const QVariant &value)
{
    if (value.metaType().id() == qMetaTypeId<QJSValue>())
        return value.value<QJSValue>().toQObject();
    return value.value<QObject *>();
}
double cpuMs()
{
    rusage usage{};
    getrusage(RUSAGE_SELF, &usage);
    return (usage.ru_utime.tv_sec + usage.ru_stime.tv_sec) * 1000. +
           (usage.ru_utime.tv_usec + usage.ru_stime.tv_usec) / 1000.;
}
QJsonObject memory()
{
    QJsonObject result;
#ifdef Q_OS_MACOS
    task_vm_info_data_t info{};
    mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
    if (task_info(mach_task_self(), TASK_VM_INFO, reinterpret_cast<task_info_t>(&info), &count) ==
        KERN_SUCCESS) {
        result["residentBytes"] = double(info.resident_size);
        result["footprintBytes"] = double(info.phys_footprint);
        result["residentPeakBytes"] = double(info.resident_size_peak);
    }
#endif
    return result;
}
QJsonObject distribution(QVector<double> values)
{
    if (values.isEmpty())
        return {{"count", 0}};
    std::sort(values.begin(), values.end());
    auto at = [&](double percentile) {
        return values[std::min(values.size() - 1,
                               qsizetype(std::ceil(percentile * values.size()) - 1))];
    };
    return {{"count", int(values.size())},
            {"medianMs", at(.5)},
            {"p95Ms", at(.95)},
            {"p99Ms", at(.99)},
            {"maximumMs", values.last()}};
}
struct Samples
{
    std::mutex mutex;
    QElapsedTimer clock;
    QVector<double> frames;
    QVector<double> gpuTimes;
    bool gpuSupported = false;
    QString gpuDevice;
    qint64 previous = 0;
    bool collecting = false;
};
QList<QObject *> presentationObjects(QObject *root)
{
    QList<QObject *> result, pending;
    QSet<QObject *> seen;
    if (root)
        pending.append(root);
    while (!pending.isEmpty()) {
        auto *object = pending.takeLast();
        if (seen.contains(object))
            continue;
        seen.insert(object);
        result.append(object);
        pending.append(object->children());
        if (auto *item = qobject_cast<QQuickItem *>(object))
            for (auto *child : item->childItems())
                pending.append(child);
    }
    return result;
}
QString presentationError(QObject *object)
{
    if (!object)
        return QStringLiteral("Presentation object retired");
    for (const auto *key : {"errorString", "renderError"})
        if (!object->property(key).toString().isEmpty())
            return object->property(key).toString();
    return {};
}
QQuickItem *nativeViewport(QQuickWindow *window)
{
    for (const auto *name :
         {"playbackLyricViewport", "portraitLyricViewport", "simpleLyricViewport"})
        if (auto *item = visual(window->contentItem(), name); item && item->isVisible())
            return item;
    return nullptr;
}
bool presentationContentReady(QQuickWindow *window, const QString &mode)
{
    auto *page = nativeObject(window->property("presentationPage"));
    auto *contents = visual(window->contentItem(), "nativePlaybackContents");
    if (!page || !page->property("presentationActive").toBool() || !contents)
        return false;
    auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
    if (mode == "native") {
        auto *viewport = nativeViewport(window);
        if (skin || !contents->isVisible() || !viewport ||
            !viewport->property("resourceActive").toBool() ||
            viewport->property("width").toDouble() <= 0 ||
            viewport->property("height").toDouble() <= 0)
            return false;
        for (auto *object : presentationObjects(viewport))
            if (auto *line = qobject_cast<EchoMusic::LyricLine *>(object);
                line && line->isVisible() && line->current() && !line->text().isEmpty() &&
                line->renderBatches() > 0)
                return true;
        return false;
    }
    if (!skin || !skin->property("presentationActive").toBool() || contents->isVisible())
        return false;
    auto *background = visual(skin, "foliaBackgroundHost");
    auto *foreground = visual(skin, "foliaDynamicPresentationHost");
    if (!background || !foreground || foreground->z() <= background->z())
        return false;
    auto *stage = visual(skin, "foliaVisualizerStage");
    if (!stage || stage->property("loadedMode").toString() != mode ||
        stage->property("layerCount").toInt() != 1 || !presentationError(stage).isEmpty())
        return false;
    auto *renderer = nativeObject(stage->property("renderer"));
    if (!renderer || renderer->property("busy").toBool() ||
        !presentationError(renderer).isEmpty() ||
        (renderer->metaObject()->indexOfProperty("renderReady") >= 0 &&
         !renderer->property("renderReady").toBool()))
        return false;
    if (mode == "still") {
        auto *text = visual(qobject_cast<QQuickItem *>(renderer), "stillPrimary1");
        return text && text->isVisible() && !text->property("text").toString().isEmpty() &&
               text->width() > 0 && text->height() > 0;
    }
    // These modes deliberately retire shaping GlyphRuns after baking. Their
    // committed real resources and the actor's post-ready frame are the proof.
    if (mode == "diorama")
        return renderer->property("resourceCount").toInt() > 0 &&
               renderer->property("layerCount").toInt() > 0 &&
               renderer->property("totalCacheBytes").toDouble() > 0;
    if (mode == "lumiere" || mode == "hanabi")
        return renderer->property("nodeCount").toInt() > 0 &&
               renderer->property("totalCacheBytes").toDouble() > 0;
    if (mode == "metaphor" || mode == "nebbia" || mode == "machi")
        return renderer->property("renderReady").toBool() &&
               renderer->property("totalCacheBytes").toDouble() > 0;
    for (auto *child : presentationObjects(renderer))
        if (child->property("renderBatches").toInt() > 0)
            return true;
    return false;
}
bool presentationReady(QQuickWindow *window, const QString &mode)
{
    return window->isExposed() && window->isVisible() && window->isActive() &&
           QGuiApplication::applicationState() == Qt::ApplicationActive &&
           window->visibility() != QWindow::Minimized && presentationContentReady(window, mode);
}
bool awaitPresentation(QQuickWindow *window, const QString &mode, int deadline)
{
    // A fresh swap must follow the complete ready predicate, including after a
    // seek. Resolve the current tree at each bounded preparation poll; never
    // retain a raw renderer while running an event loop.
    bool candidate = false, swappedAfterReady = false;
    QObject swapContext;
    const auto swap = QObject::connect(
        window, &QQuickWindow::frameSwapped, &swapContext,
        [&] {
            if (candidate)
                swappedAfterReady = true;
        },
        Qt::QueuedConnection);
    const bool ready = awaitEvent(
        [&] {
            if (!presentationReady(window, mode)) {
                candidate = swappedAfterReady = false;
                return false;
            }
            candidate = true;
            return swappedAfterReady;
        },
        deadline);
    QObject::disconnect(swap);
    return ready;
}
struct SampleIdentity
{
    QPointer<QQuickWindow> window;
    QPointer<QObject> page;
    QPointer<QQuickItem> contents, skin;
    QPointer<QObject> stage, renderer, viewport;
    QString mode;
    QStringList failures;
    int checks = 0;
    explicit SampleIdentity(QQuickWindow *w, const QString &m) : window(w), mode(m)
    {
        page = nativeObject(w->property("presentationPage"));
        contents = visual(w->contentItem(), "nativePlaybackContents");
        skin = visual(w->contentItem(), "foliaPlaybackPage");
        if (skin) {
            stage = visual(skin, "foliaVisualizerStage");
            renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
        } else
            viewport = nativeViewport(w);
    }
    void check(PlaybackService &playback, const QString &trackId)
    {
        checkContent(playback, trackId, true);
    }
    void checkContent(PlaybackService &playback, const QString &trackId,
                      bool desktopPresentation = false)
    {
        ++checks;
        const auto fail = [&](const QString &reason) {
            if (!failures.contains(reason)) {
                failures.append(reason);
                qInfo() << "Sample invalidated" << reason
                        << (stage ? stage->property("loadedMode") : QVariant())
                        << (stage ? stage->property("layerCount") : QVariant())
                        << (stage ? presentationError(stage) : QString())
                        << (renderer ? presentationError(renderer) : QString());
            }
        };
        if (!window || (desktopPresentation && !window->isExposed()) || !window->isVisible() ||
            !page || !page->property("presentationActive").toBool() || !contents)
            fail("Visible playback page retired");
        if (desktopPresentation && (!window || !window->isActive() ||
                                    QGuiApplication::applicationState() != Qt::ApplicationActive))
            fail("Native test window lost foreground activation");
        if (!playback.playing() || playback.loading() || playback.trackId() != trackId ||
            !playback.errorMessage().isEmpty())
            fail("Playback stopped, changed source or reported an error");
        if (mode == "native") {
            if (skin || !contents || !contents->isVisible() || !viewport ||
                !viewport->property("resourceActive").toBool() ||
                viewport->property("width").toDouble() <= 0 ||
                viewport->property("height").toDouble() <= 0)
                fail("Native presentation replaced or unloaded");
        } else if (!skin || !skin->property("presentationActive").toBool() || !contents ||
                   contents->isVisible() || !stage || !renderer ||
                   stage->property("layerCount").toInt() != 1 ||
                   stage->property("loadedMode").toString() != mode ||
                   nativeObject(stage->property("renderer")) != renderer ||
                   !presentationError(stage).isEmpty() || !presentationError(renderer).isEmpty())
            fail("Folia identity, first-frame proof or error state changed");
    }
};
QJsonObject presentationResources(QQuickWindow *window)
{
    auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
    auto *stage = skin ? visual(skin, "foliaVisualizerStage") : nullptr;
    auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
    int items = 0, frameAnimations = 0, glyphs = 0, floatTextures = 0;
    qint64 glyphBytes = 0, floatBytes = 0;
    QJsonArray gpuSurfaces;
    QJsonArray glyphStates;
    if (skin)
        for (auto *child : presentationObjects(skin)) {
            items += qobject_cast<QQuickItem *>(child) != nullptr;
            if (QByteArray(child->metaObject()->className()).contains("FrameAnimation") &&
                child->property("running").toBool())
                ++frameAnimations;
            if (child->inherits("EchoMusic::GlyphRun")) {
                ++glyphs;
                glyphBytes += child->property("cacheBytes").toLongLong();
                if (child->objectName() == "fumeGlyph")
                    glyphStates.append(QJsonObject{
                        {"preparing", child->property("preparing").toBool()},
                        {"ready", child->property("ready").toBool()},
                        {"posesCurrent", child->parent()->property("posesCurrent").toBool()},
                        {"poolKey", child->parent()->property("poolKey").toString()}});
            }
            if (child->inherits("EchoMusic::FloatTexture")) {
                ++floatTextures;
                floatBytes += child->property("cacheBytes").toLongLong();
            }
            if (child->inherits("EchoMusic::EchoGpuSurface"))
                gpuSurfaces.append(QJsonObject::fromVariantMap(child->property("status").toMap()));
        }
    return {{"fumeGlyphStates", glyphStates},
            {"skinItemCount", items},
            {"skinRunningFrameAnimationCount", frameAnimations},
            {"hasDynamicStage", stage != nullptr},
            {"rendererPlannedCacheBytes",
             renderer && renderer->metaObject()->indexOfProperty("totalCacheBytes") >= 0
                 ? QJsonValue(renderer->property("totalCacheBytes").toDouble())
                 : QJsonValue(QJsonValue::Null)},
            {"gpuSurfaceStatus", gpuSurfaces},
            {"glyphRunCount", glyphs},
            {"glyphRunReportedCacheBytes", double(glyphBytes)},
            {"floatTextureCount", floatTextures},
            {"floatTextureReportedCacheBytes", double(floatBytes)}};
}
PlaybackTrack audioFixture(Host &host)
{
    constexpr int rate = 16000, seconds = 600;
    const auto filename = host.temporary.filePath("authored-release-benchmark.wav");
    QFile file(filename);
    if (!file.open(QIODevice::WriteOnly))
        qFatal("Cannot create benchmark PCM");
    QDataStream header(&file);
    header.setByteOrder(QDataStream::LittleEndian);
    const quint32 size = rate * seconds * 2;
    header.writeRawData("RIFF", 4);
    header << quint32(36 + size);
    header.writeRawData("WAVEfmt ", 8);
    header << quint32(16) << quint16(1) << quint16(1) << quint32(rate) << quint32(rate * 2)
           << quint16(2) << quint16(16);
    header.writeRawData("data", 4);
    header << size;
    QByteArray tone;
    QDataStream samples(&tone, QIODevice::WriteOnly);
    samples.setByteOrder(QDataStream::LittleEndian);
    for (int i = 0; i < rate; ++i)
        samples << qint16(std::sin(i * 2. * 3.141592653589793 * 440 / rate) * 2000);
    for (int i = 0; i < seconds; ++i)
        if (file.write(tone) != tone.size())
            qFatal("Cannot write benchmark PCM");
    file.close();
    PlaybackTrack track;
    track.id = "authored-release-benchmark";
    track.title = "山河与月光";
    track.artist = "Authored performance fixture";
    track.album = "Folia controlled Release comparison";
    track.localPath = filename;
    track.durationMs = seconds * 1000;
    return track;
}
} // namespace
