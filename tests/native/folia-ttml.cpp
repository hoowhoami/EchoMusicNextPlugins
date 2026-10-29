// Integration only: real FLAC tags -> native parser/model -> installed Folia
// page.
#include "EchoPluginAppearance.h"
#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include "SettingsKeys.h"
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

namespace {
QByteArray taggedFlac(const QByteArray &lyrics) {
  QFile file(qEnvironmentVariable("FOLIA_HOST_SOURCE") +
             "/crates/echo-audio/tests/fixtures/embedded-metadata.flac");
  if (!file.open(QIODevice::ReadOnly))
    return {};
  const auto original = file.readAll();
  if (!original.startsWith("fLaC"))
    return {};
  auto result = original.first(4);
  qsizetype at = 4;
  bool replaced = false;
  while (at + 4 <= original.size()) {
    const auto header = original.mid(at, 4);
    const auto length = (quint32(quint8(header[1])) << 16) |
                        (quint32(quint8(header[2])) << 8) | quint8(header[3]);
    if (at + 4 + length > original.size())
      return {};
    if ((quint8(header[0]) & 0x7f) == 4) {
      QByteArray comments;
      QDataStream stream(&comments, QIODevice::WriteOnly);
      stream.setByteOrder(QDataStream::LittleEndian);
      const QByteArray vendor("Folia production TTML acceptance");
      stream << quint32(vendor.size());
      stream.writeRawData(vendor.data(), vendor.size());
      stream << quint32(2);
      for (const auto &value : {QByteArray("TITLE=Authored TTML audio"),
                                QByteArray("LYRICS=") + lyrics}) {
        stream << quint32(value.size());
        stream.writeRawData(value.data(), value.size());
      }
      result += header.first(1);
      for (const auto shift : {16, 8, 0})
        result += char((comments.size() >> shift) & 255);
      result += comments;
      replaced = true;
    } else {
      result += original.mid(at, 4 + length);
    }
    at += 4 + length;
    if ((quint8(header[0]) & 0x80) != 0)
      break;
  }
  return replaced ? result + original.mid(at) : QByteArray{};
}
PlaybackTrack trackWithTag(Host &host, const QString &id,
                           const QByteArray &xml) {
  PlaybackTrack track;
  track.id = id;
  track.title = id;
  track.durationMs = 20000;
  track.localPath = host.temporary.filePath(id + ".flac");
  write(track.localPath, taggedFlac(xml));
  host.settings.setValue(SettingsKeys::Lyrics::SourcesPrefix +
                             QString::fromLatin1(QCryptographicHash::hash(
                                                     track.stableKey().toUtf8(),
                                                     QCryptographicHash::Sha256)
                                                     .toHex()),
                         "embedded");
  return track;
}
} // namespace

class FoliaTtmlTest : public QObject {
  Q_OBJECT
private slots:
  void realEmbeddedHarmonyAndUnsupportedSourceInProductionPage();
};

void FoliaTtmlTest::realEmbeddedHarmonyAndUnsupportedSourceInProductionPage() {
  QTest::failOnWarning(
      QRegularExpression("invalid context|TypeError:|ReferenceError:|is not a "
                         "function|Binding loop"));
  configureUiTypography();
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.theme.setMotionEnabled(false);
  host.playback.setVolume(0);
  host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
  QString installation;
  QTRY_VERIFY(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  auto *catalog = host.theme.extensions();
  QCOMPARE(catalog->entries("skin").size(), 1);
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
  width:1100; height:820; visible:true
  required property PlaybackService playback
  PlaybackPage { id: page; playback: window.playback }
  function openPlayback() { page.open(); }
  function closePlayback() { page.close(); }
})",
                    QUrl("qrc:/folia-ttml-production.qml"));
  std::unique_ptr<QObject> root(component.createWithInitialProperties(
      {{"playback", QVariant::fromValue(&host.playback)}}));
  QVERIFY2(root, qPrintable(component.errorString()));
  auto *window = qobject_cast<QQuickWindow *>(root.get());
  QVERIFY(window);
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  QQuickItem *skin = nullptr;
  QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
  QFile source(qEnvironmentVariable("FOLIA_HOST_SOURCE") +
               "/crates/echo-api/tests/fixtures/ttml/media.ttml");
  QVERIFY(source.open(QIODevice::ReadOnly));
  const auto track = trackWithTag(host, "harmony", source.readAll());
  QVERIFY(QFileInfo(track.localPath).size() > 300000);
  host.playback.playTracks({track}, 0, "TTML", "folia-ttml");
  auto *view = skin->property("page").value<EchoPluginViewContext *>();
  QVERIFY(view);
  QTRY_COMPARE_WITH_TIMEOUT(
      view->player()->lyricsInfo().value("sourceFormat").toString(),
      QString("ttml"), 15000);
  QTRY_VERIFY(host.playback.playing());
  auto *pause = view->command("pause", {});
  auto pauseRoot = host.engine.newQObject(pause);
  QTRY_COMPARE(pause->state(), EchoPluginOperation::Succeeded);
  auto *offset = view->command("globalOffset", {{"value", 500}});
  auto offsetRoot = host.engine.newQObject(offset);
  QTRY_COMPARE(offset->state(), EchoPluginOperation::Succeeded);
  QCOMPARE(view->player()
               ->lyrics()
               ->row(0)
               .value("backgroundVocals")
               .toList()
               .first()
               .toMap()
               .value("startMs")
               .toLongLong(),
           10500);
  auto *seek = view->command(
      "seek", {{"value", 10800}, {"revision", view->player()->revision()}});
  auto seekRoot = host.engine.newQObject(seek);
  QTRY_COMPARE(seek->state(), EchoPluginOperation::Succeeded);
  QQuickItem *harmony = nullptr;
  QTRY_VERIFY((harmony = visual(skin, "foliaHarmonyOverlay")));
  QTRY_COMPARE(harmony->property("activeCount").toInt(), 1);
  QQuickItem *glyph = nullptr;
  QTRY_VERIFY((glyph = visual(harmony, "foliaHarmonyBaseGlyph")));
  QTRY_VERIFY(glyph->property("runs").toList().size() > 0);
  QCOMPARE(
      glyph->property("runs").toList().first().toMap().value("text").toString(),
      QString("和声"));
  QTRY_VERIFY(harmony->property("cacheBytes").toDouble() > 0);
  QCOMPARE(skin->property("presentationError").toString(), QString());
  QVERIFY(entry->configuration()->patch({{"showHarmonySubtitle", false}}));
  QTRY_COMPARE(harmony->property("activeCount").toInt(), 0);
  QTRY_COMPARE(harmony->property("cacheBytes").toDouble(), 0.0);
  QVERIFY(entry->configuration()->patch({{"showHarmonySubtitle", true}}));
  QTRY_COMPARE(harmony->property("activeCount").toInt(), 1);
  QTRY_VERIFY(visual(harmony, "foliaHarmonyBaseGlyph"));
  QVERIFY(QMetaObject::invokeMethod(root.get(), "closePlayback"));
  QTRY_VERIFY(!visual(window->contentItem(), "foliaHarmonyBaseGlyph"));
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
  QTRY_VERIFY((harmony = visual(skin, "foliaHarmonyOverlay")));
  QTRY_COMPARE(harmony->property("activeCount").toInt(), 1);
  const auto unsupported = trackWithTag(
      host, "unsupported",
      "<tt xmlns='http://www.w3.org/ns/ttml'><body><div timeContainer='seq'>"
      "<p begin='0s' dur='1s'>UNSUPPORTED XML</p></div></body></tt>");
  host.playback.playTracks({unsupported}, 0, "TTML", "folia-ttml-error");
  QTRY_VERIFY_WITH_TIMEOUT(
      !host.playback.lyricSource()->errorMessage().isEmpty(), 15000);
  QQuickItem *label = nullptr;
  QTRY_VERIFY((label = visual(skin, "foliaRenderError")));
  QTRY_VERIFY(label->isVisible());
  QTRY_COMPARE(label->property("text").toString(),
               host.playback.lyricSource()->errorMessage());
  QCOMPARE(host.playback.lyrics()->rowCount(), 0);
  QTRY_COMPARE(harmony->property("activeCount").toInt(), 0);
  QTRY_VERIFY(!visual(harmony, "foliaHarmonyBaseGlyph"));
}
QTEST_MAIN(FoliaTtmlTest)
#include "folia-ttml.moc"
