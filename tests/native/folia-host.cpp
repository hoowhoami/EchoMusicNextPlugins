// Test-only access to native fixtures. No host internals enter the plugin package.
#include "PluginRuntimeTestFixture.h"
#include "EchoPluginAppearance.h"
#include "EchoPluginViewContext.h"
#include <QFontDatabase>
#include <QWheelEvent>
#include <QtQml/qqmlextensionplugin.h>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

class FoliaHostTest : public QObject
{
    Q_OBJECT
private slots:
    void actualPackageInProductionPage();
};

void FoliaHostTest::actualPackageInProductionPage()
{
    Host host;
    host.shell.attachPlayback(host.playback);
    host.shell.attachTheme(host.theme);
    host.theme.setMotionEnabled(false);
    QString lyricFamily;
    const auto candidates = QStringList{"Menlo", "DejaVu Sans Mono", "Consolas"} + QFontDatabase::families();
    for (const auto &family : candidates)
        if (QFontDatabase::hasFamily(family) && !host.theme.applicationFont().families().contains(family)) {
            lyricFamily = family;
            break;
        }
    QVERIFY2(!lyricFamily.isEmpty(), "Font inheritance acceptance requires a distinct installed font");
    host.theme.setLyricFont(lyricFamily);
    QCOMPARE(host.theme.lyricBaseFont().families().first(), lyricFamily);
    QStringList warnings;
    connect(&host.engine, &QQmlEngine::warnings, this, [&](const QList<QQmlError> &errors) {
        for (const auto &error : errors)
            warnings.append(error.toString());
    });
    host.runtime.importDirectory(qEnvironmentVariable("FOLIA_TEST_PACKAGE"));
    QString installation;
    QTRY_VERIFY(!(installation = host.runtime.installationForId("folia-lyrics-skin")).isEmpty());
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
})", QUrl("qrc:/folia-production-acceptance.qml"));
    std::unique_ptr<QObject> root(component.createWithInitialProperties(
        {{"playback", QVariant::fromValue(&host.playback)}}));
    QVERIFY2(root, qPrintable(component.errorString()));
    auto *window = qobject_cast<QQuickWindow *>(root.get());
    QVERIFY(window);
    qInfo() << "Folia acceptance graphics backend:" << window->rendererInterface()->graphicsApi();
    QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
    auto *page = root->findChild<QObject *>("playbackPage");
    QVERIFY(page);
    QVERIFY(QMetaObject::invokeMethod(page, "openSkins"));
    QQuickItem *grid = nullptr;
    QTRY_VERIFY((grid = visual(window->contentItem(), "lyricSkinCatalog")));
    QCOMPARE(grid->property("count").toInt(), 2); // Native skin plus one Folia candidate.
    QQuickItem *card = nullptr;
    QTRY_VERIFY((card = visual(grid, "pluginLyricSkinCard")));
    QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
    QTRY_COMPARE(catalog->selectedSkin(), entry->key);
    QQuickItem *skin = nullptr;
    QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
    QVERIFY(visual(skin, "foliaStylePicker"));
    auto *primary = visual(skin, "stillPrimary1");
    QVERIFY(primary);
    QCOMPARE(primary->property("font").value<QFont>().families(),
             host.theme.lyricBaseFont().families());
    QPointer<EchoPluginViewContext> view =
        skin->property("page").value<EchoPluginViewContext *>();
    QPointer<AppearanceConfiguration> configuration =
        skin->property("configuration").value<AppearanceConfiguration *>();
    QVERIFY(view && view->active());
    QVERIFY(configuration && configuration->active());
    QQmlComponent clockComponent(&host.engine, QUrl::fromLocalFile(
        host.runtime.context(installation)->package().root + "/qml/shared/PresentationClock.qml"));
    QPointer<QObject> presentationClock = clockComponent.createWithInitialProperties(
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
    QTRY_VERIFY((settings = visual(window->contentItem(), "pluginSkinSettingsHost")));
    QTRY_VERIFY(settings->property("loaded").toBool());
    QVERIFY(configuration->patch({{"lyricsFontScale", 1.2}, {"hideTranslationSubtitle", true}}));
    QTRY_VERIFY(!configuration->busy());
    QCOMPARE(entry->configuration()->values().value("lyricsFontScale").toDouble(), 1.2);
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
        samples << qint16(std::sin(i * 2.0 * 3.141592653589793 * 440 / rate) * 2000);
    QByteArray wave;
    QDataStream header(&wave, QIODevice::WriteOnly);
    header.setByteOrder(QDataStream::LittleEndian);
    header.writeRawData("RIFF", 4);
    header << quint32(36 + pcm.size());
    header.writeRawData("WAVEfmt ", 8);
    header << quint32(16) << quint16(1) << quint16(1) << quint32(rate) << quint32(rate * 2)
           << quint16(2) << quint16(16);
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
    auto restoreVolume = qScopeGuard([&] { host.playback.setVolume(originalVolume); });
    host.playback.playTracks({track}, 0, "Folia test", "folia-test");
    QTRY_VERIFY2_WITH_TIMEOUT(host.playback.playing() && !host.playback.loading(),
                             qPrintable(QString("ready=%1 loading=%2 position=%3 error=%4")
                                 .arg(host.playback.engineReady()).arg(host.playback.loading())
                                 .arg(host.playback.positionMs()).arg(host.playback.errorMessage())),
                             5000);
    QJsonArray rows;
    for (int row = 0; row < 6; ++row)
        rows.append(QJsonObject{{"text", QString("原生音频驱动的第 %1 行").arg(row)},
                                {"start_ms", row * 2000}, {"duration_ms", 2000},
                                {"translation", QString("Authored fixture line %1").arg(row)},
                                {"words", QJsonArray{}}});
    QVERIFY(host.playback.lyrics()->replace({{"lines", rows}}));
    QTRY_VERIFY_WITH_TIMEOUT(host.playback.positionMs() >= 2100, 7000);
    QVERIFY2(presented.count() > telemetry.count() + 10,
             qPrintable(QString("presentation=%1 telemetry=%2")
                            .arg(presented.count()).arg(telemetry.count())));
    qInfo() << "Folia presentation updates:" << presented.count()
            << "engine position observations:" << telemetry.count();
    QTRY_VERIFY(presentationClock->property("renderTime").toDouble() > host.playback.positionMs() + 30);
    const auto beforeMetadataChange = presentationClock->property("renderTime").toDouble();
    host.playback.setVolume(0.001);
    QCOMPARE(presentationClock->property("renderTime").toDouble(), beforeMetadataChange);
    host.playback.setVolume(0);
    QTRY_COMPARE(primary->property("text").toString(), QString("原生音频驱动的第 1 行"));
    QVERIFY(visual(skin, "pluginPlayToggle"));
    QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "always-hidden"}}));
    QTRY_VERIFY(!configuration->busy());
    QTRY_VERIFY(!visual(skin, "pluginPlayToggle"));
    QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "always-visible"}}));
    QTRY_VERIFY(!configuration->busy());
    QTRY_VERIFY(visual(skin, "pluginPlayToggle"));
    auto *toggle = visual(skin, "pluginPlayToggle");
    QVERIFY(toggle);
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
    QTRY_VERIFY(!visual(skin, "pluginPlayToggle"));
    QTest::qWait(400);
    QVERIFY(chrome->property("hidden").toBool());
    QWheelEvent wheel(QPointF(550, 300), window->mapToGlobal(QPoint(550, 300)),
                      QPoint(), QPoint(0, 120), Qt::NoButton, Qt::NoModifier,
                      Qt::NoScrollPhase, false);
    QCoreApplication::sendEvent(window, &wheel);
    QTRY_VERIFY(!chrome->property("hidden").toBool());
    QTest::mouseMove(window, QPoint(560, 310));
    QTRY_VERIFY(!chrome->property("hidden").toBool());
    QTRY_VERIFY((toggle = visual(skin, "pluginPlayToggle")));
    auto *hover = skin->findChild<QObject *>("foliaChromeHover");
    QVERIFY(hover);
    QTest::mouseMove(window, QPoint(-10, -10));
    QTRY_VERIFY(!hover->property("hovered").toBool());
    QTRY_VERIFY(chrome->property("hidden").toBool());
    QTest::mouseMove(window, QPoint(560, 310));
    QTRY_VERIFY(hover->property("hovered").toBool());
    QTRY_VERIFY(!chrome->property("hidden").toBool());
    QTRY_VERIFY((toggle = visual(skin, "pluginPlayToggle")));
    // Exercise the real 260ms path as well as reduced motion. An interrupted
    // exit retains the same surface; a completed exit releases the controls.
    host.theme.setMotionEnabled(true);
    auto *transportHost = visual(skin, "foliaTransportHost");
    QVERIFY(transportHost);
    QPointer<QQuickItem> fadingSurface = visual(skin, "foliaTransportSurface");
    QVERIFY(fadingSurface);
    QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "always-hidden"}}));
    QTRY_VERIFY(transportHost->opacity() < 1);
    QVERIFY(transportHost->opacity() > 0);
    QVERIFY(fadingSurface);
    QVERIFY(!transportHost->isEnabled());
    QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "always-visible"}}));
    QTRY_COMPARE(transportHost->opacity(), 1.);
    QCOMPARE(visual(skin, "foliaTransportSurface"), fadingSurface.data());
    QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "always-hidden"}}));
    QTRY_VERIFY(fadingSurface.isNull());
    QVERIFY(!transportHost->property("active").toBool());
    QVERIFY(configuration->patch({{"playerChromeVisibilityMode", "auto-hide"}}));
    QTRY_VERIFY((toggle = visual(skin, "pluginPlayToggle")));
    QTRY_VERIFY(!configuration->busy());
    host.theme.setMotionEnabled(false);
    auto *seek = view->command("seek", {{"value", 5000}});
    auto seekRoot = host.engine.newQObject(seek);
    QTRY_COMPARE(seek->state(), EchoPluginOperation::Succeeded);
    QTRY_VERIFY(host.playback.positionMs() >= 4900 && host.playback.positionMs() <= 5100);
    QTRY_VERIFY(presentationClock->property("renderTime").toDouble() >= 4900 &&
                presentationClock->property("renderTime").toDouble() <= 5100);
    QTRY_COMPARE(primary->property("text").toString(), QString("原生音频驱动的第 2 行"));
    QVERIFY(QMetaObject::invokeMethod(toggle, "clicked"));
    QTRY_VERIFY(host.playback.playing());
    QTRY_VERIFY_WITH_TIMEOUT(host.playback.positionMs() > 5350, 5000);
    int completedPlayingSeeks = 0;
    bool clockResetAtSeekEvent = true;
    const auto seekConnection = connect(view->player(), &EchoPluginPlayer::eventOccurred, this,
        [&](const QString &event, const QVariantMap &) {
            if (event != "seek")
                return;
            ++completedPlayingSeeks;
            clockResetAtSeekEvent = clockResetAtSeekEvent &&
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
    configuration = skin->property("configuration").value<AppearanceConfiguration *>();
    QVERIFY(view && view->active());
    presentationClock = clockComponent.createWithInitialProperties(
        {{"page", QVariant::fromValue(view.data())}});
    QVERIFY2(presentationClock, qPrintable(clockComponent.errorString()));
    presentationClock->setParent(skin);
    qobject_cast<QQuickItem *>(presentationClock.data())->setParentItem(skin);
    QTRY_VERIFY(presentationClock->property("live").toBool());
    QTRY_VERIFY(presentationClock->property("renderTime").toDouble() >= host.playback.positionMs());
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
    QCOMPARE(entry->configuration()->values().value("lyricsFontScale").toDouble(), 1.2);
    QCOMPARE(entry->configuration()->values().value("playerChromeVisibilityMode").toString(),
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
