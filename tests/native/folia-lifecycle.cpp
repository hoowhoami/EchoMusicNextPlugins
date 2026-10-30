// Actual archive installation, PCM and production PlaybackPage. No replacement
// player, renderer, clock, analysis provider or authored model result.
#include "EchoPluginAppearance.h"
#include "EchoPluginGraphics.h"
#include "EchoPluginText.h"
#include "EchoPluginViewContext.h"
#include "ImageCapture.h"
#include "LyricLine.h"
#include "PluginRuntimeTestFixture.h"
#include <QJsonDocument>
#include <QQuickWindow>
#include <QSet>
#include <QtQml/qqmlextensionplugin.h>
#include <algorithm>
#include <cmath>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

namespace {
QObject *nativeObject(const QVariant &value) {
  return value.metaType() == QMetaType::fromType<QJSValue>()
             ? value.value<QJSValue>().toQObject()
             : value.value<QObject *>();
}
template <class Predicate> bool awaitEvent(Predicate predicate, int timeout) {
  QElapsedTimer clock;
  clock.start();
  while (!predicate() && clock.elapsed() < timeout)
    QTest::qWait(5);
  return predicate();
}
QList<QObject *> objects(QObject *root) {
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
QList<QPointer<QObject>> retained(QObject *root) {
  QList<QPointer<QObject>> result;
  for (auto *object : objects(root))
    result.append(object);
  return result;
}
bool gone(const QList<QPointer<QObject>> &values) {
  return std::all_of(values.begin(), values.end(),
                     [](const auto &value) { return value.isNull(); });
}
std::shared_ptr<EchoMusic::GpuMemoryBudget> gpuBudget(QObject *root) {
  auto *scope =
      root ? root->property("plugin").value<EchoMusic::EchoPluginContext *>()
           : nullptr;
  return scope && scope->graphics() ? scope->graphics()->memoryBudget()
                                    : nullptr;
}
bool gpuDrained(const std::shared_ptr<EchoMusic::GpuMemoryBudget> &budget) {
  return !budget ||
         (budget->native.used.load() == 0 && budget->targets.used.load() == 0 &&
          budget->readbacks.used.load() == 0 &&
          budget->submissions.used.load() == 0 &&
          budget->pendingSubmissions.load() == 0 &&
          budget->objects.load() == 0 && budget->surfaces.load() == 0);
}
QJsonObject resources(QObject *root) {
  // QObject lifetimes and the capture allocator are observable here. These
  // counters do not assert that driver-wide GPU caches or memory are zero.
  int frames = 0, workers = 0, glyphs = 0, textures = 0, meshes = 0;
  qint64 bytes = 0;
  for (auto *object : objects(root)) {
    const QByteArray name = object->metaObject()->className();
    frames +=
        name.contains("FrameAnimation") && object->property("running").toBool();
    workers += name.contains("WorkerScript");
    glyphs += object->inherits("EchoMusic::GlyphRun");
    textures += object->inherits("EchoMusic::FloatTexture");
    meshes += object->inherits("EchoMusic::PointMesh");
    if (object->inherits("EchoMusic::GlyphRun") ||
        object->inherits("EchoMusic::FloatTexture"))
      bytes += object->property("cacheBytes").toLongLong();
  }
  const auto capture = EchoMusic::ImageCapture::budgetSnapshot();
  const auto gpu = gpuBudget(root);
  return {
      {"objects", objects(root).size()},
      {"runningFrames", frames},
      {"workers", workers},
      {"glyphs", glyphs},
      {"floatTextures", textures},
      {"pointMeshes", meshes},
      {"reportedCacheBytes", double(bytes)},
      {"gpuNativeBytes", gpu ? double(gpu->native.used.load()) : 0},
      {"gpuTargetBytes", gpu ? double(gpu->targets.used.load()) : 0},
      {"gpuReadbackBytes", gpu ? double(gpu->readbacks.used.load()) : 0},
      {"gpuSubmissionBytes", gpu ? double(gpu->submissions.used.load()) : 0},
      {"gpuPendingSubmissions", gpu ? gpu->pendingSubmissions.load() : 0},
      {"gpuObjects", gpu ? gpu->objects.load() : 0},
      {"gpuSurfaces", gpu ? gpu->surfaces.load() : 0},
      {"captureJobs", capture.pendingJobs},
      {"captureLeases", capture.leaseCount},
      {"captureReservedBytes", double(capture.reservedBytes)},
      {"captureEncodedBytes", double(capture.encodedBytes)}};
}
bool captureDrained() {
  const auto state = EchoMusic::ImageCapture::budgetSnapshot();
  return state.pendingJobs == 0 && state.leaseCount == 0 &&
         state.reservedBytes == 0 && state.encodedBytes == 0 &&
         state.outputReservedBytes == 0;
}
QByteArray pcmWave() {
  constexpr int rate = 16000, seconds = 300;
  QByteArray samples;
  samples.reserve(rate * seconds * 2);
  QDataStream pcm(&samples, QIODevice::WriteOnly);
  pcm.setByteOrder(QDataStream::LittleEndian);
  for (int i = 0; i < rate * seconds; ++i)
    pcm << qint16(std::sin(i * 2.0 * 3.141592653589793 * 220 / rate) * 1800);
  QByteArray wave;
  QDataStream out(&wave, QIODevice::WriteOnly);
  out.setByteOrder(QDataStream::LittleEndian);
  out.writeRawData("RIFF", 4);
  out << quint32(36 + samples.size());
  out.writeRawData("WAVEfmt ", 8);
  out << quint32(16) << quint16(1) << quint16(1) << quint32(rate)
      << quint32(rate * 2) << quint16(2) << quint16(16);
  out.writeRawData("data", 4);
  out << quint32(samples.size());
  wave += samples;
  return wave;
}
QJsonArray authoredRows(int count, bool stressSegmentation = false) {
  QJsonArray rows;
  // The six normal rows cover the complete real five-minute PCM, so a later
  // mode is not mistaken for a render failure after the authored lyrics end.
  const int interval = count == 6 ? 50000 : 2000;
  for (int i = 0; i < count; ++i)
    rows.append(QJsonObject{
        {"start_ms", i * interval},
        {"duration_ms", interval},
        {"words", QJsonArray{}},
        {"text", QString("Lifecycle source %1 海边的风 office")
                     .arg(i)
                     .repeated(stressSegmentation ? 32 : 1)},
        {"translation", QString("Lifecycle translation %1").arg(i)}});
  return rows;
}
struct Fixture {
  Host host;
  std::unique_ptr<QObject> root;
  QQuickWindow *window = nullptr;
  QObject *page = nullptr;
  QString installation, error;
  EchoMusic::PlaybackTrack track;
  double originalVolume = host.playback.volume();
  ~Fixture() {
    host.playback.stop();
    host.playback.setVolume(originalVolume);
  }
  bool setup(bool lyrics) {
    host.shell.attachPlayback(host.playback);
    host.shell.attachTheme(host.theme);
    host.theme.setMotionEnabled(true);
    host.playback.setVolume(0);
    const auto archive = qEnvironmentVariable("FOLIA_TEST_PACKAGE");
    if (!QFileInfo(archive).isFile() || !archive.endsWith(".echomod")) {
      error = "This acceptance requires the actual .echomod archive";
      return false;
    }
    host.runtime.importDirectory(archive);
    if (!awaitEvent(
            [&] {
              installation =
                  host.runtime.installationForId("folia-lyrics-skin");
              return !installation.isEmpty() && !host.runtime.loading() &&
                     host.runtime.state(installation) == PluginRuntime::Active;
            },
            20000)) {
      error = "Actual archive did not activate";
      return false;
    }
    QQmlComponent component(&host.engine);
    component.setData(R"(
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.Playback
ApplicationWindow {
  id: window
  width: 1100; height: 820; visible: true
  required property PlaybackService playback
  PlaybackPage { id: page; playback: window.playback }
  function openPlayback() { page.open(); }
  function closePlayback() { page.close(); }
})",
                      QUrl("qrc:/folia-installed-lifecycle.qml"));
    root.reset(component.createWithInitialProperties(
        {{"playback", QVariant::fromValue(&host.playback)}}));
    window = root ? qobject_cast<QQuickWindow *>(root.get()) : nullptr;
    if (!window) {
      error = component.errorString();
      return false;
    }
    page = root->findChild<QObject *>("playbackPage");
    if (!page || !QMetaObject::invokeMethod(root.get(), "openPlayback") ||
        !awaitEvent([&] { return window->isExposed(); }, 10000)) {
      error = "Production PlaybackPage did not open";
      return false;
    }
    track.id = "folia-lifecycle-real-pcm";
    track.title = "Lifecycle source";
    track.artist = "Authored QA PCM";
    track.durationMs = 300000;
    track.localPath = host.temporary.filePath("lifecycle.wav");
    write(track.localPath, pcmWave());
    host.playback.playTracks({track}, 0, "Actual lifecycle", "folia-lifecycle");
    if (!awaitEvent(
            [&] { return host.playback.playing() && !host.playback.loading(); },
            15000)) {
      error = host.playback.errorMessage();
      return false;
    }
    // Author a document through the real host lyric editor, as in folia-host;
    // playback time and the audio engine remain entirely native.
    if (lyrics && !host.playback.lyricText()->replace(
                      {{"lines", authoredRows(6)}}, track.id)) {
      error = "Canonical authored lyric document was rejected";
      return false;
    }
    return true;
  }
  QQuickItem *skin() {
    return visual(window->contentItem(), "foliaPlaybackPage");
  }
  QObject *stage() {
    return skin() ? visual(skin(), "foliaVisualizerStage") : nullptr;
  }
  QObject *renderer() {
    return stage() ? nativeObject(stage()->property("renderer")) : nullptr;
  }
  EchoMusic::AppearanceConfiguration *configuration() {
    const auto entries = host.theme.extensions()->entries("skin");
    return entries.size() == 1 ? entries.first()->configuration() : nullptr;
  }
  bool choose() {
    const auto entries = host.theme.extensions()->entries("skin");
    return entries.size() == 1 &&
           host.theme.extensions()->chooseSkin(entries.first()->key);
  }
  bool rewind() {
    QSignalSpy completed(&host.playback, &PlaybackService::seekCompleted);
    host.playback.seek(0);
    host.playback.play();
    return awaitEvent(
        [&] {
          return completed.count() > 0 && host.playback.playing() &&
                 !host.playback.loading() &&
                 host.playback.positionMs() < 1500 &&
                 host.playback.errorMessage().isEmpty();
        },
        10000);
  }
  QObject *actor() {
    auto *s = stage();
    if (!s || s->property("layerCount").toInt() != 1)
      return nullptr;
    const auto value = s->property("actors");
    if (value.metaType() == QMetaType::fromType<QJSValue>())
      return value.value<QJSValue>().property(0).toQObject();
    const auto actors = value.toList();
    return actors.size() == 1 ? nativeObject(actors.first()) : nullptr;
  }
  bool nativeReady() {
    auto *contents = visual(window->contentItem(), "nativePlaybackContents");
    auto *viewport =
        contents ? visual(contents, "playbackLyricViewport") : nullptr;
    if (skin() || !window->isExposed() || !contents || !contents->isVisible() ||
        !page->property("presentationActive").toBool() || !viewport ||
        !viewport->property("resourceActive").toBool())
      return false;
    for (auto *object : objects(viewport))
      if (auto *line = qobject_cast<EchoMusic::LyricLine *>(object);
          line && line->isVisible() && line->current() &&
          !line->text().isEmpty() && line->renderBatches() > 0)
        return true;
    return false;
  }
  bool ready(const QString &mode) {
    auto *s = stage(), *r = renderer();
    auto *a = actor();
    auto *contents = visual(window->contentItem(), "nativePlaybackContents");
    if (!s || !r || !a || nativeObject(a->property("renderer")) != r ||
        !a->property("hasFrame").toBool() || !window->isExposed() ||
        !skin()->property("presentationActive").toBool() || !contents ||
        contents->isVisible() || s->property("loadedMode").toString() != mode ||
        s->property("layerCount").toInt() != 1 ||
        s->property("transitionWaits").toBool() ||
        s->property("transitionBytes").toDouble() != 0 ||
        !s->property("errorString").toString().isEmpty() ||
        !r->property("errorString").toString().isEmpty() ||
        !r->property("renderError").toString().isEmpty() ||
        r->property("busy").toBool())
      return false;
    // Default background is Latent. Prove the actual new GPU sources rendered
    // before accepting the lyric frame; a never-allocated all-zero budget is
    // not evidence that close/drain works.
    if (mode != "still") {
      auto *background = visual(skin(), "foliaLatentBackground");
      const auto gpu = gpuBudget(skin());
      const auto reported =
          background ? background->property("gpuStatus") : QVariant{};
      const auto status = reported.metaType() == QMetaType::fromType<QJSValue>()
                              ? reported.value<QJSValue>().toVariant().toMap()
                              : reported.toMap();
      if (!background || !background->property("renderReady").toBool() ||
          !background->property("errorString").toString().isEmpty() ||
          !status.value("available").toBool() ||
          status.value("backend").toString().isEmpty() || !gpu ||
          gpu->native.used.load() <= 0 || gpu->targets.used.load() <= 0 ||
          gpu->objects.load() <= 0 || gpu->surfaces.load() <= 0)
        return false;
    }
    if (mode == "still") {
      auto *text = visual(qobject_cast<QQuickItem *>(r), "stillPrimary1");
      return text && text->isVisible() &&
             !text->property("text").toString().isEmpty() &&
             text->width() > 0 && text->height() > 0;
    }
    if (r->metaObject()->indexOfProperty("renderReady") >= 0 &&
        !r->property("renderReady").toBool())
      return false;
    // These modes retire shaping GlyphRuns after baking. Prepared resources
    // alone are insufficient: the actor above must have reported a real frame.
    if (mode == "diorama")
      return r->property("renderReady").toBool() &&
             r->property("resourceCount").toInt() > 0 &&
             r->property("layerCount").toInt() > 0 &&
             r->property("totalCacheBytes").toLongLong() > 0;
    if (mode == "lumiere")
      return r->property("renderReady").toBool() &&
             r->property("nodeCount").toInt() > 0 &&
             r->property("totalCacheBytes").toLongLong() > 0;
    for (auto *child : objects(r))
      if (child->property("renderBatches").toInt() > 0)
        return true;
    return false;
  }
  bool awaitRendered(const QString &mode, int deadline) {
    // The stage's forced transition timeout is not a first-frame proof. Also
    // require a fresh presentation after resolving the complete current tree.
    bool candidate = false, swapped = false;
    QObject observer;
    const auto connection = QObject::connect(
        window, &QQuickWindow::frameSwapped, &observer,
        [&] {
          if (candidate)
            swapped = true;
        },
        Qt::QueuedConnection);
    const bool result = awaitEvent(
        [&] {
          if (!(mode == "native" ? nativeReady() : ready(mode))) {
            candidate = swapped = false;
            return false;
          }
          if (!candidate) {
            candidate = true;
            window->update();
          }
          return swapped;
        },
        deadline);
    QObject::disconnect(connection);
    return result;
  }
  QString status(const QString &mode) {
    auto data = resources(skin());
    data.insert("requestedMode", mode);
    if (auto *s = stage()) {
      data.insert("loadedMode", s->property("loadedMode").toString());
      data.insert("layers", s->property("layerCount").toInt());
      data.insert("waits", s->property("transitionWaits").toBool());
      data.insert("transitionBytes", s->property("transitionBytes").toDouble());
      data.insert("stageError", s->property("errorString").toString());
    }
    if (auto *r = renderer()) {
      data.insert("rendererBusy", r->property("busy").toBool());
      data.insert("rendererReady", r->property("renderReady").toBool());
      data.insert("rendererError", r->property("errorString").toString());
    }
    if (auto *a = actor())
      data.insert("actorHasFrame", a->property("hasFrame").toBool());
    return QString::fromUtf8(
        QJsonDocument(data).toJson(QJsonDocument::Compact));
  }
};
} // namespace

class FoliaLifecycleTest : public QObject {
  Q_OBJECT
  QJsonArray m_evidence;
  void record(const QString &phase, QObject *object) {
    auto data = resources(object);
    data.insert("phase", phase);
    m_evidence.append(data);
    qInfo().noquote() << QJsonDocument(data).toJson(QJsonDocument::Compact);
  }
  void warnings() {
    QTest::failOnWarning(
        QRegularExpression("invalid context|TypeError:|ReferenceError:|Binding "
                           "loop|Unable to assign|is not a function"));
  }
private slots:
  void singleSkinIsLazyAndNativeReturnAndDisableDrain() {
    warnings();
    configureUiTypography();
    Fixture f;
    QVERIFY2(f.setup(true), qPrintable(f.error));
    QVERIFY2(f.awaitRendered("native", 15000), qPrintable(f.status("native")));
    QCOMPARE(f.host.theme.extensions()->entries("skin").size(), 1);
    QCOMPARE(f.host.theme.extensions()->selectedSkin(), QString("cover"));
    auto *activation = f.host.runtime.context(f.installation);
    QVERIFY(activation);
    QVERIFY(!f.skin());
    QCOMPARE(activation->findChildren<EchoMusic::EchoPluginContext *>().size(),
             0);
    record("never-selected", f.skin());
    QTest::qWait(200);
    QVERIFY(!f.skin());
    QVERIFY(f.choose());
    QTRY_VERIFY(f.skin());
    QVERIFY2(f.awaitRendered("classic", 45000),
             qPrintable(f.status("classic")));
    auto retired = retained(f.skin());
    auto oldGpu = gpuBudget(f.skin());
    QPointer<EchoMusic::EchoPluginContext> oldScope =
        f.skin()->property("plugin").value<EchoMusic::EchoPluginContext *>();
    QVERIFY(oldScope && oldScope->active());
    QVERIFY(f.host.theme.extensions()->chooseSkin("cover"));
    QTRY_VERIFY(!f.skin());
    QTRY_VERIFY_WITH_TIMEOUT(gone(retired) && oldScope.isNull() &&
                                 captureDrained() && gpuDrained(oldGpu),
                             10000);
    QCOMPARE(activation->findChildren<EchoMusic::EchoPluginContext *>().size(),
             0);
    QVERIFY2(f.awaitRendered("native", 15000),
             qPrintable(f.status("native return")));
    record("native-return", f.skin());
    QTest::qWait(200);
    QVERIFY(!f.skin());
    QVERIFY(f.choose());
    QTRY_VERIFY(f.skin());
    QVERIFY2(f.awaitRendered("classic", 45000),
             qPrintable(f.status("classic")));
    retired = retained(f.skin());
    oldGpu = gpuBudget(f.skin());
    oldScope =
        f.skin()->property("plugin").value<EchoMusic::EchoPluginContext *>();
    QVERIFY(f.host.runtime.setEnabled(f.installation, false));
    QTRY_COMPARE_WITH_TIMEOUT(f.host.runtime.state(f.installation),
                              PluginRuntime::Disabled, 15000);
    QTRY_VERIFY(gone(retired) && oldScope.isNull() && captureDrained() &&
                gpuDrained(oldGpu));
    QCOMPARE(f.host.theme.extensions()->selectedSkin(), QString("cover"));
    QCOMPARE(f.host.theme.extensions()->entries("skin").size(), 0);
    QVERIFY2(f.awaitRendered("native", 15000),
             qPrintable(f.status("native disabled")));
    QVERIFY(f.host.runtime.uninstall(f.installation, true));
    QTRY_VERIFY(
        f.host.runtime.installationForId("folia-lyrics-skin").isEmpty());
    record("uninstalled", f.skin());
  }
  void allFourteenMotionModesRetireWorkersGraphicsAndReopen() {
    warnings();
    configureUiTypography();
    Fixture f;
    QVERIFY2(f.setup(true), qPrintable(f.error));
    QVERIFY(f.choose());
    QTRY_VERIFY(f.skin());
    QVERIFY(f.host.theme.motionEnabled());
    const QStringList modes{"classic",  "cadenza",  "partita", "tilt",
                            "claddagh", "cappella", "pendolo", "fume",
                            "tempera",  "lumiere",  "sonnet",  "monet",
                            "diorama",  "still"};
    for (const auto &mode : modes) {
      // Each mode starts from a genuinely acknowledged native seek. The
      // aggregate preparation deadlines can exceed this five-minute source.
      QVERIFY2(f.rewind(), qPrintable(mode + " native rewind"));
      const auto previous = retained(f.renderer());
      const auto priorMode =
          f.stage() ? f.stage()->property("loadedMode").toString() : QString();
      QVERIFY(f.configuration()->patch({{"mode", mode}}));
      QTRY_VERIFY(!f.configuration()->busy());
      QVERIFY2(f.awaitRendered(mode, 45000), qPrintable(f.status(mode)));
      if (priorMode != mode)
        QVERIFY2(awaitEvent([&] { return gone(previous); }, 5000),
                 qPrintable(mode));
      if (mode != "still") {
        QVERIFY(f.host.theme.motionEnabled());
        QVERIFY(f.host.playback.playing());
        QVERIFY(resources(f.skin())["runningFrames"].toInt() > 0);
        QPointer<QObject> clock = visual(f.skin(), "foliaPresentationClock");
        QVERIFY(clock);
        QSignalSpy positions(&f.host.playback, SIGNAL(positionChanged()));
        QSignalSpy presentations(clock, SIGNAL(renderTimeChanged()));
        QVERIFY(positions.isValid() && presentations.isValid());
        const auto positionBefore = f.host.playback.positionMs();
        const auto presentationBefore = clock->property("renderTime");
        const bool advanced = awaitEvent(
            [&] {
              return positions.count() >= 2 && presentations.count() >= 2;
            },
            5000);
        const QJsonObject motionStatus{
            {"mode", mode},
            {"positionSignals", positions.count()},
            {"presentationSignals", presentations.count()},
            {"positionBefore", positionBefore},
            {"positionAfter", f.host.playback.positionMs()},
            {"presentationBefore", presentationBefore.toDouble()},
            {"presentationAfter",
             clock ? clock->property("renderTime").toDouble() : -1},
            {"clockLive", clock && clock->property("live").toBool()},
            {"clockRetiring", !clock || clock->property("retiring").toBool()},
            {"playing", f.host.playback.playing()},
            {"loading", f.host.playback.loading()},
            {"error", f.host.playback.errorMessage()}};
        QVERIFY2(advanced, QJsonDocument(motionStatus)
                               .toJson(QJsonDocument::Compact)
                               .constData());
        auto motion = resources(f.skin());
        motion.insert("phase", mode + ":native-motion");
        motion.insert("nativePositionSignals", positions.count());
        motion.insert("presentationSignals", presentations.count());
        m_evidence.append(motion);
        qInfo().noquote() << QJsonDocument(motion).toJson(
            QJsonDocument::Compact);
      }
      record(mode + ":visible", f.skin());
      const auto retired = retained(f.skin());
      const auto retiredGpu = gpuBudget(f.skin());
      QPointer<EchoMusic::EchoPluginContext> scope =
          f.skin()->property("plugin").value<EchoMusic::EchoPluginContext *>();
      QVERIFY(QMetaObject::invokeMethod(f.root.get(), "closePlayback"));
      QVERIFY2(awaitEvent(
                   [&] {
                     return !f.skin() && gone(retired) && scope.isNull() &&
                            captureDrained() && gpuDrained(retiredGpu);
                   },
                   10000),
               qPrintable(mode + " close/drain"));
      record(mode + ":closed", f.skin());
      QVERIFY(QMetaObject::invokeMethod(f.root.get(), "openPlayback"));
      QVERIFY2(f.awaitRendered(mode, 45000),
               qPrintable(f.status(mode + " reopen")));
      QCOMPARE(f.configuration()->values().value("mode").toString(), mode);
      record(mode + ":reopened", f.skin());
    }
  }
  void noLyricsAndClearedQueueRejectLatePreparation() {
    warnings();
    configureUiTypography();
    Fixture f;
    QVERIFY2(f.setup(false), qPrintable(f.error));
    QCOMPARE(f.host.playback.lyrics()->rowCount(), 0);
    QVERIFY(f.choose());
    QTRY_VERIFY(f.skin() && f.stage());
    QTest::qWait(350);
    QCOMPARE(f.stage()->property("lyricCount").toInt(), 0);
    record("no-lyrics", f.skin());
    QVERIFY(f.host.playback.lyricText()->replace(
        {{"lines", authoredRows(128, true)}}, f.track.id));
    QVERIFY(f.configuration()->patch({{"mode", "diorama"}}));
    QTRY_VERIFY(!f.configuration()->busy());
    QPointer<QObject> preparingLayout;
    QPointer<EchoMusic::EchoPluginOperation> preparingOperation;
    QPointer<EchoMusic::EchoPluginContext> scope =
        f.skin()->property("plugin").value<EchoMusic::EchoPluginContext *>();
    QVERIFY(scope && scope->text());
    QPointer<EchoMusic::EchoPluginText> text = scope->text();
    QVERIFY(awaitEvent(
        [&] {
          if (!f.stage() ||
              f.stage()->property("loadedMode").toString() != "diorama" ||
              !text || text->isDrained())
            return false;
          for (auto *object : objects(f.renderer())) {
            if (!object->property("readBatches").isValid())
              continue;
            auto *operation = qobject_cast<EchoMusic::EchoPluginOperation *>(
                nativeObject(object->property("_operation")));
            if (operation && !operation->finished()) {
              preparingLayout = object;
              preparingOperation = operation;
              return true;
            }
          }
          return false;
        },
        15000));
    QVERIFY(preparingLayout && preparingOperation && text &&
            !text->isDrained());
    const auto generation = preparingLayout->property("_generation").toInt();
    QSignalSpy drained(text, &EchoMusic::EchoPluginText::drained);
    QPointer<QObject> clearingStage = f.stage();
    QVERIFY(clearingStage);
    auto *dynamic = visual(f.skin(), "foliaDynamicPresentationHost");
    QVERIFY(dynamic);
    QPointer<QObject> clearingPresentation =
        nativeObject(dynamic->property("item"));
    QVERIFY(clearingPresentation);
    QPointer<QObject> clearingPreparation =
        nativeObject(clearingPresentation->property("preparation"));
    QVERIFY(clearingPreparation);
    const auto preparingObjects = retained(clearingPresentation);
    const auto clearedStageMetadata = [&] {
      auto *stage = f.stage();
      return !stage ||
             (stage->property("lyricCount").toInt() == 0 &&
              stage->property("songTitle").toString() ==
                  f.host.playback.title() &&
              stage->property("songTitle").toString() != f.track.title &&
              stage->property("songArtist").toString().isEmpty());
    };
    record("actual-native-segmentation-before-clear", f.skin());
    f.host.playback.queue()->clear();
    QTRY_VERIFY(!f.host.playback.hasTrack());
    QTRY_COMPARE(f.host.playback.lyrics()->rowCount(), 0);
    QTRY_VERIFY(clearedStageMetadata());
    QVERIFY(awaitEvent(
        [&] { return !text || (text->isDrained() && drained.count() > 0); },
        20000));
    QVERIFY(!preparingOperation ||
            preparingOperation->state() ==
                EchoMusic::EchoPluginOperation::Canceled);
    QVERIFY(!preparingLayout ||
            preparingLayout->property("_generation").toInt() > generation);
    QVERIFY(awaitEvent(
        [&] {
          for (auto *object : objects(f.skin()))
            if (object->property("busy").toBool())
              return false;
          return EchoMusic::ImageCapture::budgetSnapshot().pendingJobs == 0;
        },
        20000));
    const bool presentationRetiredAtDrain = clearingPresentation.isNull();
    QTest::qWait(1200);
    QCOMPARE(f.host.playback.lyrics()->rowCount(), 0);
    QVERIFY(clearedStageMetadata());
    if (!f.stage()) {
      // Closing an empty playback page retires its dynamic Loader. Require
      // actual destruction of the in-flight tree, not only a missing lookup.
      QVERIFY(!clearingStage && !clearingPresentation && !clearingPreparation);
      QVERIFY(gone(preparingObjects));
      QVERIFY(!f.renderer());
    } else {
      QVERIFY(!presentationRetiredAtDrain);
      dynamic = visual(f.skin(), "foliaDynamicPresentationHost");
      QVERIFY(dynamic);
      auto *presentation = nativeObject(dynamic->property("item"));
      QVERIFY(presentation);
      auto *prepared = nativeObject(presentation->property("preparation"));
      QVERIFY(prepared);
      const auto lines = prepared->property("preparedLines");
      const auto data = lines.metaType() == QMetaType::fromType<QJSValue>()
                            ? lines.value<QJSValue>().toVariant()
                            : lines;
      QVERIFY(data.toList().isEmpty());
    }
    for (auto *object : objects(f.skin()))
      QVERIFY(!object->property("busy").toBool());
    QVERIFY(captureDrained());
    // The actual native job has now returned and drained. The remaining
    // settled interval only detects subsequent publication; it is not itself
    // a claim that busy=false proves all WorkerScript engines have stopped.
    record("cleared-after-native-segmentation-drain", f.skin());
    const auto retired = retained(f.skin());
    QVERIFY(f.host.theme.extensions()->chooseSkin("cover"));
    QTRY_VERIFY_WITH_TIMEOUT(gone(retired) && captureDrained(), 10000);
  }
  void cleanupTestCase() {
    const auto directory = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
    if (!directory.isEmpty()) {
      QVERIFY(QDir().mkpath(directory));
      write(directory + "/lifecycle-resources.json",
            QJsonDocument(m_evidence).toJson());
    }
  }
};
QTEST_MAIN(FoliaLifecycleTest)
#include "folia-lifecycle.moc"
