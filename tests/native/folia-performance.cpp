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
#include <memory>
#include <mutex>
#include <rhi/qrhi.h>
#include <sys/resource.h>
#ifdef Q_OS_MACOS
#include <mach/mach.h>
#endif
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

namespace {
void runEventLoop(int milliseconds) {
  QEventLoop loop;
  QTimer::singleShot(milliseconds, Qt::PreciseTimer, &loop, &QEventLoop::quit);
  loop.exec();
}
template <typename Predicate>
bool awaitEvent(Predicate predicate, int timeoutMs) {
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
QJsonObject filesUnder(const QString &directory) {
  QDirIterator files(directory, QDir::Files | QDir::NoSymLinks,
                     QDirIterator::Subdirectories);
  qint64 bytes = 0, count = 0;
  while (files.hasNext()) {
    files.next();
    bytes += files.fileInfo().size();
    ++count;
  }
  return {{"fileCount", double(count)}, {"logicalBytes", double(bytes)}};
}
QObject *nativeObject(const QVariant &value) {
  if (value.metaType().id() == qMetaTypeId<QJSValue>())
    return value.value<QJSValue>().toQObject();
  return value.value<QObject *>();
}
double cpuMs() {
  rusage usage{};
  getrusage(RUSAGE_SELF, &usage);
  return (usage.ru_utime.tv_sec + usage.ru_stime.tv_sec) * 1000. +
         (usage.ru_utime.tv_usec + usage.ru_stime.tv_usec) / 1000.;
}
QJsonObject memory() {
  QJsonObject result;
#ifdef Q_OS_MACOS
  task_vm_info_data_t info{};
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
  if (task_info(mach_task_self(), TASK_VM_INFO,
                reinterpret_cast<task_info_t>(&info), &count) == KERN_SUCCESS) {
    result["residentBytes"] = double(info.resident_size);
    result["footprintBytes"] = double(info.phys_footprint);
    result["residentPeakBytes"] = double(info.resident_size_peak);
  }
#endif
  return result;
}
QJsonObject distribution(QVector<double> values) {
  if (values.isEmpty())
    return {{"count", 0}};
  std::sort(values.begin(), values.end());
  auto at = [&](double percentile) {
    return values[std::min(
        values.size() - 1,
        qsizetype(std::ceil(percentile * values.size()) - 1))];
  };
  return {{"count", int(values.size())},
          {"medianMs", at(.5)},
          {"p95Ms", at(.95)},
          {"p99Ms", at(.99)},
          {"maximumMs", values.last()}};
}
struct Samples {
  std::mutex mutex;
  QElapsedTimer clock;
  QVector<double> frames;
  QVector<double> gpuTimes;
  bool gpuSupported = false;
  QString gpuDevice;
  qint64 previous = 0;
  bool collecting = false;
};
QList<QObject *> presentationObjects(QObject *root) {
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
QString presentationError(QObject *object) {
  if (!object)
    return QStringLiteral("Presentation object retired");
  for (const auto *key : {"errorString", "renderError"})
    if (!object->property(key).toString().isEmpty())
      return object->property(key).toString();
  return {};
}
QObject *currentActor(QObject *stage) {
  if (!stage || stage->property("layerCount").toInt() != 1)
    return nullptr;
  const auto value = stage->property("actors");
  if (value.metaType() == QMetaType::fromType<QJSValue>())
    return value.value<QJSValue>().property(0).toQObject();
  const auto actors = value.toList();
  return actors.size() == 1 ? nativeObject(actors.first()) : nullptr;
}
bool presentationReady(QQuickWindow *window, const QString &mode) {
  if (!window->isExposed() || !window->isVisible() || !window->isActive() ||
      QGuiApplication::applicationState() != Qt::ApplicationActive ||
      window->visibility() == QWindow::Minimized)
    return false;
  auto *page = visual(window->contentItem(), "playbackPage");
  auto *contents = visual(window->contentItem(), "nativePlaybackContents");
  if (!page || !page->property("presentationActive").toBool() || !contents)
    return false;
  auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
  if (mode == "native") {
    auto *viewport = visual(contents, "playbackLyricViewport");
    if (skin || !contents->isVisible() || !viewport ||
        !viewport->property("resourceActive").toBool())
      return false;
    for (auto *object : presentationObjects(viewport))
      if (auto *line = qobject_cast<EchoMusic::LyricLine *>(object);
          line && line->isVisible() && line->current() &&
          !line->text().isEmpty() && line->renderBatches() > 0)
        return true;
    return false;
  }
  if (!skin || !skin->property("presentationActive").toBool() ||
      contents->isVisible())
    return false;
  auto *background = visual(skin, "foliaBackgroundHost");
  auto *foreground = visual(skin, "foliaDynamicPresentationHost");
  if (!background || !foreground || foreground->z() <= background->z())
    return false;
  auto *stage = visual(skin, "foliaVisualizerStage");
  auto *actor = currentActor(stage);
  if (!stage || stage->property("loadedMode").toString() != mode ||
      stage->property("transitionWaits").toBool() || !actor ||
      !actor->property("hasFrame").toBool() ||
      !presentationError(stage).isEmpty())
    return false;
  auto *renderer = nativeObject(stage->property("renderer"));
  if (!renderer || renderer->property("busy").toBool() ||
      !presentationError(renderer).isEmpty() ||
      (renderer->metaObject()->indexOfProperty("renderReady") >= 0 &&
       !renderer->property("renderReady").toBool()))
    return false;
  if (mode == "still") {
    auto *text = visual(qobject_cast<QQuickItem *>(renderer), "stillPrimary1");
    return text && text->isVisible() &&
           !text->property("text").toString().isEmpty() && text->width() > 0 &&
           text->height() > 0;
  }
  // These modes deliberately retire shaping GlyphRuns after baking. Their
  // committed real resources and the actor's post-ready frame are the proof.
  if (mode == "diorama")
    return renderer->property("resourceCount").toInt() > 0 &&
           renderer->property("layerCount").toInt() > 0 &&
           renderer->property("totalCacheBytes").toDouble() > 0;
  if (mode == "lumiere")
    return renderer->property("nodeCount").toInt() > 0 &&
           renderer->property("totalCacheBytes").toDouble() > 0;
  for (auto *child : presentationObjects(renderer))
    if (child->property("renderBatches").toInt() > 0)
      return true;
  return false;
}
bool awaitPresentation(QQuickWindow *window, const QString &mode,
                       int deadline) {
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
struct SampleIdentity {
  QPointer<QQuickWindow> window;
  QPointer<QQuickItem> page, contents, skin;
  QPointer<QObject> stage, renderer, actor, viewport;
  QString mode;
  QStringList failures;
  int checks = 0;
  explicit SampleIdentity(QQuickWindow *w, const QString &m)
      : window(w), mode(m) {
    page = visual(w->contentItem(), "playbackPage");
    contents = visual(w->contentItem(), "nativePlaybackContents");
    skin = visual(w->contentItem(), "foliaPlaybackPage");
    if (skin) {
      stage = visual(skin, "foliaVisualizerStage");
      renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
      actor = currentActor(stage);
    } else
      viewport = visual(w->contentItem(), "playbackLyricViewport");
  }
  void check(PlaybackService &playback, const QString &trackId) {
    ++checks;
    const auto fail = [&](const QString &reason) {
      if (!failures.contains(reason))
        failures.append(reason);
    };
    if (!window || !window->isExposed() || !window->isVisible() || !page ||
        !page->property("presentationActive").toBool() || !contents)
      fail("Visible playback page retired");
    if (!window || !window->isActive() ||
        QGuiApplication::applicationState() != Qt::ApplicationActive)
      fail("Native test window lost foreground activation");
    if (!playback.playing() || playback.loading() ||
        playback.trackId() != trackId || !playback.errorMessage().isEmpty())
      fail("Playback stopped, changed source or reported an error");
    if (mode == "native") {
      if (skin || !contents || !contents->isVisible() || !viewport ||
          !viewport->property("resourceActive").toBool())
        fail("Native presentation replaced or unloaded");
    } else if (!skin || !skin->property("presentationActive").toBool() ||
               !contents || contents->isVisible() || !stage || !renderer ||
               !actor || stage->property("loadedMode").toString() != mode ||
               nativeObject(stage->property("renderer")) != renderer ||
               !actor->property("hasFrame").toBool() ||
               !presentationError(stage).isEmpty() ||
               !presentationError(renderer).isEmpty())
      fail("Folia identity, first-frame proof or error state changed");
  }
};
QJsonObject presentationResources(QQuickWindow *window) {
  auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
  auto *stage = skin ? visual(skin, "foliaVisualizerStage") : nullptr;
  auto *renderer = stage ? nativeObject(stage->property("renderer")) : nullptr;
  int items = 0, frameAnimations = 0, glyphs = 0, floatTextures = 0;
  qint64 glyphBytes = 0, floatBytes = 0;
  if (skin)
    for (auto *child : presentationObjects(skin)) {
      items += qobject_cast<QQuickItem *>(child) != nullptr;
      if (QByteArray(child->metaObject()->className())
              .contains("FrameAnimation") &&
          child->property("running").toBool())
        ++frameAnimations;
      if (child->inherits("EchoMusic::GlyphRun")) {
        ++glyphs;
        glyphBytes += child->property("cacheBytes").toLongLong();
      }
      if (child->inherits("EchoMusic::FloatTexture")) {
        ++floatTextures;
        floatBytes += child->property("cacheBytes").toLongLong();
      }
    }
  return {
      {"skinItemCount", items},
      {"skinRunningFrameAnimationCount", frameAnimations},
      {"hasDynamicStage", stage != nullptr},
      {"rendererPlannedCacheBytes",
       renderer && renderer->metaObject()->indexOfProperty("cacheBytes") >= 0
           ? QJsonValue(renderer->property("cacheBytes").toDouble())
           : QJsonValue(QJsonValue::Null)},
      {"glyphRunCount", glyphs},
      {"glyphRunReportedCacheBytes", double(glyphBytes)},
      {"floatTextureCount", floatTextures},
      {"floatTextureReportedCacheBytes", double(floatBytes)}};
}
PlaybackTrack audioFixture(Host &host) {
  constexpr int rate = 16000, seconds = 600;
  const auto filename =
      host.temporary.filePath("authored-release-benchmark.wav");
  QFile file(filename);
  if (!file.open(QIODevice::WriteOnly))
    qFatal("Cannot create benchmark PCM");
  QDataStream header(&file);
  header.setByteOrder(QDataStream::LittleEndian);
  const quint32 size = rate * seconds * 2;
  header.writeRawData("RIFF", 4);
  header << quint32(36 + size);
  header.writeRawData("WAVEfmt ", 8);
  header << quint32(16) << quint16(1) << quint16(1) << quint32(rate)
         << quint32(rate * 2) << quint16(2) << quint16(16);
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

class FoliaPerformanceTest : public QObject {
  Q_OBJECT
private slots:
  void realReleaseWindow();
};
void FoliaPerformanceTest::realReleaseWindow() {
  QTest::failOnWarning(QRegularExpression(
      "invalid context|TypeError:|ReferenceError:|is not a function"));
  configureUiTypography();
  const auto mode = qEnvironmentVariable("FOLIA_PERF_MODE", "native");
  const QSet<QString> modes{"native",  "classic",  "cadenza",  "partita",
                            "tilt",    "claddagh", "cappella", "monet",
                            "pendolo", "fume",     "tempera",  "lumiere",
                            "sonnet",  "diorama",  "still"};
  QVERIFY2(modes.contains(mode), qPrintable("Unknown benchmark mode: " + mode));
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.theme.setMotionEnabled(true);
  const auto primaryFont =
      qEnvironmentVariable("FOLIA_PERF_FONT", "PingFang SC");
  QVERIFY2(QFontDatabase::hasFamily(primaryFont), qPrintable(primaryFont));
  host.theme.setLyricFont(primaryFont);
  const int requestedWidth =
      qEnvironmentVariableIsSet("FOLIA_PERF_WIDTH")
          ? qEnvironmentVariableIntValue("FOLIA_PERF_WIDTH")
          : 720;
  const int requestedHeight =
      qEnvironmentVariableIsSet("FOLIA_PERF_HEIGHT")
          ? qEnvironmentVariableIntValue("FOLIA_PERF_HEIGHT")
          : 480;
  QVERIFY(requestedWidth >= 320 && requestedWidth <= 4096);
  QVERIFY(requestedHeight >= 240 && requestedHeight <= 4096);
  host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
  QString installation;
  QTRY_VERIFY_WITH_TIMEOUT(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty(),
      10000);
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
    width: 1100; height: 820; visible: false
    required property PlaybackService playback
    PlaybackPage { id: page; playback: window.playback }
    function openPlayback() { page.open(); }
    function closePlayback() { page.close(); }
})",
                    QUrl("qrc:/folia-release-performance.qml"));
  std::unique_ptr<QObject> root(component.createWithInitialProperties(
      {{"playback", QVariant::fromValue(&host.playback)},
       {"width", requestedWidth},
       {"height", requestedHeight}}));
  QVERIFY2(root, qPrintable(component.errorString()));
  auto *window = qobject_cast<QQuickWindow *>(root.get());
  QVERIFY(window);
  auto graphics = window->graphicsConfiguration();
  graphics.setTimestamps(true);
  window->setGraphicsConfiguration(graphics);
  window->show();
  QVERIFY2(EchoMusic::Test::prepareNativeInput(window),
           "Performance sampling requires an unlocked, active native window");
  QTRY_COMPARE(window->rendererInterface()->graphicsApi(),
               QSGRendererInterface::Metal);
  // macOS may constrain an oversized scaled window. Never call differently
  // sized runs an equal-viewport comparison (720x480 fits both tested DPRs).
  QTRY_VERIFY(window->isExposed());
  QCOMPARE(window->width(), requestedWidth);
  QCOMPARE(window->height(), requestedHeight);
  const auto track = audioFixture(host);
  host.playback.setVolume(1);
  host.playback.playTracks({track}, 0, "Authored benchmark", "folia-benchmark");
  QVERIFY2(
      awaitEvent(
          [&] { return host.playback.playing() && !host.playback.loading(); },
          10000),
      qPrintable(host.playback.errorMessage()));
  QJsonArray rows;
  for (int i = 0; i < 80; ++i)
    rows.append(QJsonObject{
        {"text", QString("山河依旧，光落在你的肩头 %1 — office ffi á").arg(i)},
        {"start_ms", i * 4000},
        {"duration_ms", 3500},
        {"translation",
         QString("Authored translation %1 in the moonlight").arg(i)},
        {"words", QJsonArray{}}});
  QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, track.id));
  QElapsedTimer preparation;
  preparation.start();
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  {
    // A late appearance invalidation may replace a whole page while native
    // preparation is in flight. Never keep its raw QObject across event turns.
    // Resolve the actual current visual tree on every poll, as on later cycles.
    const bool ready = awaitPresentation(window, mode, 60000);
    auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
    auto *stage = skin ? visual(skin, "foliaVisualizerStage") : nullptr;
    if (!ready) {
      auto *renderer =
          stage ? nativeObject(stage->property("renderer")) : nullptr;
      qInfo() << "Initial readiness failure" << window->visibility()
              << window->isExposed()
              << (skin ? skin->property("presentationActive") : QVariant())
              << (stage ? stage->property("loadedMode") : QVariant())
              << (stage ? stage->property("errorString") : QVariant())
              << (renderer ? renderer->property("busy") : QVariant())
              << presentationResources(window);
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
  // Capture in a separate process so GPU readback/PNG buffers never affect the
  // performance sample or the subsequent hidden-memory measurements.
  if (qEnvironmentVariableIsSet("FOLIA_PREVIEW_ONLY")) {
    const auto directory = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
    QJsonArray scene;
    for (auto *object : presentationObjects(window)) {
      if (!object->objectName().startsWith("folia") &&
          !object->property("modeKey").isValid() &&
          !object->property("renderBatches").isValid() &&
          !object->property("sourceItem").isValid())
        continue;
      QJsonObject item{{"name", object->objectName()},
                       {"type", object->metaObject()->className()}};
      for (const char *key : {"currentIndex",
                              "timeSeconds",
                              "renderTime",
                              "live",
                              "continuous",
                              "renderReady",
                              "busy",
                              "opacity",
                              "presentationActive",
                              "presentationError",
                              "loadedMode",
                              "modeKey",
                              "cacheBytes",
                              "renderBatches",
                              "errorString",
                              "runs",
                              "poses",
                              "metrics",
                              "textureUploads",
                              "layoutAccepted",
                              "words",
                              "acceptedMetrics",
                              "configs",
                              "geometry",
                              "wordTransitions",
                              "presentationSeconds",
                              "enteredAt",
                              "enteredPresentationAt",
                              "lineMotion",
                              "progress",
                              "changing",
                              "hideSource",
                              "sourceRect"}) {
        auto value = object->property(key);
        if (!value.isValid())
          continue;
        if (value.metaType() == QMetaType::fromType<QJSValue>())
          value = value.value<QJSValue>().toVariant();
        item.insert(key, QJsonValue::fromVariant(value));
      }
      if (auto *source = nativeObject(object->property("sourceItem")))
        item["sourceItem"] =
            QJsonObject{{"name", source->objectName()},
                        {"type", source->metaObject()->className()}};
      if (auto *visual = qobject_cast<QQuickItem *>(object)) {
        item["visible"] = visual->isVisible();
        item["x"] = visual->x();
        item["y"] = visual->y();
        item["width"] = visual->width();
        item["height"] = visual->height();
        double opacity = 1;
        for (auto *ancestor = visual; ancestor;
             ancestor = ancestor->parentItem())
          opacity *= ancestor->opacity();
        item["inheritedOpacity"] = opacity;
        QJsonArray children;
        for (auto *child : visual->childItems())
          children.append(
              QJsonObject{{"name", child->objectName()},
                          {"type", child->metaObject()->className()},
                          {"z", child->z()},
                          {"visible", child->isVisible()}});
        item["visualChildren"] = children;
        QJsonArray ancestors;
        for (auto *ancestor = visual; ancestor;
             ancestor = ancestor->parentItem()) {
          QJsonObject parent{{"name", ancestor->objectName()},
                             {"type", ancestor->metaObject()->className()},
                             {"x", ancestor->x()},
                             {"y", ancestor->y()},
                             {"width", ancestor->width()},
                             {"height", ancestor->height()},
                             {"scale", ancestor->scale()},
                             {"rotation", ancestor->rotation()},
                             {"z", ancestor->z()},
                             {"visible", ancestor->isVisible()},
                             {"opacity", ancestor->opacity()},
                             {"clip", ancestor->clip()}};
          QJsonArray corners;
          for (auto point : {QPointF(0, 0), QPointF(ancestor->width(), 0),
                             QPointF(0, ancestor->height()),
                             QPointF(ancestor->width(), ancestor->height())}) {
            const auto mapped = ancestor->mapToScene(point);
            corners.append(QJsonArray{mapped.x(), mapped.y()});
          }
          parent["sceneCorners"] = corners;
          for (const char *key :
               {"layoutAccepted", "words", "acceptedMetrics", "configs",
                "geometry", "wordTransitions", "presentationSeconds",
                "enteredAt", "enteredPresentationAt", "lineMotion", "progress",
                "changing"}) {
            auto value = ancestor->property(key);
            if (!value.isValid())
              continue;
            if (value.metaType() == QMetaType::fromType<QJSValue>())
              value = value.value<QJSValue>().toVariant();
            parent[key] = QJsonValue::fromVariant(value);
          }
          ancestors.append(parent);
        }
        item["ancestors"] = ancestors;
      }
      scene.append(item);
    }
    write(directory + "/preview-scene-" + mode + ".json",
          QJsonDocument(scene).toJson(QJsonDocument::Indented));
    const auto image = window->grabWindow();
    QVERIFY(!image.isNull());
    QVERIFY(image.save(directory + "/preview-" + mode + ".png"));
    if (auto *glyph = visual(window->contentItem(), "classicGlyphRun")) {
      auto grab = glyph->grabToImage();
      QVERIFY(grab);
      QVERIFY(awaitEvent([&] { return !grab->image().isNull(); }, 5000));
      QVERIFY(grab->image().save(directory + "/preview-classic-glyph.png"));
    }
    if (qEnvironmentVariableIsSet("FOLIA_PREVIEW_STACK_PROBE")) {
      auto *dynamic =
          visual(window->contentItem(), "foliaDynamicPresentationHost");
      QVERIFY(dynamic);
      dynamic->setZ(1);
      runEventLoop(100);
      QVERIFY(
          window->grabWindow().save(directory + "/preview-stack-probe.png"));
    }
    write(
        directory + "/preview-" + mode + ".json",
        QJsonDocument(
            QJsonObject{{"mode", mode},
                        {"qt", qVersion()},
                        {"primaryFont", primaryFont},
                        {"logicalWidth", window->width()},
                        {"logicalHeight", window->height()},
                        {"physicalWidth", image.width()},
                        {"physicalHeight", image.height()},
                        {"dpr", window->devicePixelRatio()},
                        {"positionMs", double(host.playback.positionMs())},
                        {"lyricRows", host.playback.lyrics()->rowCount()},
                        {"initialPreparationMs", double(preparationMs)},
                        {"scope",
                         "Real installed package and production PlaybackPage; "
                         "authored local PCM and 80 mixed-language lyric rows; "
                         "capture-only process, no performance result"}})
            .toJson(QJsonDocument::Indented));
    host.playback.stop();
    return;
  }
  const auto before = memory();
  const auto filesBefore = filesUnder(host.temporary.path());
  QVERIFY(presentationReady(window, mode));
  SampleIdentity identity(window, mode);
  identity.check(host.playback, track.id);
  QVERIFY2(identity.failures.isEmpty(),
           qPrintable(identity.failures.join(';')));
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
        auto *swapchain = static_cast<QRhiSwapChain *>(interface->getResource(
            window, QSGRendererInterface::RhiSwapchainResource));
        if (rhi && swapchain) {
          samples->gpuSupported = rhi->isFeatureSupported(QRhi::Timestamps);
          if (samples->gpuDevice.isEmpty())
            samples->gpuDevice =
                QString::fromUtf8(rhi->driverInfo().deviceName);
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
  QElapsedTimer heartbeatClock;
  heartbeatClock.start();
  QTimer heartbeat;
  heartbeat.setTimerType(Qt::PreciseTimer);
  heartbeat.setInterval(4);
  connect(&heartbeat, &QTimer::timeout, this, [&] {
    heartbeatGaps.append(heartbeatClock.nsecsElapsed() / 1e6);
    heartbeatClock.restart();
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
  runEventLoop(6000);
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
  const auto visibleMemory = memory();
  identity.check(host.playback, track.id);
  QVERIFY2(identity.failures.isEmpty(),
           qPrintable(identity.failures.join(';')));
  // Rendering may have an ordinary worker frame in flight. The measured
  // interval has ended; require a new, actually ready frame before accepting
  // its end identity, and keep this wait out of the six-second metrics.
  QElapsedTimer tailReadiness;
  tailReadiness.start();
  QVERIFY2(awaitPresentation(window, mode, 30000),
           "Presentation did not draw a ready frame after steady sampling");
  const auto tailReadinessMs = tailReadiness.elapsed();
  identity.check(host.playback, track.id);
  QVERIFY2(identity.failures.isEmpty(),
           qPrintable(identity.failures.join(';')));
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
  const int cycleCount =
      qBound(0, qEnvironmentVariableIntValue("FOLIA_PERF_CYCLES"), 10);
  for (int cycle = 0; cycle < cycleCount; ++cycle) {
    auto next = track;
    next.id += QString("-cycle-%1").arg(cycle);
    next.title += QString(" %1").arg(cycle);
    host.playback.playTracks({next}, 0, "Authored benchmark",
                             "folia-benchmark");
    QVERIFY(awaitEvent(
        [&] { return host.playback.playing() && !host.playback.loading(); },
        10000));
    QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, next.id));
    window->showNormal();
    window->raise();
    window->requestActivate();
    QVERIFY(awaitEvent(
        [&] {
          return window->isVisible() &&
                 window->visibility() != QWindow::Minimized &&
                 window->isExposed();
        },
        5000));
    QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
    const bool ready = awaitPresentation(window, mode, 30000);
    if (!ready) {
      auto *skin = visual(window->contentItem(), "foliaPlaybackPage");
      auto *stage = skin ? visual(skin, "foliaVisualizerStage") : nullptr;
      auto *renderer =
          stage ? nativeObject(stage->property("renderer")) : nullptr;
      qInfo() << "Cycle readiness failure" << cycle << window->visibility()
              << window->isExposed()
              << (skin ? skin->property("presentationActive") : QVariant())
              << (stage ? stage->property("loadedMode") : QVariant())
              << (renderer ? renderer->property("busy") : QVariant())
              << (renderer ? renderer->property("currentIndex") : QVariant())
              << presentationResources(window);
    }
    QVERIFY(ready);
    QVERIFY2(
        seekAndPrepare(1200),
        "Cycle seek was not acknowledged or fresh presentation never drew");
    const auto visibleCycleMemory = memory();
    const auto visibleResources = presentationResources(window);
    // Keep minimization last: this fixed Qt/macOS combination fails direct
    // restoration even for an independent bare QQuickWindow (documented RED).
    // Close/show cycles remain comparable; do not report that platform gap as
    // a successful restoration or replace it with a hidden-window simulation.
    const bool minimized = cycle == cycleCount - 1;
    if (minimized)
      window->showMinimized();
    else {
      QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
      window->hide();
    }
    runEventLoop(1000);
    const auto resources = presentationResources(window);
    QVERIFY(!resources["hasDynamicStage"].toBool());
    QCOMPARE(resources["skinRunningFrameAnimationCount"].toInt(), 0);
    cycles.append(QJsonObject{
        {"cycle", cycle + 1},
        {"minimized", minimized},
        {"visible", visibleCycleMemory},
        {"hiddenAfter1s", memory()},
        {"visibleResources", visibleResources},
        {"hiddenResources", resources},
        {"hiddenFixtureStorage", filesUnder(host.temporary.path())}});
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
      {"postSampleReadyWaitMs", double(tailReadinessMs)},
      {"sampleValidity",
       QJsonObject{{"schemaVersion", 1},
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
      {"guiHeartbeatGaps", distribution(heartbeatGaps)},
      {"beforeSampling", before},
      {"visibleEnd", visibleMemory},
      {"sampledVisiblePeak", sampledPeak},
      {"hiddenAfter1s", hiddenMemory},
      {"hiddenResources", hiddenResources},
      {"repeatedSongOpenCloseCycles", cycles},
      {"minimizeRestoreScope",
       "minimized release measured on last cycle; direct minimized restoration "
       "remains a separately reproduced Qt/macOS RED; preceding cycles use "
       "ordinary close/hide/show"},
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
  const auto output = qEnvironmentVariable("FOLIA_CAPTURE_DIR") +
                      "/performance-" + mode + ".json";
  write(output, QJsonDocument(result).toJson(QJsonDocument::Indented));
  qInfo().noquote() << "FOLIA_RELEASE_PERFORMANCE"
                    << QJsonDocument(result).toJson(QJsonDocument::Compact);
  host.playback.stop();
}
QTEST_MAIN(FoliaPerformanceTest)
#include "folia-performance.moc"
