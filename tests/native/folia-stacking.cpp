// The installed page must paint actual lyric ink over its real background.
#include "EchoPluginAppearance.h"
#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include <QCryptographicHash>
#include <QDir>
#include <QFontDatabase>
#include <QQuickItemGrabResult>
#include <QtQml/qqmlextensionplugin.h>
#include <algorithm>
#include <cmath>
#include <memory>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

namespace {
template <typename Predicate> bool awaitEvent(Predicate predicate, int timeout) {
  if (predicate())
    return true;
  QEventLoop loop;
  QTimer poll, deadline;
  poll.setInterval(5);
  deadline.setSingleShot(true);
  bool ready = false;
  QObject::connect(&poll, &QTimer::timeout, &loop, [&] {
    if ((ready = predicate()))
      loop.quit();
  });
  QObject::connect(&deadline, &QTimer::timeout, &loop, &QEventLoop::quit);
  poll.start();
  deadline.start(timeout);
  loop.exec();
  return ready;
}
void settle(int milliseconds) {
  QEventLoop loop;
  QTimer::singleShot(milliseconds, &loop, &QEventLoop::quit);
  loop.exec();
}
QObject *objectValue(QVariant value) {
  if (value.metaType() == QMetaType::fromType<QJSValue>())
    return value.value<QJSValue>().toQObject();
  return value.value<QObject *>();
}
QVariant plain(QVariant value) {
  return value.metaType() == QMetaType::fromType<QJSValue>()
             ? value.value<QJSValue>().toVariant()
             : value;
}
PlaybackTrack audioFixture(Host &host) {
  constexpr int rate = 16000, seconds = 40;
  QByteArray pcm;
  QDataStream samples(&pcm, QIODevice::WriteOnly);
  samples.setByteOrder(QDataStream::LittleEndian);
  for (int i = 0; i < rate * seconds; ++i)
    samples << qint16(std::sin(i * 2. * 3.141592653589793 * 440 / rate) * 2000);
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
  const auto filename = host.temporary.filePath("authored-stacking.wav");
  write(filename, wave);
  PlaybackTrack track;
  track.id = "authored-stacking";
  track.title = "山河与月光";
  track.localPath = filename;
  track.durationMs = seconds * 1000;
  return track;
}
int distance(QRgb a, QRgb b) {
  return std::max({std::abs(qRed(a) - qRed(b)),
                   std::abs(qGreen(a) - qGreen(b)),
                   std::abs(qBlue(a) - qBlue(b))});
}
} // namespace

class FoliaStackingTest : public QObject {
  Q_OBJECT
private slots:
  void installedLyricInkSurvivesTheBackground();
};

void FoliaStackingTest::installedLyricInkSurvivesTheBackground() {
  QTest::failOnWarning(QRegularExpression(
      "invalid context|TypeError:|ReferenceError:|is not a function"));
  configureUiTypography();
  Host host;
  host.shell.attachPlayback(host.playback);
  host.shell.attachTheme(host.theme);
  host.theme.setMode(ThemeStore::Dark);
  host.theme.setMotionEnabled(false);
  const QString family = "PingFang SC";
  QVERIFY(QFontDatabase::hasFamily(family));
  host.theme.setLyricFont(family);
  const auto package = qEnvironmentVariable("FOLIA_TEST_PACKAGE");
  host.runtime.importDirectory(package);
  QString installation;
  QVERIFY(awaitEvent([&] {
    installation = host.runtime.installationForId("folia-lyrics-skin");
    return !installation.isEmpty() && !host.runtime.loading();
  }, 10000));
  QCOMPARE(host.runtime.state(installation), PluginRuntime::Active);
  auto *entry = host.theme.extensions()->entries("skin").first();
  QVERIFY(entry->configuration()->patch(
      {{"mode", "classic"}, {"fontFamilies", QVariantList{family}}}));
  QVERIFY(awaitEvent([&] { return !entry->configuration()->busy(); }, 5000));
  QVERIFY(host.runtime.context(installation)->appearance()->useSkin("folia"));
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
})", QUrl("qrc:/folia-stacking.qml"));
  std::unique_ptr<QObject> root(component.createWithInitialProperties(
      {{"playback", QVariant::fromValue(&host.playback)}}));
  QVERIFY2(root, qPrintable(component.errorString()));
  auto *window = qobject_cast<QQuickWindow *>(root.get());
  QVERIFY(window);
  QVERIFY(awaitEvent([&] { return window->isExposed(); }, 5000));
  // Use one viewport that fits the real desktop at both scale factors. Cocoa
  // constrains oversized windows rather than rendering the requested extent.
  window->resize(720, 480);
  QVERIFY(awaitEvent([&] { return window->size() == QSize(720, 480); }, 5000));
  QCOMPARE(window->rendererInterface()->graphicsApi(), QSGRendererInterface::Metal);
  const auto track = audioFixture(host);
  host.playback.setVolume(0);
  host.playback.playTracks({track}, 0, "Authored stacking", "folia-stacking");
  QVERIFY(awaitEvent([&] {
    return host.playback.playing() && !host.playback.loading();
  }, 10000));
  QJsonArray rows;
  for (int i = 0; i < 80; ++i)
    rows.append(QJsonObject{
        {"text", QString("山河依旧，光落在你的肩头 %1 — office ffi á").arg(i)},
        {"start_ms", i * 4000}, {"duration_ms", 3500},
        {"translation", QString("Authored translation %1").arg(i)},
        {"words", QJsonArray{}}});
  QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, track.id));
  QCOMPARE(host.playback.lyrics()->rowCount(), 80);
  host.playback.seek(13300);
  QVERIFY(awaitEvent([&] { return host.playback.positionMs() >= 13000; }, 5000));
  host.playback.pause();
  QVERIFY(awaitEvent([&] { return !host.playback.playing(); }, 5000));
  QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
  const auto directory = qEnvironmentVariable("FOLIA_CAPTURE_DIR");
  QVERIFY(QDir().mkpath(directory));
  QJsonArray evidence;
  for (const auto &mode : {QString("classic"), QString("still")}) {
    QVERIFY(entry->configuration()->patch({{"mode", mode}}));
    QVERIFY(awaitEvent([&] { return !entry->configuration()->busy(); }, 5000));
    QQuickItem *skin = nullptr, *dynamic = nullptr, *glyph = nullptr;
    QObject *stage = nullptr;
    QVERIFY(awaitEvent([&] {
      skin = visual(window->contentItem(), "foliaPlaybackPage");
      dynamic = skin ? visual(skin, "foliaDynamicPresentationHost") : nullptr;
      auto *presentation = dynamic ? objectValue(dynamic->property("item")) : nullptr;
      stage = presentation ? objectValue(presentation->property("stage")) : nullptr;
      glyph = dynamic ? visual(dynamic, mode == "classic" ? "classicGlyphRun" : "stillPrimary1") : nullptr;
      return stage && stage->property("loadedMode").toString() == mode && glyph &&
             (mode != "classic" || glyph->property("renderBatches").toInt() > 0);
    }, 20000));
    auto *background = visual(skin, "foliaBackgroundHost");
    QVERIFY(background);
    const auto sources = plain(stage->property("backdropSources")).toList();
    QCOMPARE(sources.size(), 1);
    QCOMPARE(objectValue(sources.first()), objectValue(background->property("item")));
    QVERIFY(!dynamic->isAncestorOf(background));
    QVERIFY(!background->isAncestorOf(dynamic));
    settle(1200); // Settle initial cover/palette colours; audio and motion are frozen.
    const double frozen = stage->property("timeSeconds").toDouble();
    const auto whole = window->grabWindow().convertToFormat(QImage::Format_ARGB32);
    QVERIFY(!whole.isNull());
    auto grab = glyph->grabToImage();
    QVERIFY(grab);
    QVERIFY(awaitEvent([&] { return !grab->image().isNull(); }, 5000));
    const auto foreground = grab->image().convertToFormat(QImage::Format_ARGB32);
    // Hiding the real presentation retires Classic's glyph actor. Retain values,
    // never a raw item pointer across that lifecycle boundary.
    const QSizeF logicalGlyph(glyph->width(), glyph->height());
    const auto origin = glyph->mapToScene(QPointF(0, 0));
    const auto axisX = glyph->mapToScene(QPointF(1, 0)) - origin;
    const auto axisY = glyph->mapToScene(QPointF(0, 1)) - origin;
    dynamic->setVisible(false);
    settle(80);
    const auto backdrop = window->grabWindow().convertToFormat(QImage::Format_ARGB32);
    settle(40);
    const auto stable = window->grabWindow().convertToFormat(QImage::Format_ARGB32);
    QCOMPARE(stage->property("timeSeconds").toDouble(), frozen);
    QVERIFY(whole.save(directory + "/" + mode + "-whole.png"));
    QVERIFY(foreground.save(directory + "/" + mode + "-foreground.png"));
    QVERIFY(backdrop.save(directory + "/" + mode + "-backdrop.png"));
    const double density = double(whole.width()) / window->width();
    int strong = 0, visible = 0, backgroundDrift = 0;
    QSet<int> columns;
    QRect ink;
    for (int y = 0; y < foreground.height(); ++y)
      for (int x = 0; x < foreground.width(); ++x) {
        if (qAlpha(foreground.pixel(x, y)) < 160)
          continue;
        const auto point = origin + axisX * ((x + .5) * logicalGlyph.width() / foreground.width()) +
                           axisY * ((y + .5) * logicalGlyph.height() / foreground.height());
        const QPoint sample(qFloor(point.x() * density), qFloor(point.y() * density));
        if (!whole.rect().contains(sample))
          continue;
        ++strong;
        if (distance(backdrop.pixel(sample), stable.pixel(sample)) > 2)
          ++backgroundDrift;
        if (distance(whole.pixel(sample), backdrop.pixel(sample)) > 12) {
          ++visible;
          columns.insert(int(point.x() / 100));
          ink |= QRect(sample, QSize(1, 1));
        }
      }
    evidence.append(QJsonObject{{"mode", mode}, {"dpr", density},
        {"logicalWidth", window->width()}, {"logicalHeight", window->height()},
        {"physicalWidth", whole.width()}, {"physicalHeight", whole.height()},
        {"frozenTimeSeconds", frozen}, {"strongForegroundPixels", strong},
        {"visibleForegroundPixels", visible}, {"foregroundColumns", int(columns.size())},
        {"inkWidth", ink.width()}, {"inkHeight", ink.height()},
        {"backgroundDriftPixels", backgroundDrift}});
    write(directory + "/stacking.json", QJsonDocument(evidence).toJson(QJsonDocument::Indented));
    QVERIFY2(strong > 200 * density * density, "Independent native text must contain actual strong ink");
    QCOMPARE(backgroundDrift, 0);
    QVERIFY2(visible > strong / 2 && columns.size() >= 3 &&
                 ink.width() > 200 * density && ink.height() > 20 * density,
             qPrintable(QString("Installed %1 foreground is covered: strong=%2 visible=%3 columns=%4 bbox=%5x%6")
                 .arg(mode).arg(strong).arg(visible).arg(columns.size()).arg(ink.width()).arg(ink.height())));
    dynamic->setVisible(true);
  }
  host.playback.stop();
}

QTEST_MAIN(FoliaStackingTest)
#include "folia-stacking.moc"
