// Actual installed settings controls, pointer events and authoritative
// QSaveFile.
#include "EchoPluginAppearance.h"
#include "EchoPluginContext.h"
#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include <QImage>
#include <QtQml/qqmlextensionplugin.h>
#include <cmath>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

namespace {
QVariant plainValue(QVariant value) {
  return value.metaType() == QMetaType::fromType<QJSValue>()
             ? value.value<QJSValue>().toVariant()
             : value;
}
void events(int ms) {
  QEventLoop loop;
  QTimer::singleShot(ms, &loop, &QEventLoop::quit);
  loop.exec();
}
QObject *visibleDrawer(QObject *root) {
  for (auto *object : root->findChildren<QObject *>("lyricSkinDrawer"))
    if (object->property("visible").toBool() &&
        object->metaObject()->indexOfMethod("close()") >= 0)
      return object;
  return nullptr;
}
QQuickItem *currentSlider(QQuickWindow *window) {
  for (int attempt = 0; attempt < 5; ++attempt) {
    QPointer<QQuickItem> body = visual(window->contentItem(), "foliaSettings");
    if (!body) {
      events(100);
      continue;
    }
    QPointer<QQuickItem> slider = visual(body, "foliaSubtitleFontScale");
    if (!slider)
      return nullptr;
    QPointer<QQuickItem> viewport = slider->parentItem();
    while (viewport && !viewport->property("contentY").isValid())
      viewport = viewport->parentItem();
    if (!viewport)
      return nullptr;
    const auto center =
        slider->mapToScene(QPointF(slider->width() / 2, slider->height() / 2));
    viewport->setProperty("contentY",
                          viewport->property("contentY").toDouble() +
                              center.y() - window->height() / 2);
    events(100);
    if (body && slider &&
        body == visual(window->contentItem(), "foliaSettings"))
      return slider;
  }
  return nullptr;
}
} // namespace

class FoliaSettingsTest : public QObject {
  Q_OBJECT
private slots:
  void actualSliderHoldsReleasesAndCloses();
  void visiblePreviewChangesPixelsBeforeSaveAndRestoresAfterReload();
};

void FoliaSettingsTest::actualSliderHoldsReleasesAndCloses() {
  QTest::failOnWarning(
      QRegularExpression("invalid context|TypeError:|ReferenceError:|is not a "
                         "function|Binding loop"));
  configureUiTypography();
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.theme.setMotionEnabled(false);
  host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
  QString installation;
  QTRY_VERIFY(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  auto *catalog = host.theme.extensions();
  auto *entry = catalog->entries("skin").first();
  QVERIFY(entry->configuration()->patch({{"mode", "still"}}));
  QTRY_VERIFY(!entry->configuration()->busy());
  QVERIFY(catalog->chooseSkin(entry->key));
  QQmlComponent component(&host.engine);
  component.setData(R"(
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.Playback
ApplicationWindow {
  id: window
  width: 720; height: 480; visible: true
  required property PlaybackService playback
  PlaybackPage { id: page; playback: window.playback }
  function openPlayback() { page.open(); }
})",
                    QUrl("qrc:/folia-settings-production.qml"));
  std::unique_ptr<QObject> root(component.createWithInitialProperties(
      {{"playback", QVariant::fromValue(&host.playback)}}));
  QVERIFY2(root, qPrintable(component.errorString()));
  auto *window = qobject_cast<QQuickWindow *>(root.get());
  QVERIFY(window);
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  auto *page = root->findChild<QObject *>("playbackPage");
  QVERIFY(page);
  QVERIFY(QMetaObject::invokeMethod(page, "openSkins"));
  QQuickItem *card = nullptr;
  QTRY_VERIFY((card = visual(window->contentItem(), "pluginLyricSkinCard")));
  QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
  window->raise();
  window->requestActivate();
  if (QGuiApplication::platformName() == "cocoa")
    QVERIFY(QTest::qWaitForWindowActive(window, 5000));
  QPointer<QQuickItem> body;
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  // Installed preview uses the same style implementation, with an explicit
  // sample clock that must be destroyed when this part leaves the viewport.
  auto *previewLoader =
      body->findChild<QObject *>("foliaSettingsPreviewLoader");
  QVERIFY(previewLoader);
  QVERIFY(!previewLoader->property("item").value<QObject *>());
  QPointer<QQuickItem> toggle = visual(body, "foliaSettingsPreviewToggle");
  QVERIFY(toggle);
  QTest::mouseClick(
      window, Qt::LeftButton, Qt::NoModifier,
      toggle->mapToScene(QPointF(toggle->width() / 2, toggle->height() / 2))
          .toPoint());
  QPointer<QObject> previewInstance;
  QTRY_VERIFY(
      (previewInstance = previewLoader->property("item").value<QObject *>()));
  QPointer<QObject> sampleClock;
  QTRY_VERIFY(
      (sampleClock =
           previewInstance->property("sampleClock").value<QObject *>()));
  QVERIFY(body->property("previewExpanded").toBool());
  QPointer<QObject> previousClock = sampleClock;
  QVERIFY(currentSlider(window));
  QTRY_VERIFY(!previousClock);
  QTRY_VERIFY(!previewInstance);
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  QVERIFY(body->property("previewExpanded").toBool());
  qInfo() << "settings phase: preview released outside scroll viewport";
  QPointer<QObject> draft = body->findChild<QObject *>("foliaSettingsDraft");
  QVERIFY(draft);
  auto *view = body->property("page").value<EchoPluginViewContext *>();
  QVERIFY(view);
  QSignalSpy closing(view, &EchoPluginViewContext::aboutToClose);
  bool activeWhileClosing = false;
  connect(view, &EchoPluginViewContext::aboutToClose, this,
          [&] { activeWhileClosing = view->active(); });
  auto *configuration = entry->configuration();
  QTRY_VERIFY(!configuration->busy());
  QPointer<QQuickItem> slider = currentSlider(window);
  QVERIFY(slider);
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  draft = body->findChild<QObject *>("foliaSettingsDraft");
  QVERIFY(draft);
  auto point = [&](double x) {
    return slider
        ->mapToScene(QPointF(slider->width() * x, slider->height() - 12))
        .toPoint();
  };
  const auto original =
      configuration->values().value("subtitleFontScale").toDouble();
  QSignalSpy busyChanges(configuration, &AppearanceConfiguration::busyChanged);
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, point(.2));
  QTRY_VERIFY(slider && slider->property("pressed").toBool());
  QVERIFY(draft->property("held").toBool());
  QTest::mouseMove(window, point(.8));
  QTest::mouseMove(window, point(.9));
  const auto preview = plainValue(draft->property("values"))
                           .toMap()
                           .value("subtitleFontScale")
                           .toDouble();
  QVERIFY(preview > original);
  QCOMPARE(configuration->values().value("subtitleFontScale").toDouble(),
           original);
  QCOMPARE(busyChanges.count(), 0);
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier, point(.9));
  qInfo() << "settings phase: first release";
  QTRY_VERIFY(draft && !draft->property("held").toBool());
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(configuration->values().value("subtitleFontScale").toDouble(),
           preview);
  QCOMPARE(busyChanges.count(), 2); // one real asynchronous write: busy -> idle
  QFile saved(host.runtime.context(installation)->dataPath() +
              "/appearance/skin/folia.json");
  QVERIFY(saved.open(QIODevice::ReadOnly));
  QCOMPARE(QJsonDocument::fromJson(saved.readAll())
               .object()
               .value("subtitleFontScale")
               .toDouble(),
           preview);
  saved.close();
  qInfo() << "settings phase: saved readback";
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, point(.2));
  QTRY_VERIFY(slider && slider->property("pressed").toBool());
  const auto closingPreview = plainValue(draft->property("values"))
                                  .toMap()
                                  .value("subtitleFontScale")
                                  .toDouble();
  QVERIFY(closingPreview < preview);
  QPointer<QObject> drawer = visibleDrawer(root.get());
  QVERIFY(drawer);
  QVERIFY(QMetaObject::invokeMethod(drawer, "close"));
  qInfo() << "settings phase: ordinary close requested";
  QTRY_VERIFY(!visual(window->contentItem(), "foliaSettings"));
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(configuration->values().value("subtitleFontScale").toDouble(),
           closingPreview);
  QCOMPARE(closing.count(), 1);
  QVERIFY(activeWhileClosing);
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier, QPoint(2, 2));
  qInfo() << "settings phase: ordinary close verified";

  // The modal image pool has its own durable draft. Ordinary outer close must
  // submit it before the same presentation lease expires, including when an
  // unrelated numeric setting is already queued in the authoritative writer.
  QVERIFY(configuration->patch({{"mode", "tempera"}}));
  QTRY_VERIFY(!configuration->busy());
  QVERIFY(QMetaObject::invokeMethod(page, "openSkins"));
  QTRY_VERIFY((card = visual(window->contentItem(), "pluginLyricSkinCard")));
  QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  QObject *pool = nullptr;
  QTRY_VERIFY((pool = body->findChild<QObject *>("temperaImageStore")));
  QTRY_VERIFY(!pool->property("busy").toBool());
  QVERIFY(QMetaObject::invokeMethod(pool, "open"));
  QVERIFY(pool->property("opened").toBool());
  QVERIFY(QMetaObject::invokeMethod(
      pool, "setTuning",
      Q_ARG(QVariant, QVariant(QVariantMap{{"frequency", .8}}))));
  QCOMPARE(
      configuration->values().value("temperaLayerImageFrequency").toDouble(),
      .6);
  QVERIFY(configuration->patch({{"lyricsFontScale", 1.1}}));
  QVERIFY(configuration->busy());
  QTRY_VERIFY((drawer = visibleDrawer(root.get())));
  QVERIFY(QMetaObject::invokeMethod(drawer, "close"));
  QTRY_VERIFY(!visual(window->contentItem(), "foliaSettings"));
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(
      configuration->values().value("temperaLayerImageFrequency").toDouble(),
      .8);
  QCOMPARE(configuration->values().value("lyricsFontScale").toDouble(), 1.1);
  qInfo() << "settings phase: modal image draft persisted on outer close";

  // Retiring the plugin is different from ordinary settings close: its old
  // presentation must not publish held edits after the activation is revoked.
  QVERIFY(QMetaObject::invokeMethod(page, "openSkins"));
  QTRY_VERIFY((card = visual(window->contentItem(), "pluginLyricSkinCard")));
  QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  draft = body->findChild<QObject *>("foliaSettingsDraft");
  QVERIFY(draft);
  slider = currentSlider(window);
  QVERIFY(slider);
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  draft = body->findChild<QObject *>("foliaSettingsDraft");
  QVERIFY(draft);
  auto *retiringView = body->property("page").value<EchoPluginViewContext *>();
  QSignalSpy retiredClosing(retiringView, &EchoPluginViewContext::aboutToClose);
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, point(.85));
  QTRY_VERIFY(slider && slider->property("pressed").toBool());
  QVERIFY(plainValue(draft->property("values"))
              .toMap()
              .value("subtitleFontScale")
              .toDouble() > closingPreview);
  const auto persistedPath = saved.fileName();
  QVERIFY(host.runtime.setEnabled(installation, false));
  qInfo() << "settings phase: plugin retired";
  QTRY_VERIFY(host.runtime.state(installation) != PluginRuntime::Active);
  QTRY_VERIFY(!visual(window->contentItem(), "foliaSettings"));
  events(100);
  QCOMPARE(retiredClosing.count(), 0);
  QFile persisted(persistedPath);
  QVERIFY(persisted.open(QIODevice::ReadOnly));
  QCOMPARE(QJsonDocument::fromJson(persisted.readAll())
               .object()
               .value("subtitleFontScale")
               .toDouble(),
           closingPreview);
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier, QPoint(2, 2));
}

void FoliaSettingsTest::
    visiblePreviewChangesPixelsBeforeSaveAndRestoresAfterReload() {
  QTest::failOnWarning(
      QRegularExpression("invalid context|TypeError:|ReferenceError:|is not a "
                         "function|Binding loop"));
  configureUiTypography();
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.theme.setMotionEnabled(false);
  const auto archive = qEnvironmentVariable("FOLIA_TEST_PACKAGE");
  QVERIFY(QFileInfo(archive).isFile() && archive.endsWith(".echomod"));
  host.runtime.importDirectory(archive);
  QString installation;
  QTRY_VERIFY(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  auto *catalog = host.theme.extensions();
  auto *entry = catalog->entries("skin").first();
  QVERIFY(entry->configuration()->patch({{"mode", "still"}}));
  QTRY_VERIFY(!entry->configuration()->busy());
  QVERIFY(catalog->chooseSkin(entry->key));
  QQmlComponent component(&host.engine);
  component.setData(R"(
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.Playback
ApplicationWindow {
  id: window
  width: 960; height: 1280; visible: true
  required property PlaybackService playback
  PlaybackPage { id: page; playback: window.playback }
  function openPlayback() { page.open(); }
})",
                    QUrl("qrc:/folia-visible-settings-preview.qml"));
  std::unique_ptr<QObject> root(component.createWithInitialProperties(
      {{"playback", QVariant::fromValue(&host.playback)}}));
  QVERIFY2(root, qPrintable(component.errorString()));
  auto *window = qobject_cast<QQuickWindow *>(root.get());
  QVERIFY(window);
  window->raise();
  window->requestActivate();
  QVERIFY(QTest::qWaitForWindowExposed(window, 5000));
  if (QGuiApplication::platformName() == "cocoa")
    QVERIFY(QTest::qWaitForWindowActive(window, 5000));
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  auto *page = root->findChild<QObject *>("playbackPage");
  QVERIFY(page);
  auto click = [window](QQuickItem *item) {
    QTest::mouseClick(
        window, Qt::LeftButton, Qt::NoModifier,
        item->mapToScene(QPointF(item->width() / 2, item->height() / 2))
            .toPoint());
  };
  auto openSettings = [&]() -> bool {
    if (!QMetaObject::invokeMethod(page, "openSkins"))
      return false;
    QElapsedTimer deadline;
    deadline.start();
    QQuickItem *card = nullptr;
    while (!(card = visual(window->contentItem(), "pluginLyricSkinCard")) &&
           deadline.elapsed() < 5000)
      events(10);
    return card && QMetaObject::invokeMethod(card, "chosen");
  };
  QVERIFY(openSettings());
  QPointer<QQuickItem> body;
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  auto *toggle = visual(body, "foliaSettingsPreviewToggle");
  QVERIFY(toggle);
  click(toggle);
  QPointer<QQuickItem> preview;
  auto *loader = body->findChild<QObject *>("foliaSettingsPreviewLoader");
  QVERIFY(loader);
  QTRY_VERIFY((preview = qobject_cast<QQuickItem *>(
                   loader->property("item").value<QObject *>())));
  QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 20000);
  auto *pause = visual(preview, "foliaPreviewPause");
  QVERIFY(pause);
  click(pause);
  QTRY_VERIFY(preview->property("paused").toBool());
  QPointer<QQuickItem> primary = visual(preview, "stillPrimary1");
  QVERIFY(primary && !primary->property("text").toString().isEmpty());
  QPointer<QQuickItem> slider = visual(body, "foliaLyricsFontScale");
  QVERIFY(slider);
  QPointer<QQuickItem> viewport = slider->parentItem();
  while (viewport && !viewport->property("contentY").isValid())
    viewport = viewport->parentItem();
  QVERIFY(viewport);
  // Scroll the real form once so the rendered primary line and the slider
  // coexist inside its actual clipped viewport; do not disable clipping or
  // substitute the preview. The original 480px unload case remains separate.
  const auto beforeScroll = viewport->mapRectToScene(viewport->boundingRect());
  const auto first = primary->mapRectToScene(primary->boundingRect()).top();
  viewport->setProperty("contentY", viewport->property("contentY").toDouble() +
                                        first - beforeScroll.top() - 16);
  events(100);
  QVERIFY(preview && primary && slider);
  const auto visibleRect =
      viewport->mapRectToScene(viewport->boundingRect())
          .intersected(QRectF(0, 0, window->width(), window->height()));
  const auto beforePrimary = primary->mapRectToScene(primary->boundingRect());
  const auto beforeSlider = slider->mapRectToScene(slider->boundingRect());
  const auto targetRect = beforePrimary.united(beforeSlider);
  qInfo() << "settings visibility before joint scroll: window" << window->size()
          << "viewport" << visibleRect << "primary" << beforePrimary << "slider"
          << beforeSlider << "contentY" << viewport->property("contentY")
          << "contentHeight" << viewport->property("contentHeight");
  // Aligning only the primary line to a fixed top inset is insufficient when
  // the real form puts the slider near the viewport's bottom. Use the measured
  // interval that keeps both complete items visible. If it cannot fit, retain
  // the original visibility assertions below instead of weakening the gate.
  const auto minimumScroll = targetRect.bottom() - visibleRect.bottom();
  const auto maximumScroll = targetRect.top() - visibleRect.top();
  if (minimumScroll <= maximumScroll) {
    const auto correction = qBound(minimumScroll, 0., maximumScroll);
    if (correction != 0) {
      viewport->setProperty(
          "contentY", viewport->property("contentY").toDouble() + correction);
      events(100);
      QVERIFY(preview && primary && slider);
    }
  }
  qInfo() << "settings visibility after joint scroll: viewport" << visibleRect
          << "primary" << primary->mapRectToScene(primary->boundingRect())
          << "slider" << slider->mapRectToScene(slider->boundingRect())
          << "contentY" << viewport->property("contentY") << "jointHeight"
          << targetRect.height() << "jointCanFit"
          << (minimumScroll <= maximumScroll);
  QVERIFY2(
      visibleRect.contains(primary->mapRectToScene(primary->boundingRect())),
      "The actual preview primary line must remain in the clipped viewport");
  QVERIFY2(visibleRect.contains(slider->mapRectToScene(slider->boundingRect())),
           "The actual input slider must share the visible viewport with the "
           "preview");
  auto *configuration = entry->configuration();
  const auto original =
      configuration->values().value("lyricsFontScale").toDouble();
  QCOMPARE(primary->scale(), original);
  const auto oldGeometry = primary->mapRectToScene(primary->boundingRect());
  const auto oldPixels = window->grabWindow();
  QVERIFY(!oldPixels.isNull());
  const auto ratio = double(oldPixels.width()) / window->width();
  const auto sceneCrop =
      preview->mapRectToScene(preview->boundingRect()).intersected(visibleRect);
  const QRect crop(int(std::floor(sceneCrop.x() * ratio)),
                   int(std::floor(sceneCrop.y() * ratio)),
                   int(std::floor(sceneCrop.width() * ratio)),
                   int(std::floor(sceneCrop.height() * ratio)));
  QVERIFY(!crop.isEmpty());
  const auto before = oldPixels.copy(crop);
  QSignalSpy writes(configuration, &AppearanceConfiguration::busyChanged);
  auto point = [&](double x) {
    return slider
        ->mapToScene(QPointF(slider->width() * x, slider->height() - 12))
        .toPoint();
  };
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, point(.2));
  QTRY_VERIFY(slider->property("pressed").toBool());
  QTest::mouseMove(window, point(.9));
  QTRY_VERIFY(primary && primary->scale() > original + .1);
  QTRY_VERIFY(primary->mapRectToScene(primary->boundingRect()).width() >
              oldGeometry.width() * 1.1);
  QCOMPARE(configuration->values().value("lyricsFontScale").toDouble(),
           original);
  QCOMPARE(writes.count(), 0);
  events(80);
  const auto after = window->grabWindow().copy(crop);
  QVERIFY(before != after);
  const auto savedScale = primary->scale();
  const auto savedWidth =
      primary->mapRectToScene(primary->boundingRect()).width();
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier, point(.9));
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(configuration->values().value("lyricsFontScale").toDouble(),
           savedScale);
  QCOMPARE(writes.count(), 2);
  QVERIFY(preview && primary);
  const auto captures = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
  if (!captures.isEmpty()) {
    QVERIFY(before.save(captures + "/live-preview-before.png"));
    QVERIFY(after.save(captures + "/live-preview-held.png"));
  }
  auto *drawer = visibleDrawer(root.get());
  QVERIFY(drawer && QMetaObject::invokeMethod(drawer, "close"));
  QTRY_VERIFY(!preview && !primary &&
              !visual(window->contentItem(), "foliaSettings"));
  QFile file(host.runtime.context(installation)->dataPath() +
             "/appearance/skin/folia.json");
  QVERIFY(file.open(QIODevice::ReadOnly));
  QCOMPARE(QJsonDocument::fromJson(file.readAll())
               .object()["lyricsFontScale"]
               .toDouble(),
           savedScale);
  file.close();
  QVERIFY(host.runtime.reload(installation));
  QTRY_VERIFY(!host.runtime.loading());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  entry = catalog->entries("skin").first();
  QCOMPARE(entry->configuration()->values().value("lyricsFontScale").toDouble(),
           savedScale);
  QVERIFY(catalog->chooseSkin(entry->key));
  QVERIFY(openSettings());
  QTRY_VERIFY((body = visual(window->contentItem(), "foliaSettings")));
  toggle = visual(body, "foliaSettingsPreviewToggle");
  QVERIFY(toggle);
  click(toggle);
  loader = body->findChild<QObject *>("foliaSettingsPreviewLoader");
  QVERIFY(loader);
  QTRY_VERIFY((preview = qobject_cast<QQuickItem *>(
                   loader->property("item").value<QObject *>())));
  QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 20000);
  primary = visual(preview, "stillPrimary1");
  QVERIFY(primary && !primary->property("text").toString().isEmpty());
  QCOMPARE(primary->scale(), savedScale);
  QVERIFY(qAbs(primary->mapRectToScene(primary->boundingRect()).width() -
               savedWidth) < 1);
  qInfo() << "actual preview geometry/pixels updated while held, one write, "
             "ordinary close and native reload restored";
}

QTEST_MAIN(FoliaSettingsTest)
#include "folia-settings.moc"
