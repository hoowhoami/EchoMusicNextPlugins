// Real installed entry, async configuration persistence and native audio
// events.
#include "EchoPluginAppearance.h"
#include "EchoPluginContext.h"
#include "PluginRuntimeTestFixture.h"
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

class FoliaRandomTest : public QObject {
  Q_OBJECT
private slots:
  void selectionOutlivesThePageAndRetiresWithTheScope();
};

void FoliaRandomTest::selectionOutlivesThePageAndRetiresWithTheScope() {
  QTest::failOnWarning(
      QRegularExpression("invalid context|TypeError:|ReferenceError:|is not a "
                         "function|Binding loop"));
  configureUiTypography();
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.playback.setVolume(0);
  host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
  QString installation;
  QTRY_VERIFY(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  QCOMPARE(host.theme.extensions()->entries("skin").size(), 1);
  auto *entry = host.theme.extensions()->entries("skin").first();
  auto *configuration = entry->configuration();
  QTRY_VERIFY(!configuration->busy());
  QVERIFY(configuration->patch(
      {{"mode", "classic"},
       {"randomVisualizerModePerSong", true},
       {"randomVisualizerModes", QVariantList{"classic", "fume"}}}));
  QTRY_VERIFY(!configuration->busy());
  auto *context = host.runtime.context(installation);
  QVERIFY(context);
  QSignalSpy failures(context, &EchoPluginContext::callbackFailed);
  auto track = [&](const QString &id) {
    PlaybackTrack value;
    value.id = id;
    value.title = id;
    value.durationMs = 20000;
    value.localPath =
        qEnvironmentVariable("FOLIA_HOST_SOURCE") +
        "/crates/echo-audio/tests/fixtures/embedded-metadata.flac";
    return value;
  };
  const auto a = track("random-song-a"), b = track("random-song-b"),
             c = track("random-song-c");
  auto play = [&](const PlaybackTrack &value) {
    host.playback.playTracks({value}, 0, "Random scope test", "folia-random");
  };
  // No playback page or renderer has been created in this process.
  play(a);
  QTRY_VERIFY(host.playback.playing() && !host.playback.loading());
  QCOMPARE(configuration->values().value("mode").toString(),
           QString("classic"));
  play(b);
  QTRY_COMPARE(host.playback.currentTrack().id, b.id);
  QTRY_COMPARE(configuration->values().value("mode").toString(),
               QString("fume"));
  QTRY_VERIFY(!configuration->busy());
  auto *pause = context->player()->pause();
  auto pauseRoot = host.engine.newQObject(pause);
  QTRY_COMPARE(pause->state(), EchoPluginOperation::Succeeded);
  host.playback.seek(5000);
  QTest::qWait(100);
  QCOMPARE(configuration->values().value("mode").toString(), QString("fume"));
  play(b);
  QTRY_VERIFY(host.playback.playing() && !host.playback.loading());
  QCOMPARE(configuration->values().value("mode").toString(), QString("fume"));
  play(c);
  QTRY_COMPARE(configuration->values().value("mode").toString(),
               QString("classic"));
  QTRY_VERIFY(!configuration->busy());
  auto *reroll = context->executeCommand("folia.random.reroll", {});
  auto rerollRoot = host.engine.newQObject(reroll);
  QTRY_COMPARE(reroll->state(), EchoPluginOperation::Succeeded);
  QTRY_COMPARE(configuration->values().value("mode").toString(),
               QString("fume"));
  QTRY_VERIFY(!configuration->busy());
  QVERIFY(
      configuration->values().value("randomVisualizerModePerSong").toBool());
  QVERIFY(configuration->patch(
      {{"mode", "classic"}, {"randomVisualizerModePerSong", false}}));
  QTRY_VERIFY(!configuration->busy());
  play(a);
  QTRY_COMPARE(host.playback.currentTrack().id, a.id);
  QTest::qWait(100);
  QCOMPARE(configuration->values().value("mode").toString(),
           QString("classic"));
  QCOMPARE(failures.count(), 0);
  QPointer<AppearanceConfiguration> retired = configuration;
  QVERIFY(host.runtime.setEnabled(installation, false));
  QTRY_VERIFY(host.runtime.state(installation) != PluginRuntime::Active);
  QVERIFY(!retired || !retired->active());
  play(b);
  QTRY_VERIFY(host.playback.playing() && !host.playback.loading());
  QVERIFY(host.runtime.setEnabled(installation, true));
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  QTRY_COMPARE(host.theme.extensions()->entries("skin").size(), 1);
  auto *restored =
      host.theme.extensions()->entries("skin").first()->configuration();
  QTRY_VERIFY(!restored->busy());
  QCOMPARE(restored->values().value("mode").toString(), QString("classic"));
  QVERIFY(!restored->values().value("randomVisualizerModePerSong").toBool());
  QCOMPARE(restored->values().value("randomVisualizerModes").toList(),
           (QVariantList{"classic", "fume"}));
}

QTEST_MAIN(FoliaRandomTest)
#include "folia-random.moc"
