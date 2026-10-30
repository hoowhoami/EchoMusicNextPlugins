// Test-only access to native fixtures. No host internals enter the plugin
// package.
#include "EchoPluginAppearance.h"
#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include <QFontDatabase>
#include <QWheelEvent>
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

class FoliaHostTest : public QObject {
  Q_OBJECT
private slots:
  void actualPackageInProductionPage();
};

void FoliaHostTest::actualPackageInProductionPage() {
  QTest::failOnWarning(QRegularExpression(
      "Could not find any constructor for value type QQuickFontValueType.*"));
  QTest::failOnWarning(QRegularExpression(
      "invalid context|TypeError:|ReferenceError:|is not a function"));
  configureUiTypography();
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.theme.setMotionEnabled(false);
  QString lyricFamily;
  const auto candidates = QStringList{"Menlo", "DejaVu Sans Mono", "Consolas"} +
                          QFontDatabase::families();
  for (const auto &family : candidates)
    if (QFontDatabase::hasFamily(family) &&
        !host.theme.applicationFont().families().contains(family)) {
      lyricFamily = family;
      break;
    }
  QVERIFY2(!lyricFamily.isEmpty(),
           "Font inheritance acceptance requires a distinct installed font");
  host.theme.setLyricFont(lyricFamily);
  QCOMPARE(host.theme.lyricBaseFont().families().first(), lyricFamily);
  QStringList warnings;
  connect(&host.engine, &QQmlEngine::warnings, this,
          [&](const QList<QQmlError> &errors) {
            for (const auto &error : errors)
              warnings.append(error.toString());
          });
  host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
  QString installation;
  QTRY_VERIFY(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty());
  QTRY_VERIFY(!host.runtime.loading());
  QCOMPARE(host.runtime.state(installation), PluginRuntime::Active);
  auto *catalog = host.theme.extensions();
  QCOMPARE(catalog->entries("skin").size(), 1);
  QCOMPARE(catalog->selectedSkin(), QString("cover"));
  auto *entry = catalog->entries("skin").first();
  QCOMPARE(entry->title, QString("Folia"));

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
})",
                    QUrl("qrc:/folia-production-acceptance.qml"));
  std::unique_ptr<QObject> root(component.createWithInitialProperties(
      {{"playback", QVariant::fromValue(&host.playback)}}));
  QVERIFY2(root, qPrintable(component.errorString()));
  auto *window = qobject_cast<QQuickWindow *>(root.get());
  QVERIFY(window);
  qInfo() << "Folia acceptance graphics backend:"
          << window->rendererInterface()->graphicsApi();
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  auto *page = root->findChild<QObject *>("playbackPage");
  QVERIFY(page);
  QVERIFY(QMetaObject::invokeMethod(page, "openSkins"));
  QQuickItem *grid = nullptr;
  QTRY_VERIFY((grid = visual(window->contentItem(), "lyricSkinCatalog")));
  QCOMPARE(grid->property("count").toInt(),
           3); // Two native skins plus one Folia candidate.
  QQuickItem *card = nullptr;
  QTRY_VERIFY((card = visual(grid, "pluginLyricSkinCard")));
  QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
  QTRY_COMPARE(catalog->selectedSkin(), entry->key);
  QQuickItem *skin = nullptr;
  QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
  QVERIFY(visual(skin, "foliaStylePicker"));
  QVERIFY(visual(skin, "foliaSharedCapsule"));
  QPointer<EchoPluginViewContext> view =
      skin->property("page").value<EchoPluginViewContext *>();
  QPointer<AppearanceConfiguration> configuration =
      skin->property("configuration").value<AppearanceConfiguration *>();
  QVERIFY(view && view->active());
  QVERIFY(configuration && configuration->active());
  QCOMPARE(configuration->values().value("mode").toString(),
           QString("classic"));
  // Still is an explicit test baseline; the product keeps Folia's Classic
  // default.
  QVERIFY(configuration->patch({{"mode", "still"}}));
  QTRY_VERIFY(!configuration->busy());
  QQuickItem *primary = nullptr;
  QTRY_VERIFY((primary = visual(skin, "stillPrimary1")));
  // The original Folia categories have an ordered built-in chain. Custom
  // families prepend it, and the public font builder retains the host fallback.
  const QStringList sourceSans{"Inter",
                               "Noto Sans CJK SC",
                               "Noto Sans JP",
                               "Source Han Sans SC",
                               "PingFang SC",
                               "Hiragino Sans GB",
                               "Microsoft YaHei",
                               "Helvetica Neue",
                               "Arial"};
  auto *fonts = host.runtime.context(installation)->fonts();
  QCOMPARE(primary->property("font").value<QFont>().families(),
           fonts->build(sourceSans).families());
  QVERIFY(configuration->patch({{"fontFamilies", QVariantList{lyricFamily}}}));
  QTRY_VERIFY(!configuration->busy());
  const auto customChain =
      fonts->build(QStringList{lyricFamily} + sourceSans).families();
  QTRY_COMPARE(primary->property("font").value<QFont>().families(),
               customChain);
  QCOMPARE(customChain.first(), lyricFamily);
  QQmlComponent clockComponent(
      &host.engine,
      QUrl::fromLocalFile(host.runtime.context(installation)->package().root +
                          "/qml/shared/PresentationClock.qml"));
  QPointer<QObject> presentationClock =
      clockComponent.createWithInitialProperties(
          {{"page", QVariant::fromValue(view.data())}});
  QVERIFY2(presentationClock, qPrintable(clockComponent.errorString()));
  presentationClock->setParent(skin);
  qobject_cast<QQuickItem *>(presentationClock.data())->setParentItem(skin);
  QSignalSpy presented(presentationClock, SIGNAL(renderTimeChanged()));
  QSignalSpy telemetry(view->player(), &EchoPluginPlayer::positionChanged);
  // Choosing a skin invalidates the drawer's old delegate generation.
  QTRY_VERIFY((card = visual(window->contentItem(), "pluginLyricSkinCard")));
  QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
  QQuickItem *settings = nullptr;
  QTRY_VERIFY(
      (settings = visual(window->contentItem(), "pluginSkinSettingsHost")));
  QTRY_VERIFY(settings->property("loaded").toBool());
  auto *settingsBody = visual(settings, "foliaSettings");
  QVERIFY(settingsBody);
  QVERIFY(QMetaObject::invokeMethod(
      settingsBody, "persist",
      Q_ARG(QVariant,
            QVariant(QVariantMap{{"cappellaEmojiPackSource", "custom"}}))));
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(configuration->values().value("cappellaEmojiPackSource").toString(),
           QString("builtin"));
  QVERIFY(settingsBody->property("commandError")
              .toString()
              .contains(QString::fromUtf8("先导入")));
  QVERIFY(configuration->patch(
      {{"lyricsFontScale", 1.2}, {"hideTranslationSubtitle", true}}));
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(entry->configuration()->values().value("lyricsFontScale").toDouble(),
           1.2);
  QVERIFY(QFile::exists(host.runtime.context(installation)->dataPath() +
                        "/appearance/skin/folia.json"));
  QVERIFY(!configuration->patch({{"mode", "unimplemented"}}));
  QCOMPARE(configuration->values().value("mode").toString(), QString("still"));
  QVERIFY(configuration->patch({{"hideTranslationSubtitle", false}}));
  QTRY_VERIFY(!configuration->busy());
  auto *drawer = root->findChild<QObject *>("lyricSkinDrawer");
  QVERIFY(drawer);
  QVERIFY(QMetaObject::invokeMethod(drawer, "close"));
  QTRY_VERIFY(!visual(window->contentItem(), "pluginSkinSettingsHost"));

  // Authored local PCM and lyrics use the production decoder/output and model.
  // Position is never injected: the actual audio engine advances every row.
  QByteArray pcm;
  QDataStream samples(&pcm, QIODevice::WriteOnly);
  samples.setByteOrder(QDataStream::LittleEndian);
  constexpr int rate = 16000, seconds = 12;
  for (int i = 0; i < rate * seconds; ++i)
    samples << qint16(std::sin(i * 2.0 * 3.141592653589793 * 440 / rate) *
                      2000);
  QByteArray wave;
  QDataStream header(&wave, QIODevice::WriteOnly);
  header.setByteOrder(QDataStream::LittleEndian);
  header.writeRawData("RIFF", 4);
  header << quint32(36 + pcm.size());
  header.writeRawData("WAVEfmt ", 8);
  header << quint32(16) << quint16(1) << quint16(1) << quint32(rate)
         << quint32(rate * 2) << quint16(2) << quint16(16);
  header.writeRawData("data", 4);
  header << quint32(pcm.size());
  wave.append(pcm);
  const auto audioFile = host.temporary.path() + "/folia-fixture.wav";
  write(audioFile, wave);
  PlaybackTrack track;
  track.id = "folia-authored-fixture";
  track.title = "Folia 原生验收音频";
  track.localPath = audioFile;
  track.durationMs = seconds * 1000;
  const auto originalVolume = host.playback.volume();
  host.playback.setVolume(0);
  auto restoreVolume =
      qScopeGuard([&] { host.playback.setVolume(originalVolume); });
  host.playback.playTracks({track}, 0, "Folia test", "folia-test");
  QTRY_VERIFY2_WITH_TIMEOUT(
      host.playback.playing() && !host.playback.loading(),
      qPrintable(QString("ready=%1 loading=%2 position=%3 error=%4")
                     .arg(host.playback.engineReady())
                     .arg(host.playback.loading())
                     .arg(host.playback.positionMs())
                     .arg(host.playback.errorMessage())),
      5000);
  QJsonArray rows;
  for (int row = 0; row < 6; ++row)
    rows.append(QJsonObject{
        {"text", QString("原生音频驱动的第 %1 行").arg(row)},
        {"start_ms", row * 2000},
        {"duration_ms", 2000},
        {"translation", QString("Authored fixture line %1").arg(row)},
        {"words", QJsonArray{}}});
  QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, track.id));
  QTRY_VERIFY_WITH_TIMEOUT(host.playback.positionMs() >= 2100, 7000);
  QVERIFY2(presented.count() > telemetry.count() + 10,
           qPrintable(QString("presentation=%1 telemetry=%2")
                          .arg(presented.count())
                          .arg(telemetry.count())));
  qInfo() << "Folia presentation updates:" << presented.count()
          << "engine position observations:" << telemetry.count();
  QTRY_VERIFY(presentationClock->property("renderTime").toDouble() >
              host.playback.positionMs() + 30);
  const auto beforeMetadataChange =
      presentationClock->property("renderTime").toDouble();
  host.playback.setVolume(0.001);
  QCOMPARE(presentationClock->property("renderTime").toDouble(),
           beforeMetadataChange);
  host.playback.setVolume(0);
  QTRY_COMPARE(primary->property("text").toString(),
               QString("原生音频驱动的第 1 行"));
  auto *sharedCapsule = visual(skin, "foliaSharedCapsule");
  QVERIFY(sharedCapsule);
  QTest::mouseMove(window, QPoint(10, 10));
  QTRY_VERIFY(!sharedCapsule->property("expanded").toBool());
  QVERIFY(visual(skin, "foliaCapsulePlayToggle"));
  auto hoverCapsule = [&] {
    auto *surface = visual(skin, "foliaPlayerCapsule");
    if (surface)
      QTest::mouseMove(window, surface
                                   ->mapToScene(QPointF(surface->width() / 2,
                                                        surface->height() / 2))
                                   .toPoint());
  };
  QVERIFY(
      configuration->patch({{"playerChromeVisibilityMode", "always-hidden"}}));
  QTRY_VERIFY(!configuration->busy());
  QTRY_VERIFY(!visual(skin, "foliaCapsulePlayToggle"));
  QVERIFY(
      configuration->patch({{"playerChromeVisibilityMode", "always-visible"}}));
  QTRY_VERIFY(!configuration->busy());
  QTRY_VERIFY(visual(skin, "foliaCapsulePlayToggle"));
  hoverCapsule();
  QTRY_VERIFY(sharedCapsule->property("expanded").toBool());
  auto *firstSlot = visual(skin, "foliaCapsuleSlot0");
  QVERIFY(firstSlot);
  QVERIFY2(firstSlot->x() > firstSlot->parentItem()->width() / 2,
           "Desktop capsule slots must sit to the right of the title/progress "
           "column");
  QVERIFY2(firstSlot->y() + firstSlot->height() <=
               firstSlot->parentItem()->height(),
           "Desktop slot controls must stay inside the expanded capsule");
  auto *toggle = visual(skin, "foliaCapsulePlayToggle");
  QVERIFY(toggle && toggle->isVisible());
  QVERIFY(QMetaObject::invokeMethod(toggle, "clicked"));
  QTRY_VERIFY(!host.playback.playing());
  // playing changes when pause is accepted; the last output-block position
  // can arrive afterwards. Observe stability after that native acknowledgement.
  QTest::qWait(350);
  const auto pausedAt = host.playback.positionMs();
  const auto frozenAt = presentationClock->property("renderTime").toDouble();
  QTest::qWait(300);
  QCOMPARE(host.playback.positionMs(), pausedAt);
  QCOMPARE(presentationClock->property("renderTime").toDouble(), frozenAt);
  // The settings entry uses the public closeSkinSettings operation. The
  // production drawer must disappear before the full-page drag can be used.
  QVERIFY(QMetaObject::invokeMethod(page, "openSkins"));
  QTRY_VERIFY((grid = visual(window->contentItem(), "lyricSkinCatalog")));
  QTRY_VERIFY((card = visual(grid, "pluginLyricSkinCard")));
  QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
  QTRY_VERIFY(
      (settings = visual(window->contentItem(), "pluginSkinSettingsHost")));
  QTRY_VERIFY(settings->property("loaded").toBool());
  QVERIFY(visual(settings, "foliaCapsulePrimarySlot"));
  QVERIFY(visual(settings, "foliaCapsuleSecondarySlot"));
  QVERIFY(visual(settings, "foliaAlwaysShowTrackSwitchButtons"));
  QVERIFY(visual(settings, "foliaCapsuleBottomOffset"));
  auto *positionEntry = visual(settings, "foliaCapsulePositioningEntry");
  QVERIFY(positionEntry && positionEntry->isEnabled());
  QVERIFY(QMetaObject::invokeMethod(positionEntry, "clicked"));
  QTRY_VERIFY(!visual(window->contentItem(), "pluginSkinSettingsHost"));
  QTRY_VERIFY(sharedCapsule->property("positioning").toBool());
  auto *surface = visual(skin, "foliaPlayerCapsule");
  QVERIFY(surface);
  const auto dragFrom =
      surface->mapToScene(QPointF(surface->width() / 2, surface->height() / 2))
          .toPoint();
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, dragFrom);
  QTest::mouseMove(window, dragFrom - QPoint(0, 80), 40);
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier,
                      dragFrom - QPoint(0, 80));
  QTRY_VERIFY(sharedCapsule->property("liveBottomOffset").toInt() >= 100);
  QCOMPARE(configuration->values().value("playerBottomBarOffset").toInt(), 32);
  const auto committedOffset =
      sharedCapsule->property("liveBottomOffset").toInt();
  QTest::keyClick(window, Qt::Key_Return);
  QTRY_VERIFY(!sharedCapsule->property("positioning").toBool());
  QTRY_VERIFY(!configuration->busy());
  QCOMPARE(configuration->values().value("playerBottomBarOffset").toInt(),
           committedOffset);
  bool started = false;
  QVERIFY(QMetaObject::invokeMethod(sharedCapsule, "startPositioning",
                                    Q_RETURN_ARG(bool, started)));
  QVERIFY(started);
  surface = visual(skin, "foliaPlayerCapsule");
  const auto cancelFrom =
      surface->mapToScene(QPointF(surface->width() / 2, surface->height() / 2))
          .toPoint();
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, cancelFrom);
  QTest::mouseMove(window, cancelFrom + QPoint(0, 50), 40);
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier,
                      cancelFrom + QPoint(0, 50));
  QTest::keyClick(window, Qt::Key_Escape);
  QTRY_VERIFY(!sharedCapsule->property("positioning").toBool());
  QCOMPARE(sharedCapsule->property("liveBottomOffset").toInt(),
           committedOffset);
  QCOMPARE(configuration->values().value("playerBottomBarOffset").toInt(),
           committedOffset);
  QVERIFY(configuration->patch({{"alwaysShowTrackSwitchButtons", true}}));
  QTRY_VERIFY(!configuration->busy());

  // The default secondary slot opens one lazy virtual model and performs a
  // real scoped seek. startMs already includes the host lyric offset.
  auto *offsetOperation = view->command("globalOffset", {{"value", 500}});
  auto offsetRoot = host.engine.newQObject(offsetOperation);
  QTRY_COMPARE(offsetOperation->state(), EchoPluginOperation::Succeeded);
  QTRY_COMPARE(view->player()->lyricsInfo().value("globalOffsetMs").toInt(),
               500);
  QTRY_COMPARE(view->player()->lyricsInfo().value("offsetMs").toInt(), -500);
  QCOMPARE(view->player()->lyrics()->row(2).value("startMs").toInt(), 3500);
  auto *timelineHost = visual(skin, "foliaTimelineHost");
  QVERIFY(timelineHost && !timelineHost->property("active").toBool());
  auto *timelineSlot = visual(skin, "foliaCapsuleSlot1");
  QVERIFY(timelineSlot && timelineSlot->isEnabled());
  QVERIFY(QMetaObject::invokeMethod(timelineSlot, "clicked"));
  QQuickItem *timeline = nullptr;
  QTRY_VERIFY((timeline = visual(skin, "foliaLyricsTimeline")));
  auto *timelineLines = visual(timeline, "foliaTimelineLines");
  QVERIFY(timelineLines);
  QCOMPARE(timelineLines->property("count").toInt(), 6);
  QVERIFY(timelineLines->property("reuseItems").toBool());
  QQuickItem *timelineRow = nullptr;
  QTRY_VERIFY((timelineRow = visual(timeline, "foliaTimelineRow2")));
  QTest::mouseClick(window, Qt::LeftButton, Qt::NoModifier,
                    timelineRow
                        ->mapToScene(QPointF(timelineRow->width() / 2,
                                             timelineRow->height() / 2))
                        .toPoint());
  QTRY_VERIFY(host.playback.positionMs() >= 3400 &&
              host.playback.positionMs() <= 3600);
  QVERIFY(QMetaObject::invokeMethod(visual(timeline, "foliaTimelineClose"),
                                    "clicked"));
  auto *resetGlobalOffset = view->command("globalOffset", {{"value", 0}});
  auto resetOffsetRoot = host.engine.newQObject(resetGlobalOffset);
  QTRY_COMPARE(resetGlobalOffset->state(), EchoPluginOperation::Succeeded);
  QTRY_VERIFY(!timelineHost->property("active").toBool());
  QVERIFY(!visual(skin, "foliaLyricsTimeline"));
  auto *progressSlider = visual(skin, "foliaCapsuleSeek");
  QVERIFY(progressSlider && progressSlider->isEnabled());
  const auto seekFrom = progressSlider
                            ->mapToScene(QPointF(progressSlider->width() * 0.3,
                                                 progressSlider->height() / 2))
                            .toPoint();
  const auto seekTo = progressSlider
                          ->mapToScene(QPointF(progressSlider->width() * 0.7,
                                               progressSlider->height() / 2))
                          .toPoint();
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, seekFrom);
  QTest::mouseMove(window, seekTo, 40);
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier, seekTo);
  QTRY_VERIFY(host.playback.positionMs() >= 8100 &&
              host.playback.positionMs() <= 8500);
  QVERIFY(!host.playback.playing());
  QVERIFY(QMetaObject::invokeMethod(
      sharedCapsule, "issue", Q_ARG(QString, "seek"),
      Q_ARG(QVariant,
            QVariantMap({{"value", 1}, {"revision", "expired-revision"}}))));
  QTRY_VERIFY(!skin->property("commandError").toString().isEmpty());
  QVERIFY(visual(skin, "foliaCommandError")->isVisible());

  QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "auto-hide"}}));
  QTRY_VERIFY(!configuration->busy());
  auto *chrome = skin->findChild<QObject *>("foliaChromeVisibility");
  QVERIFY(chrome);
  QVERIFY(chrome->property("pending").toBool());
  QTest::mouseMove(window, QPoint(550, 300));
  QTest::mousePress(window, Qt::LeftButton, Qt::NoModifier, QPoint(550, 300));
  QTRY_VERIFY(chrome->property("pointerHeld").toBool());
  QVERIFY(!chrome->property("pending").toBool());
  QTest::mouseRelease(window, Qt::LeftButton, Qt::NoModifier, QPoint(550, 300));
  QTRY_VERIFY(!chrome->property("pointerHeld").toBool());
  QTRY_VERIFY(chrome->property("hidden").toBool());
  QTRY_VERIFY(!visual(skin, "foliaCapsulePlayToggle"));
  QTest::qWait(400);
  QVERIFY(chrome->property("hidden").toBool());
  QWheelEvent wheel(QPointF(550, 300), window->mapToGlobal(QPoint(550, 300)),
                    QPoint(), QPoint(0, 120), Qt::NoButton, Qt::NoModifier,
                    Qt::NoScrollPhase, false);
  QCoreApplication::sendEvent(window, &wheel);
  QTRY_VERIFY(!chrome->property("hidden").toBool());
  QTest::mouseMove(window, QPoint(560, 310));
  QTRY_VERIFY(!chrome->property("hidden").toBool());
  QTRY_VERIFY((toggle = visual(skin, "foliaCapsulePlayToggle")));
  auto *hover = skin->findChild<QObject *>("foliaChromeHover");
  QVERIFY(hover);
  QTest::mouseMove(window, QPoint(-10, -10));
  QTRY_VERIFY(!hover->property("hovered").toBool());
  QTRY_VERIFY(chrome->property("hidden").toBool());
  QTest::mouseMove(window, QPoint(560, 310));
  QTRY_VERIFY(hover->property("hovered").toBool());
  QTRY_VERIFY(!chrome->property("hidden").toBool());
  QTRY_VERIFY((toggle = visual(skin, "foliaCapsulePlayToggle")));
  // Exercise the real 260ms path as well as reduced motion. An interrupted
  // exit retains the same surface; a completed exit releases the controls.
  host.theme.setMotionEnabled(true);
  auto *transportHost = visual(skin, "foliaCapsuleHost");
  QVERIFY(transportHost);
  QPointer<QQuickItem> fadingSurface = visual(skin, "foliaPlayerCapsule");
  QVERIFY(fadingSurface);
  QVERIFY(
      configuration->patch({{"playerChromeVisibilityMode", "always-hidden"}}));
  QTRY_VERIFY(transportHost->opacity() < 1);
  QVERIFY(transportHost->opacity() > 0);
  QVERIFY(fadingSurface);
  QVERIFY(!transportHost->isEnabled());
  QVERIFY(
      configuration->patch({{"playerChromeVisibilityMode", "always-visible"}}));
  QTRY_COMPARE(transportHost->opacity(), 1.);
  QCOMPARE(visual(skin, "foliaPlayerCapsule"), fadingSurface.data());
  QVERIFY(
      configuration->patch({{"playerChromeVisibilityMode", "always-hidden"}}));
  QTRY_VERIFY(fadingSurface.isNull());
  QVERIFY(!transportHost->property("active").toBool());
  QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "auto-hide"}}));
  QTRY_VERIFY((toggle = visual(skin, "foliaCapsulePlayToggle")));
  QTRY_VERIFY(!configuration->busy());
  host.theme.setMotionEnabled(false);
  auto *seek = view->command("seek", {{"value", 5000}});
  auto seekRoot = host.engine.newQObject(seek);
  QTRY_COMPARE(seek->state(), EchoPluginOperation::Succeeded);
  QTRY_VERIFY(host.playback.positionMs() >= 4900 &&
              host.playback.positionMs() <= 5100);
  QTRY_VERIFY(presentationClock->property("renderTime").toDouble() >= 4900 &&
              presentationClock->property("renderTime").toDouble() <= 5100);
  QTRY_COMPARE(primary->property("text").toString(),
               QString("原生音频驱动的第 2 行"));
  QVERIFY(QMetaObject::invokeMethod(toggle, "clicked"));
  QTRY_VERIFY(host.playback.playing());
  QTRY_VERIFY_WITH_TIMEOUT(host.playback.positionMs() > 5350, 5000);
  int completedPlayingSeeks = 0;
  bool clockResetAtSeekEvent = true;
  const auto seekConnection = connect(
      view->player(), &EchoPluginPlayer::eventOccurred, this,
      [&](const QString &event, const QVariantMap &) {
        if (event != "seek")
          return;
        ++completedPlayingSeeks;
        clockResetAtSeekEvent =
            clockResetAtSeekEvent &&
            std::abs(presentationClock->property("renderTime").toDouble() -
                     host.playback.positionMs()) < 2;
      });
  for (const auto target : {8000, 1000}) {
    qInfo() << "Folia playing seek target:" << target;
    auto *operation = view->command("seek", {{"value", target}});
    auto operationRoot = host.engine.newQObject(operation);
    QTRY_COMPARE(operation->state(), EchoPluginOperation::Succeeded);
    const auto expected = target == 8000 ? 1 : 2;
    QTRY_COMPARE(completedPlayingSeeks, expected);
    QVERIFY(clockResetAtSeekEvent);
    QVERIFY(host.playback.playing());
  }
  disconnect(seekConnection);
  // Choose the real dynamic renderers within the same installed skin and PCM
  // session. Qt's offscreen software scene graph must show a recovery message,
  // never empty success.
  host.playback.pause();
  QTRY_VERIFY(!host.playback.playing());
  const auto plainValue = [](QVariant value) {
    return value.metaType() == QMetaType::fromType<QJSValue>()
               ? value.value<QJSValue>().toVariant()
               : value;
  };
  auto nativeObject = [](const QVariant &value) -> QObject * {
    return value.metaType() == QMetaType::fromType<QJSValue>()
               ? value.value<QJSValue>().toQObject()
               : value.value<QObject *>();
  };
  skin->setProperty(
      "commandError",
      QString()); // The stale-operation banner was asserted above.
  for (const auto &mode :
       {QString("classic"), QString("cadenza"), QString("partita"),
        QString("tilt"), QString("claddagh"), QString("cappella"),
        QString("pendolo"), QString("fume"), QString("tempera"),
        QString("lumiere"), QString("sonnet"), QString("monet"),
        QString("diorama")}) {
    QVERIFY(configuration->patch({{"mode", mode}}));
    QTRY_VERIFY(!configuration->busy());
    auto *dynamicHost = visual(skin, "foliaDynamicPresentationHost");
    QVERIFY(dynamicHost);
    if (!skin->property("nativeGraphicsAvailable").toBool()) {
      QVERIFY(!dynamicHost->property("active").toBool());
      auto *message = visual(skin, "foliaRenderError");
      QVERIFY(message && message->property("text").toString().contains(
                             QString::fromUtf8("图形后端")));
      continue;
    }
    QObject *dynamic = nullptr;
    QTRY_VERIFY((dynamic = nativeObject(dynamicHost->property("item"))));
    QObject *stage = nullptr;
    QTRY_VERIFY((stage = nativeObject(dynamic->property("stage"))));
    QObject *preparation = nativeObject(dynamic->property("preparation"));
    QObject *timeline = nativeObject(dynamic->property("timeline"));
    QVERIFY(preparation && timeline);
    QTRY_VERIFY_WITH_TIMEOUT(timeline->property("ready").toBool() &&
                                 !preparation->property("busy").toBool(),
                             15000);
    QTRY_COMPARE_WITH_TIMEOUT(stage->property("loadedMode").toString(), mode,
                              10000);
    QPointer<QObject> renderer = nativeObject(stage->property("renderer"));
    QVERIFY(renderer);
    if (mode == "diorama") {
      QTRY_VERIFY_WITH_TIMEOUT(!renderer->property("busy").toBool() &&
                                   renderer->property("layerCount").toInt() > 0,
                               20000);
      QVERIFY2(renderer->property("errorString").toString().isEmpty(),
               qPrintable(renderer->property("errorString").toString()));
      QVERIFY(renderer->property("totalCacheBytes").toDouble() > 0);
      QVERIFY(renderer->property("totalCacheBytes").toDouble() <=
              256 * 1024 * 1024);
      const auto reads = renderer->property("readBatches").toInt();
      QVERIFY(configuration->patch({{"dioramaGeometryMode", "corridor"},
                                    {"dioramaParticleDensity", 600}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()
                       .value("geometryVisibility")
                       .toMap()
                       .value("mode")
                       .toString(),
                   QString("corridor"));
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()
                       .value("particleDensity")
                       .toInt(),
                   600);
      QCOMPARE(renderer->property("readBatches").toInt(), reads);
    } else if (mode == "monet") {
      QTRY_VERIFY_WITH_TIMEOUT(renderer->property("renderReady").toBool(),
                               20000);
      QVERIFY2(renderer->property("errorString").toString().isEmpty(),
               qPrintable(renderer->property("errorString").toString()));
      QVERIFY(renderer->property("mountedLineCount").toInt() > 0);
      QVERIFY(configuration->patch({{"monetPortraitStyle", "rectangular"},
                                    {"monetShowAudioVisualization", true}}));
      QTRY_VERIFY_WITH_TIMEOUT(
          renderer->property("backdropTextureBytes").toDouble() > 0, 5000);
    } else if (mode == "sonnet") {
      QTRY_VERIFY_WITH_TIMEOUT(renderer->property("renderReady").toBool() &&
                                   renderer->property("actorCount").toInt() > 0,
                               20000);
      QVERIFY(renderer->property("totalCacheBytes").toDouble() > 0);
      QVERIFY(renderer->property("cachedSceneCount").toInt() <= 3);
      QVERIFY(configuration->patch({{"sonnetCameraIntensity", 1.25},
                                    {"sonnetOuterFrameMode", "frame"}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()["cameraIntensity"]
                       .toDouble(),
                   1.25);
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()["outerFrameMode"]
                       .toString(),
                   QString("frame"));
    } else if (mode == "lumiere") {
      QTRY_VERIFY_WITH_TIMEOUT(renderer->property("renderReady").toBool() &&
                                   renderer->property("nodeCount").toInt() > 0,
                               20000);
      QVERIFY(renderer->property("totalCacheBytes").toDouble() > 0);
      QVERIFY(renderer->property("totalCacheBytes").toDouble() <=
              128 * 1024 * 1024);
      QVERIFY(configuration->patch(
          {{"lumiereTextOnly", true}, {"lumiereBloom", .5}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_COMPARE(
          plainValue(renderer->property("tuning")).toMap()["textOnly"].toBool(),
          true);
      QTRY_COMPARE(
          plainValue(renderer->property("tuning")).toMap()["bloom"].toDouble(),
          .5);
    } else if (mode == "tempera") {
      QTRY_VERIFY_WITH_TIMEOUT(
          !renderer->property("busy").toBool() &&
              renderer->property("paragraphCount").toInt() > 0,
          20000);
      QTRY_VERIFY_WITH_TIMEOUT(renderer->property("resourceCount").toInt() > 0,
                               10000);
      QVERIFY(configuration->patch({{"temperaColorMode", "gradient"},
                                    {"temperaCameraIntensity", 1.25}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()["colorMode"]
                       .toString(),
                   QString("gradient"));
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()["cameraIntensity"]
                       .toDouble(),
                   1.25);
    } else if (mode == "fume") {
      QTRY_VERIFY_WITH_TIMEOUT(renderer->property("renderReady").toBool() &&
                                   renderer->property("rendererCount").toInt() >
                                       0,
                               15000);
      QVERIFY(renderer->property("article").isValid());
      QVERIFY(configuration->patch({{"fumeDisableGeometricBackground", false},
                                    {"fumeBackgroundObjectOpacity", 1}}));
      QTRY_VERIFY(!configuration->busy());
      QCOMPARE(renderer->property("decorTextureBytes").toDouble(), 0.);
      host.theme.setMotionEnabled(true);
      QTRY_VERIFY(renderer->property("decorTextureBytes").toDouble() > 0);
      QVERIFY(renderer->property("decorTextureBytes").toDouble() <=
              32 * 1024 * 1024);
      host.theme.setMotionEnabled(false);
      QTRY_COMPARE(renderer->property("decorTextureBytes").toDouble(), 0.);
    } else if (mode == "pendolo") {
      QTRY_VERIFY_WITH_TIMEOUT(!renderer->property("busy").toBool() &&
                                   renderer->property("lineCount").toInt() > 0,
                               10000);
      QTRY_VERIFY_WITH_TIMEOUT(renderer->property("glyphRowCount").toInt() > 0,
                               10000);
      QCOMPARE(renderer->property("partCount").toInt(), 21);
      QVERIFY(configuration->patch(
          {{"pendoloActiveScale", 1.4}, {"pendoloShowGearDecor", "full"}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_COMPARE(plainValue(renderer->property("tuning"))
                       .toMap()["activeScale"]
                       .toDouble(),
                   1.4);
    } else if (mode == "claddagh") {
      QTRY_VERIFY_WITH_TIMEOUT(
          renderer->property("mountedLineCount").toInt() > 0, 10000);
    } else if (mode == "cappella") {
      QTRY_VERIFY_WITH_TIMEOUT(
          renderer->property("mountedRowCount").toInt() > 0, 10000);
      QTRY_VERIFY_WITH_TIMEOUT(
          renderer->property("visibleRowCount").toInt() > 0, 10000);
      bool rendered = false;
      QTRY_VERIFY_WITH_TIMEOUT(
          ([&] {
            for (auto *child : renderer->findChildren<QObject *>()) {
              if (child->property("renderBatches").toInt() > 0) {
                rendered = true;
                break;
              }
            }
            return rendered;
          })(),
          10000);
      QVERIFY(configuration->patch({{"backgroundMode", "sora"}}));
      QTRY_VERIFY(!configuration->busy());
      QQuickItem *sora = nullptr;
      QTRY_VERIFY((sora = visual(skin, "foliaSoraBackground")));
      QTRY_VERIFY(nativeObject(sora->property("renderer")));
      QVERIFY(sora->property("errorString").toString().isEmpty());
      QVERIFY(configuration->patch({{"soraBlank", true}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_VERIFY(!nativeObject(sora->property("renderer")));
      QVERIFY(configuration->patch(
          {{"backgroundMode", "common"}, {"commonUseCoverColorBg", true}}));
      QTRY_VERIFY(!configuration->busy());
      QQuickItem *common = nullptr;
      QTRY_VERIFY((common = visual(skin, "foliaCommonBackground")));
      QVERIFY(common->property("useCover").toBool());
      QVERIFY(common->property("errorString").toString().isEmpty());
      host.theme.setMotionEnabled(true);
      QPointer<QObject> commonGeometry;
      QTRY_VERIFY((commonGeometry =
                       nativeObject(common->property("geometryRenderer"))));
      QTRY_COMPARE(commonGeometry->property("layerCount").toInt(), 1);
      host.theme.setMotionEnabled(false);
      QTRY_VERIFY(!nativeObject(common->property("geometryRenderer")));
      QVERIFY(configuration->patch({{"backgroundMode", "latent"}}));
      QTRY_VERIFY(!configuration->busy());
      QTRY_VERIFY(!visual(skin, "foliaSoraBackground"));
      QTRY_VERIFY(visual(skin, "foliaLatentBackground"));
    } else {
      QPointer<QObject> glyph;
      QTRY_VERIFY_WITH_TIMEOUT(
          (glyph = nativeObject(renderer->property("renderer"))) &&
              glyph->property("renderBatches").toInt() > 0,
          10000);
      QCOMPARE(glyph->property("font").value<QFont>().families(), customChain);
    }
    QVERIFY2(dynamic->property("errorString").toString().isEmpty(),
             qPrintable(dynamic->property("errorString").toString()));
    auto *nativeClock = visual(dynamicHost, "foliaPresentationClock");
    QVERIFY(nativeClock);
    const auto pausedTime = nativeClock->property("renderTime").toDouble();
    QTest::qWait(80);
    QCOMPARE(nativeClock->property("renderTime").toDouble(), pausedTime);
    const auto capture = window->grabWindow();
    QVERIFY(!capture.isNull());
    QVERIFY(capture.save(qEnvironmentVariable("FOLIA_CAPTURE_DIR") + "/" +
                         mode + "-production.png"));
    qInfo() << "Installed Folia mode:" << mode
            << "active source line:" << timeline->property("activeIndex");
    if (mode == "cadenza") {
      auto *audio = visual(skin, "foliaAudioBands");
      QVERIFY(audio);
      QVERIFY(!audio->property("subscribed").toBool());
      QSignalSpy resumedClock(nativeClock, SIGNAL(renderTimeChanged()));
      QVERIFY(resumedClock.isValid());
      host.playback.play();
      QTRY_VERIFY(host.playback.playing());
      QTRY_VERIFY(audio->property("subscribed").toBool());
      host.playback.setVolume(
          1); // Real post-volume PCM; the rest of this fixture is muted.
      QTest::qWait(500);
      const auto diagnostic = plainValue(audio->property("_frame")).toMap();
      qInfo() << "Folia actual frequency boundary:"
              << audio->property("bands").metaType().name()
              << diagnostic.value("source") << diagnostic.value("state")
              << plainValue(audio->property("bands"));
      QTRY_VERIFY_WITH_TIMEOUT(
          plainValue(audio->property("bands")).toMap()["mid"].toDouble() > 0,
          10000);
      QVERIFY(resumedClock.count() >= 2);
      host.playback.pause();
      QTRY_VERIFY(!host.playback.playing());
      host.playback.setVolume(0);
      QTRY_VERIFY(!audio->property("subscribed").toBool());
      QCOMPARE(plainValue(audio->property("bands")).toMap()["mid"].toDouble(),
               0.);
      // State changes freeze the native sub-telemetry projection; they are
      // not new position measurements. A final PCM observation may arrive
      // afterwards without rewinding that projection to the older telemetry.
      const auto frozenProjection =
          nativeClock->property("renderTime").toDouble();
      QTest::qWait(350);
      const auto settledNativePosition = host.playback.positionMs();
      QCOMPARE(nativeClock->property("renderTime").toDouble(), frozenProjection);
      QTest::qWait(100);
      QCOMPARE(host.playback.positionMs(), settledNativePosition);
      QCOMPARE(nativeClock->property("renderTime").toDouble(), frozenProjection);
    }
  }
  if (window->rendererInterface()->graphicsApi() ==
      QSGRendererInterface::Metal) {
    host.theme.setMotionEnabled(true);
    QVERIFY(configuration->patch({{"mode", "classic"},
                                  {"backgroundMode", "sora"},
                                  {"soraBlank", true},
                                  {"visualizerOpacity", .55}}));
    QTRY_VERIFY(!configuration->busy());
    auto *dynamicHost = visual(skin, "foliaDynamicPresentationHost");
    QVERIFY(dynamicHost);
    auto *dynamic = nativeObject(dynamicHost->property("item"));
    QVERIFY(dynamic);
    auto *stage = nativeObject(dynamic->property("stage"));
    QVERIFY(stage);
    QTRY_COMPARE(stage->property("loadedMode").toString(), QString("classic"));
    QTRY_COMPARE(stage->property("transitionWaits").toBool(), false);
    QTRY_COMPARE(stage->property("layerCount").toInt(), 1);
    auto *backgroundHost = visual(skin, "foliaBackgroundHost");
    QVERIFY(backgroundHost);
    auto *background = nativeObject(backgroundHost->property("item"));
    QVERIFY(background);
    QTRY_COMPARE(background->property("layerCount").toInt(), 1);
    auto *surface = visual(skin, "foliaVisualizerSurface");
    QVERIFY(surface);
    QTRY_COMPARE(surface->opacity(), .55);
    QVERIFY(
        configuration->patch({{"mode", "tilt"}, {"backgroundMode", "latent"}}));
    QTRY_VERIFY(!configuration->busy());
    QTRY_COMPARE(stage->property("loadedMode").toString(), QString("tilt"));
    QTRY_COMPARE_WITH_TIMEOUT(stage->property("layerCount").toInt(), 1, 3500);
    QTRY_COMPARE_WITH_TIMEOUT(background->property("layerCount").toInt(), 1,
                              3500);
    QCOMPARE(stage->property("transitionBytes").toDouble(), 0.);
    QCOMPARE(background->property("transitionBytes").toDouble(), 0.);
    QVERIFY2(dynamic->property("errorString").toString().isEmpty(),
             qPrintable(dynamic->property("errorString").toString()));
    host.theme.setMotionEnabled(false);
    QVERIFY(configuration->patch({{"visualizerOpacity", 1}}));
    QTRY_VERIFY(!configuration->busy());
  }
  QVERIFY(configuration->patch({{"mode", "still"}}));
  QTRY_VERIFY(!configuration->busy());
  QTRY_VERIFY(visual(skin, "stillPrimary1"));
  // Still shares the source style transition, while its resting presentation
  // performs no continuous frame projection or whole-track preparation.
  auto *stillClock = visual(skin, "foliaPresentationClock");
  QTRY_VERIFY(stillClock);
  QTRY_VERIFY(!stillClock->property("continuous").toBool());
  auto *stillDynamicHost = visual(skin, "foliaDynamicPresentationHost");
  QVERIFY(stillDynamicHost);
  auto *stillDynamic = nativeObject(stillDynamicHost->property("item"));
  QVERIFY(stillDynamic);
  QTRY_VERIFY(!stillDynamic->property("needsDynamicTimeline").toBool());
  auto *stillBackgroundHost = visual(skin, "foliaBackgroundHost");
  QVERIFY(stillBackgroundHost);
  auto *stillBackground = nativeObject(stillBackgroundHost->property("item"));
  if (skin->property("nativeGraphicsAvailable").toBool()) {
    QVERIFY(stillBackground);
    QTRY_VERIFY(!nativeObject(stillBackground->property("renderer")));
    QCOMPARE(stillBackground->property("transitionBytes").toDouble(), 0.);
  } else {
    // The software fallback deliberately never creates a GPU background.
    QVERIFY(!stillBackgroundHost->property("active").toBool());
    QVERIFY(!stillBackground);
  }
  host.playback.play();
  QTRY_VERIFY(host.playback.playing());
  // The production skin host unloads its whole visual scope when the window
  // hides. Assert destruction rather than dereferencing the retired clock.
  window->hide();
  QTRY_VERIFY(presentationClock.isNull());
  QTRY_VERIFY(!view || !view->active());
  const auto hiddenTime = host.playback.positionMs();
  const auto hiddenUpdates = presented.count();
  QTest::qWait(350);
  QCOMPARE(presented.count(), hiddenUpdates);
  QVERIFY(host.playback.positionMs() > hiddenTime);
  window->show();
  QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
  view = skin->property("page").value<EchoPluginViewContext *>();
  configuration =
      skin->property("configuration").value<AppearanceConfiguration *>();
  QVERIFY(view && view->active());
  presentationClock = clockComponent.createWithInitialProperties(
      {{"page", QVariant::fromValue(view.data())}});
  QVERIFY2(presentationClock, qPrintable(clockComponent.errorString()));
  presentationClock->setParent(skin);
  qobject_cast<QQuickItem *>(presentationClock.data())->setParentItem(skin);
  QTRY_VERIFY(presentationClock->property("live").toBool());
  QTRY_VERIFY(presentationClock->property("renderTime").toDouble() >=
              host.playback.positionMs());
  host.playback.pause();
  QTRY_VERIFY(!host.playback.playing());
  QTest::qWait(100);
  const auto captures = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
  QVERIFY(window->grabWindow().save(captures + "/still-native-playback.png"));
  window->setWidth(620);
  QTest::qWait(80);
  QVERIFY(window->grabWindow().save(captures + "/still-native-narrow.png"));
  window->setWidth(1100);
  QVERIFY(QMetaObject::invokeMethod(page, "close"));
  QTRY_VERIFY(!view || !view->active());
  QTRY_VERIFY(presentationClock.isNull());
  QVERIFY(!configuration || !configuration->patch({{"lyricsFontScale", 1.1}}));

  // Reload the same installed package: persisted configuration survives and
  // the retired visual cannot retain an active presentation scope.
  QVERIFY(host.runtime.reload(installation));
  QTRY_VERIFY(!host.runtime.loading());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  entry = catalog->entries("skin").first();
  QCOMPARE(entry->configuration()->values().value("lyricsFontScale").toDouble(),
           1.2);
  QCOMPARE(
      entry->configuration()->values().value("playerBottomBarOffset").toInt(),
      committedOffset);
  QVERIFY(entry->configuration()
              ->values()
              .value("alwaysShowTrackSwitchButtons")
              .toBool());
  QCOMPARE(entry->configuration()
               ->values()
               .value("playerChromeVisibilityMode")
               .toString(),
           QString("auto-hide"));
  auto *scope = host.runtime.context(installation);
  QVERIFY(scope->appearance()->useSkin("folia"));
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
  view = skin->property("page").value<EchoPluginViewContext *>();
  QVERIFY(host.runtime.setEnabled(installation, false));
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Disabled);
  QTRY_VERIFY(!view || !view->active());
  QCOMPARE(catalog->selectedSkin(), QString("cover"));
  QCOMPARE(catalog->entries("skin").size(), 0);
  QVERIFY(host.runtime.uninstall(installation, true));
  QTRY_VERIFY(host.runtime.installationForId("folia-lyrics-skin").isEmpty());
  QVERIFY2(warnings.isEmpty(), qPrintable(warnings.join('\n')));
}

QTEST_MAIN(FoliaHostTest)
#include "folia-host.moc"
