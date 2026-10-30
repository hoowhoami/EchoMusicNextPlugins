#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

class FoliaPreparedTest : public QObject {
  Q_OBJECT
private slots:
  void realModelNativeIcuWorkerAndRetirement();
};
namespace {
QVariantList rows(QObject *provider) {
  const auto value = provider->property("preparedLines");
  return value.metaType() == QMetaType::fromType<QJSValue>()
             ? value.value<QJSValue>().toVariant().toList()
             : value.toList();
}
QJsonObject lyric(const QString &text, int start) {
  const QJsonObject word{
      {"text", text}, {"start_ms", start}, {"duration_ms", 1000}};
  return {{"text", text},
          {"start_ms", start},
          {"duration_ms", 1000},
          {"words", QJsonArray{word}}};
}
} // namespace
void FoliaPreparedTest::realModelNativeIcuWorkerAndRetirement() {
  Host host;
  host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
  QString installation;
  QTRY_VERIFY(
      !(installation = host.runtime.installationForId("folia-lyrics-skin"))
           .isEmpty());
  QTRY_COMPARE(host.runtime.state(installation), PluginRuntime::Active);
  QObject owner;
  owner.setProperty("active", true);
  auto *scope = host.runtime.context(installation)
                    ->createPresentation(&owner, "lyrics-test");
  QVERIFY(scope);
  EchoPluginViewContext page(*scope, "lyrics-test", &owner);
  QJsonArray lines;
  for (int i = 0; i < 100; ++i)
    lines.append(lyric(
        i == 0 ? QString::fromUtf8("海边 café 👩‍👩‍👧‍👦")
               : QString("第%1行").arg(i),
        i * 1000));
  QVERIFY(
      host.playback.lyrics()->replace({{"lines", lines}, {"offset_ms", 200}}));
  QQmlComponent component(
      &host.engine,
      QUrl::fromLocalFile(host.runtime.context(installation)->package().root +
                          "/qml/shared/PreparedLyrics.qml"));
  std::unique_ptr<QObject> provider(component.createWithInitialProperties(
      {{"plugin", QVariant::fromValue(scope)},
       {"page", QVariant::fromValue(&page)}}));
  QVERIFY2(provider, qPrintable(component.errorString()));
  QQmlComponent timelineComponent(
      &host.engine,
      QUrl::fromLocalFile(host.runtime.context(installation)->package().root +
                          "/qml/shared/LyricTimeline.qml"));
  std::unique_ptr<QObject> timeline(
      timelineComponent.createWithInitialProperties(
          {{"page", QVariant::fromValue(&page)}, {"timeSeconds", 50.2}}));
  QVERIFY2(timeline, qPrintable(timelineComponent.errorString()));
  QTRY_VERIFY_WITH_TIMEOUT(timeline->property("ready").toBool(), 15000);
  QCOMPARE(timeline->property("activeIndex").toInt(), 50);
  auto timelineValue = [&timeline](const char *key) {
    auto value = timeline->property(key);
    return value.metaType() == QMetaType::fromType<QJSValue>()
               ? value.value<QJSValue>().toVariant()
               : value;
  };
  const auto metadata = timelineValue("lineMetadata").toList();
  QCOMPARE(metadata.size(), 100);
  const auto firstMetadata = metadata.first().toMap();
  QCOMPARE(firstMetadata["sourceIndex"].toInt(), 0);
  QCOMPARE(firstMetadata["codepointCount"].toInt(),
           QString::fromUtf8("海边 café 👩‍👩‍👧‍👦")
               .toUcs4()
               .size());
  QCOMPARE(firstMetadata["compactCodepointCount"].toInt(),
           firstMetadata["codepointCount"].toInt() - 2);
  QVERIFY(!firstMetadata.contains("agentId"));
  QVERIFY(!firstMetadata.contains("fullText"));
  QCOMPARE(timelineValue("metadataBySourceIndex").toMap()["0"].toMap(),
           firstMetadata);
  QCOMPARE(timelineValue("nextStartBySourceIndex").toMap()["0"].toDouble(),
           1.2);
  QVERIFY(timelineValue("nextStartBySourceIndex").toMap()["99"].isNull());
  QTRY_VERIFY_WITH_TIMEOUT(!rows(provider.get()).isEmpty(), 15000);
  QTRY_VERIFY_WITH_TIMEOUT(!provider->property("busy").toBool(), 15000);
  QVERIFY2(provider->property("errorMessage").toString().isEmpty(),
           qPrintable(provider->property("errorMessage").toString()));
  auto prepared = rows(provider.get());
  QCOMPARE(prepared.size(), 17);
  const auto first = prepared[0].toMap();
  QCOMPARE(first["line"].toMap()["startTime"].toDouble(), .2);
  QCOMPARE(first["line"]
               .toMap()["words"]
               .toList()[0]
               .toMap()["startTime"]
               .toDouble(),
           .2);
  const auto graphemes = first["graphemes"].toList();
  QCOMPARE(graphemes.last().toMap()["segment"].toString(),
           QString::fromUtf8("👩‍👩‍👧‍👦"));
  host.playback.lyrics()->setPosition(50200);
  QTRY_VERIFY_WITH_TIMEOUT(rows(provider.get()).size() == 67 &&
                               rows(provider.get())[50].isValid(),
                           15000);
  QTRY_VERIFY_WITH_TIMEOUT(!provider->property("busy").toBool(), 15000);
  int cached = 0;
  for (const auto &row : rows(provider.get()))
    cached += !row.toMap().isEmpty();
  QCOMPARE(cached, 33);
  QVERIFY(host.playback.lyrics()->replace(
      {{"lines", QJsonArray{lyric("replacement", 0)}}, {"offset_ms", 0}}));
  QTRY_VERIFY_WITH_TIMEOUT(
      rows(provider.get()).size() == 1 &&
          rows(provider.get())[0].toMap()["line"].toMap()["fullText"] ==
              "replacement",
      15000);
  QTRY_VERIFY_WITH_TIMEOUT(timeline->property("ready").toBool(), 15000);
  QCOMPARE(timeline->property("activeIndex").toInt(), -1);
  timeline->setProperty("timeSeconds", .1);
  QTRY_COMPARE(timeline->property("activeIndex").toInt(), 0);
  owner.setProperty("active", false);
  QTRY_VERIFY(!page.active());
  QTRY_VERIFY(rows(provider.get()).isEmpty());
  QTRY_VERIFY(!timeline->property("ready").toBool());
  QVERIFY(timelineValue("lineMetadata").toList().isEmpty());
  QVERIFY(timelineValue("metadataBySourceIndex").toMap().isEmpty());
  QVERIFY(!provider->property("busy").toBool());
  QTest::qWait(100);
  QVERIFY(rows(provider.get()).isEmpty());
}
QTEST_MAIN(FoliaPreparedTest)
#include "folia-prepared.moc"
