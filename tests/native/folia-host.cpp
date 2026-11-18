#include "EchoPluginAppearance.h"
#include "EchoPluginViewContext.h"
#include "EchoPluginImageDropArea.h"
#include "PluginRuntimeTestFixture.h"
#include <QQuickItemGrabResult>
#include <QtEndian>
#include <QtQml/qqmlextensionplugin.h>
#include <cstring>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QMimeData>
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

class FoliaHostTest : public QObject
{
    Q_OBJECT
private slots:
    void installedPackageAndStyles();
};

void FoliaHostTest::installedPackageAndStyles()
{
    QTest::failOnWarning(
        QRegularExpression("TypeError:|ReferenceError:|is not a function|invalid context"));
    QTest::failOnWarning(QRegularExpression("Failed to build graphics pipeline state|Failed to "
                                            "create.*shader|Failed to compile.*shader"));
    configureUiTypography();
    Host host;
    host.shell.attachPlayback(host.playback);
    host.shell.attachTheme(host.theme);
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
    auto *entry = catalog->entries("skin").first();
    QCOMPARE(catalog->selectedSkin(), QString("cover"));
    QQmlComponent component(&host.engine);
    component.setData(R"(
import QtQuick
import QtQuick.Controls.Basic
import EchoMusic.Playback
ApplicationWindow {
    id: window
    width: 1100; height: 820; visible: true
    required property PlaybackService playback
    PlaybackPage { id: playbackPage; objectName: "playbackPage"; playback: window.playback }
    function openPlayback() { playbackPage.open(); }
})",
                      QUrl("qrc:/folia-production.qml"));
    std::unique_ptr<QObject> root(
        component.createWithInitialProperties({{"playback", QVariant::fromValue(&host.playback)}}));
    QVERIFY2(root, qPrintable(component.errorString()));
    auto *window = qobject_cast<QQuickWindow *>(root.get());
    QVERIFY(window);
    host.mainWindow = window;
    QVERIFY(QTest::qWaitForWindowExposed(window));
    QVERIFY(QMetaObject::invokeMethod(root.get(), "openPlayback"));
    auto *playback = root->findChild<QObject *>("playbackPage");
    QVERIFY(playback);
    QTRY_VERIFY(playback->property("visible").toBool());
    QTRY_VERIFY(playback->property("acceptingInput").toBool());
    QVERIFY(QMetaObject::invokeMethod(playback, "openSkins"));
    QQuickItem *grid = nullptr;
    QTRY_VERIFY((grid = visual(window->contentItem(), "lyricSkinCatalog")));
    QQuickItem *card = nullptr;
    QTRY_VERIFY((card = visual(grid, "pluginLyricSkinCard")));
    QVERIFY(QMetaObject::invokeMethod(card, "chosen"));
    QTRY_COMPARE(catalog->selectedSkin(), entry->key);
    QPointer<QQuickItem> skin;
    QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
    QVERIFY(skin->property("configuration").value<AppearanceConfiguration *>());
    QPointer<AppearanceConfiguration> configuration = entry->configuration();
    QVERIFY(configuration && configuration->active());
    auto *drawer = root->findChild<QObject *>("lyricSkinDrawer");
    QVERIFY(drawer);
    QVERIFY(QMetaObject::invokeMethod(drawer, "close"));
    QByteArray pcm;
    QDataStream samples(&pcm, QIODevice::WriteOnly);
    samples.setByteOrder(QDataStream::LittleEndian);
    constexpr int rate = 16000;
    const int seconds = qEnvironmentVariableIsSet("FOLIA_TEST_STUDIO") ? 90 : 30;
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
                              qPrintable(host.playback.errorMessage()), 5000);
    QJsonArray rows;
    for (int row = 0; row < 12; ++row)
        rows.append(QJsonObject{{"text", QString("让晚风带走这片星光 第%1行").arg(row)},
                                {"start_ms", row * 2500},
                                {"duration_ms", 2500},
                                {"translation", QString("Authored fixture line %1").arg(row)},
                                {"words", QJsonArray{}}});
    QVERIFY(host.playback.lyricText()->replace({{"lines", rows}}, track.id));
    QTRY_VERIFY_WITH_TIMEOUT(host.playback.positionMs() >= 1100, 5000);
    host.playback.pause();
    QTRY_VERIFY(!host.playback.playing());
    const auto captures = qEnvironmentVariable("FOLIA_CAPTURE_DIR");

    auto plainValue = [](const QVariant &value) {
        return value.metaType() == QMetaType::fromType<QJSValue>()
                   ? value.value<QJSValue>().toVariant()
                   : value;
    };
    auto nativeObject = [](const QVariant &value) -> QObject * {
        return value.metaType() == QMetaType::fromType<QJSValue>()
                   ? value.value<QJSValue>().toQObject()
                   : value.value<QObject *>();
    };
    for (const auto &mode : {"still", "classic", "cadenza", "partita", "tilt", "claddagh",
                             "cappella", "pendolo", "fume", "tempera", "lumiere", "sonnet", "monet",
                             "diorama", "metaphor", "hanabi", "nebbia", "machi"}) {
        const auto selectedModes =
            qEnvironmentVariable("FOLIA_TEST_MODES").split(',', Qt::SkipEmptyParts);
        if (qEnvironmentVariableIsSet("FOLIA_TEST_STUDIO_ONLY"))
            continue;
        if (!selectedModes.isEmpty() && !selectedModes.contains(QString::fromLatin1(mode)))
            continue;
        QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
        const bool patched = configuration->patch({{"mode", QString::fromLatin1(mode)}});
        QVERIFY2(patched, qPrintable(configuration->errorMessage()));
        QTRY_VERIFY(!configuration->busy());
        auto *loader = visual(skin, "foliaDynamicPresentationHost");
        QVERIFY(loader);
        QObject *dynamic = nullptr;
        QTRY_VERIFY((dynamic = nativeObject(loader->property("item"))));
        auto *timeline = nativeObject(dynamic->property("timeline"));
        auto *preparation = nativeObject(dynamic->property("preparation"));
        QVERIFY(timeline && preparation);
        if (QString::fromLatin1(mode) != "still") {
            QTRY_VERIFY_WITH_TIMEOUT(timeline->property("ready").toBool() &&
                                         !preparation->property("busy").toBool(),
                                     15000);
            QVERIFY2(preparation->property("errorMessage").toString().isEmpty(),
                     qPrintable(preparation->property("errorMessage").toString()));
        }
        auto *stage = nativeObject(dynamic->property("stage"));
        QVERIFY(stage);
        QTRY_COMPARE_WITH_TIMEOUT(stage->property("loadedMode").toString(),
                                  QString::fromLatin1(mode), 15000);
        QPointer<QObject> renderer = nativeObject(stage->property("renderer"));
        QVERIFY(renderer);
        if (QString::fromLatin1(mode) == "hanabi") {
            QTest::qWait(6000);
            QVariant diagnostic;
            QVERIFY(
                QMetaObject::invokeMethod(renderer, "inspect", Q_RETURN_ARG(QVariant, diagnostic)));
            qInfo() << "Hanabi native preparation" << plainValue(diagnostic);
        }
        QVERIFY(renderer);
        if (QString::fromLatin1(mode) == "nebbia") {
            QTest::qWait(1500);
            QVERIFY(renderer);
            QVariant diagnostic;
            QVERIFY(
                QMetaObject::invokeMethod(renderer, "inspect", Q_RETURN_ARG(QVariant, diagnostic)));
            qInfo() << "Nebbia preparation diagnostic" << plainValue(diagnostic);
        }
        if (renderer->property("renderReady").isValid())
            QTRY_VERIFY2_WITH_TIMEOUT(
                !renderer || renderer->property("renderReady").toBool() ||
                    !renderer->property("errorString").toString().isEmpty(),
                qPrintable(renderer ? renderer->property("errorString").toString()
                                    : QStringLiteral("Renderer retired during preparation")),
                25000);
        QVERIFY2(renderer, "Renderer retired during native preparation");
        QVERIFY2(renderer->property("errorString").toString().isEmpty(),
                 qPrintable(renderer->property("errorString").toString()));
        if (QString::fromLatin1(mode) == "classic")
            QTRY_VERIFY_WITH_TIMEOUT(renderer->property("layerCount").toInt() > 0, 10000);
        if (QString::fromLatin1(mode) == "metaphor") {
            const auto frameValue =
                renderer->property("frame").value<QJSValue>().toVariant().toMap();
            const auto words = frameValue["shapeData"].toString();
            QByteArray bytes(words.size() * 2, Qt::Uninitialized);
            for (qsizetype i = 0; i < words.size(); ++i)
                qToLittleEndian<quint16>(words[i].unicode(), bytes.data() + i * 2);
            float maxMix = 0;
            for (qsizetype at = 0; at + 4 <= bytes.size(); at += 4) {
                float value;
                std::memcpy(&value, bytes.constData() + at, 4);
                if ((at / 4) % 12 >= 5 && (at / 4) % 12 <= 7)
                    maxMix = qMax(maxMix, value);
            }
            QVERIFY2(maxMix > 0, "Packed QV4 float payload must retain nonzero shape colors");
            auto *field = renderer->findChild<QQuickItem *>("metaphorField");
            QVERIFY(field);
            const auto grab = field->grabToImage();
            QVERIFY(grab);
            QSignalSpy captured(grab.data(), &QQuickItemGrabResult::ready);
            QVERIFY(!captured.isEmpty() || captured.wait(5000));
            const auto fieldImage = grab->image().convertToFormat(QImage::Format_RGBA8888);
            int ink = 0, alpha = 0;
            for (int y = 0; y < fieldImage.height(); ++y)
                for (int x = 0; x < fieldImage.width(); ++x) {
                    const auto c = fieldImage.pixelColor(x, y);
                    ink += c.red() > 5 || c.green() > 5 || c.blue() > 5;
                    alpha += c.alpha() > 0;
                }
            qInfo() << "Metaphor field RGB/alpha pixels" << ink << alpha;
            QVERIFY(fieldImage.save(captures + "/metaphor-field.png"));
            QVERIFY2(ink > 100, "Metaphor field must contain actual glyphs and shapes");
        }
        if (QString::fromLatin1(mode) == "nebbia" || QString::fromLatin1(mode) == "machi") {
            QVariant diagnostic;
            QVERIFY(
                QMetaObject::invokeMethod(renderer, "inspect", Q_RETURN_ARG(QVariant, diagnostic)));
            qInfo() << mode << "native renderer" << plainValue(diagnostic);
            auto *item = qobject_cast<QQuickItem *>(renderer);
            QVERIFY(item);
            const auto grab = item->grabToImage();
            QVERIFY(grab);
            QSignalSpy captured(grab.data(), &QQuickItemGrabResult::ready);
            QVERIFY(!captured.isEmpty() || captured.wait(5000));
            const auto image = grab->image().convertToFormat(QImage::Format_RGBA8888);
            int lit = 0;
            for (int y = 0; y < image.height(); ++y)
                for (int x = 0; x < image.width(); ++x) {
                    const auto color = image.pixelColor(x, y);
                    lit += color.alpha() > 0 &&
                           std::max({color.red(), color.green(), color.blue()}) > 24;
                }
            if (!captures.isEmpty())
                QVERIFY(image.save(captures + '/' + mode + "-renderer.png"));
            QVERIFY2(lit > image.width() * image.height() / 100, "Native scene is empty");
            if (QString::fromLatin1(mode) == "nebbia") {
                for (const auto &behind : {QStringLiteral("night"), QStringLiteral("aquarium")})
                    for (const auto &glass :
                         {QStringLiteral("rain"), QStringLiteral("dew"), QStringLiteral("snow")}) {
                        if (behind == "night" && glass == "rain")
                            continue;
                        QVERIFY(configuration->patch(
                            {{"nebbiaBehind", behind}, {"nebbiaGlass", glass}}));
                        QTest::qWait(100);
                        QTRY_VERIFY2_WITH_TIMEOUT(
                            !renderer || renderer->property("renderReady").toBool() ||
                                !renderer->property("errorString").toString().isEmpty(),
                            "Nebbia variant did not finish preparation", 25000);
                        QVERIFY(renderer);
                        QVERIFY2(renderer->property("errorString").toString().isEmpty(),
                                 qPrintable(renderer->property("errorString").toString()));
                        QTRY_VERIFY(renderer->property("renderReady").toBool());
                        const auto variantGrab =
                            qobject_cast<QQuickItem *>(renderer.data())->grabToImage();
                        QVERIFY(variantGrab);
                        QSignalSpy variantReady(variantGrab.data(), &QQuickItemGrabResult::ready);
                        QVERIFY(!variantReady.isEmpty() || variantReady.wait(5000));
                        const auto variantImage = variantGrab->image();
                        QVERIFY(!variantImage.isNull());
                        int visiblePixels = 0;
                        for (int y = 0; y < variantImage.height(); ++y)
                            for (int x = 0; x < variantImage.width(); ++x) {
                                const auto color = variantImage.pixelColor(x, y);
                                visiblePixels +=
                                    color.alpha() > 0 &&
                                    std::max({color.red(), color.green(), color.blue()}) > 24;
                            }
                        QVERIFY2(visiblePixels > variantImage.width() * variantImage.height() / 100,
                                 "Nebbia scene variant is empty");
                        if (!captures.isEmpty())
                            QVERIFY(variantImage.save(captures + "/nebbia-" + behind + '-' + glass +
                                                      ".png"));
                        qInfo() << "Nebbia native variant" << behind << glass;
                    }
                QVERIFY(configuration->patch({{"nebbiaBehind", "night"}, {"nebbiaGlass", "rain"}}));
                QTRY_VERIFY(!configuration->busy());
                QTRY_VERIFY_WITH_TIMEOUT(renderer->property("renderReady").toBool(), 25000);
            } else {
                for (const auto &variant : QList<QStringList>{{"konbini", "day", "clear"},
                                                              {"station", "dusk", "snow"},
                                                              {"kowloon", "night", "rain"}}) {
                    QVERIFY(configuration->patch({{"machiScene", variant[0]},
                                                  {"machiTimeOfDay", variant[1]},
                                                  {"machiWeather", variant[2]},
                                                  {"machiQualityAdaptive", false}}));
                    QTest::qWait(100);
                    QTRY_VERIFY_WITH_TIMEOUT(
                        !renderer || renderer->property("renderReady").toBool() ||
                            !renderer->property("errorString").toString().isEmpty(),
                        45000);
                    QVERIFY(renderer);
                    QVERIFY2(renderer->property("errorString").toString().isEmpty(),
                             qPrintable(renderer->property("errorString").toString()));
                    QVariant state;
                    QVERIFY(QMetaObject::invokeMethod(renderer, "inspect",
                                                      Q_RETURN_ARG(QVariant, state)));
                    QCOMPARE(plainValue(state).toMap().value("sourceScene").toString(), variant[0]);
                    const auto shot = qobject_cast<QQuickItem *>(renderer.data())->grabToImage();
                    QVERIFY(shot);
                    QSignalSpy ready(shot.data(), &QQuickItemGrabResult::ready);
                    QVERIFY(!ready.isEmpty() || ready.wait(5000));
                    const auto pixels = shot->image();
                    int visible = 0;
                    for (int y = 0; y < pixels.height(); ++y)
                        for (int x = 0; x < pixels.width(); ++x) {
                            const auto c = pixels.pixelColor(x, y);
                            visible +=
                                c.alpha() > 0 && std::max({c.red(), c.green(), c.blue()}) > 24;
                        }
                    QVERIFY2(visible > pixels.width() * pixels.height() / 100,
                             "Machi scene variant is empty");
                    if (!captures.isEmpty())
                        QVERIFY(pixels.save(captures + "/machi-" + variant.join('-') + ".png"));
                    qInfo() << "Machi native variant" << variant;
                }
            }
        }
        if (QString::fromLatin1(mode) == "diorama") {
            QTRY_VERIFY_WITH_TIMEOUT(
                plainValue(renderer->property("memoryBreakdown")).toMap()["floatGpu"].toDouble() >
                    0,
                10000);
            QVERIFY(
                plainValue(renderer->property("memoryBreakdown")).toMap()["pointTextures"].toInt() >
                0);
        }
        if (QString::fromLatin1(mode) == "metaphor") {
            const int prepared = renderer->property("preparationRevision").toInt();
            QVERIFY(configuration->patch({{"metaphorGrain", 1.5}, {"metaphorFlow", .5}}));
            QTRY_VERIFY(!configuration->busy());
            QTRY_VERIFY(plainValue(renderer->property("tuning")).toMap()["grain"].toDouble() ==
                        1.5);
            QTest::qWait(150);
            QCOMPARE(renderer->property("preparationRevision").toInt(), prepared);
            QVERIFY(renderer->property("renderReady").toBool());
            auto *clock = visual(loader, "foliaPresentationClock");
            QVERIFY(clock);
            const auto frozen = clock->property("renderTime").toDouble();
            QTest::qWait(100);
            QCOMPARE(clock->property("renderTime").toDouble(), frozen);
            host.playback.play();
            QTRY_VERIFY(host.playback.playing());
            QTRY_VERIFY(clock->property("renderTime").toDouble() > frozen + 100);
            host.playback.pause();
            QTRY_VERIFY(!host.playback.playing());
            host.playback.seek(10500);
            QTRY_VERIFY_WITH_TIMEOUT(qAbs(host.playback.positionMs() - 10500) < 150, 5000);
            QTRY_VERIFY_WITH_TIMEOUT(qAbs(clock->property("renderTime").toDouble() - 10500) < 150,
                                     5000);
            QTRY_VERIFY_WITH_TIMEOUT(renderer->property("renderReady").toBool(), 15000);
            QVERIFY(configuration->patch({{"metaphorGrain", 1.}, {"metaphorFlow", 1.}}));
            QTRY_VERIFY(!configuration->busy());
        }
        const auto cardOutput = qEnvironmentVariable("FOLIA_TEST_CARD_OUTPUT");
        if (!cardOutput.isEmpty()) {
            // Native render nodes draw in the window's actual render pass.
            // Capture those presented pixels; item-grab FBOs omit some nodes.
            const auto fullImage = window->grabWindow();
            QVERIFY(!fullImage.isNull());
            const auto scaled = fullImage.scaled(QSize(280, 180), Qt::KeepAspectRatioByExpanding,
                                                 Qt::SmoothTransformation);
            const auto thumbnail =
                scaled.copy((scaled.width() - 280) / 2, (scaled.height() - 180) / 2, 280, 180);
            QVERIFY(thumbnail.save(cardOutput + "/" + mode + ".png"));
            QFile receipt(cardOutput + "/" + mode + ".json");
            QVERIFY(receipt.open(QIODevice::WriteOnly));
            receipt.write(
                QJsonDocument(
                    QJsonObject{
                        {"mode", QString::fromLatin1(mode)},
                        {"capturedAtUtc", QDateTime::currentDateTimeUtc().toString(Qt::ISODate)},
                        {"timeSeconds", renderer->property("timeSeconds").toDouble()},
                        {"fixtureLines", rows.size()},
                        {"devicePixelRatio", window->devicePixelRatio()},
                        {"sourceWidth", fullImage.width()},
                        {"sourceHeight", fullImage.height()},
                        {"sizing", "presented window capture, smooth downsample and center crop"},
                        {"outputWidth", 280},
                        {"outputHeight", 180}})
                    .toJson());
        }
        QTest::qWait(500);
        if (!captures.isEmpty())
            QVERIFY(window->grabWindow().save(captures + "/style-" + mode + ".png"));
        qInfo() << "Folia style" << mode << "error" << renderer->property("errorString");
        QVERIFY2(stage->property("errorString").toString().isEmpty(),
                 qPrintable(stage->property("errorString").toString()));
    }
    if (qEnvironmentVariableIsSet("FOLIA_TEST_STUDIO")) {
        const auto studioMode = qEnvironmentVariable("FOLIA_TEST_STUDIO_MODE");
        if (!studioMode.isEmpty()) {
            QVERIFY(configuration->patch({{"mode", studioMode}}));
            QTRY_VERIFY(!configuration->busy());
        }
        auto currentRenderer = [&]() -> QObject * {
            auto *currentSkin = visual(window->contentItem(), "foliaPlaybackPage");
            auto *loader =
                currentSkin ? visual(currentSkin, "foliaDynamicPresentationHost") : nullptr;
            auto *dynamic = loader ? nativeObject(loader->property("item")) : nullptr;
            auto *stage = dynamic ? nativeObject(dynamic->property("stage")) : nullptr;
            return stage ? nativeObject(stage->property("renderer")) : nullptr;
        };
        QPointer<QObject> retiredRenderer = currentRenderer();
        auto *button = visual(skin, "foliaStylePicker");
        QVERIFY(button);
        QVERIFY(QMetaObject::invokeMethod(button, "clicked"));
        QQuickItem *studio = nullptr;
        QTRY_VERIFY_WITH_TIMEOUT((studio = visual(window->contentItem(), "foliaStyleStudio")),
                                 10000);
        QTRY_VERIFY(retiredRenderer.isNull());
        auto *preview = visual(studio, "foliaStudioPreview");
        QVERIFY(preview);
        QTRY_VERIFY2_WITH_TIMEOUT(preview->property("renderReady").toBool(),
                                  qPrintable(preview->property("errorString").toString()), 25000);
        const auto before = host.playback.positionMs();
        host.playback.play();
        QTRY_VERIFY(host.playback.playing());
        QTRY_VERIFY(host.playback.positionMs() > before + 100);
        auto *source = visual(studio, "foliaStudioPreviewSource");
        QVERIFY(source);
        QVERIFY(QMetaObject::invokeMethod(source, "picked", Q_ARG(int, 1)));
        QTRY_COMPARE(preview->property("source").toString(), QString("live"));
        QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 25000);
        auto *choice = visual(studio, "foliaStudioStyle-metaphor");
        QVERIFY(choice);
        QVERIFY(QMetaObject::invokeMethod(choice, "clicked"));
        QTRY_VERIFY(!configuration->busy());
        QTRY_COMPARE(configuration->values()["mode"].toString(), QString("metaphor"));
        QTRY_VERIFY2_WITH_TIMEOUT(preview->property("renderReady").toBool(),
                                  qPrintable(preview->property("errorString").toString()), 25000);
        QVERIFY(host.playback.playing());
        QVERIFY(window->grabWindow().save(captures + "/studio-wide.png"));
        auto *pause = visual(studio, "foliaStudioPreviewPause");
        QVERIFY(pause);
        auto *live = nativeObject(preview->property("preview"));
        QVERIFY(live);
        auto *previewStage = nativeObject(live->property("stage"));
        QVERIFY(previewStage);
        QPointer<QObject> frozenRenderer = nativeObject(previewStage->property("renderer"));
        QVERIFY(frozenRenderer);
        QVERIFY(QMetaObject::invokeMethod(pause, "clicked"));
        QTRY_VERIFY(nativeObject(preview->property("frozenCapture")));
        QTRY_VERIFY(frozenRenderer.isNull());
        QTRY_COMPARE_WITH_TIMEOUT(
            host.runtime.context(installation)->graphics()->memoryBudget()->floatTextures.load(), 0,
            10000);
        const auto continued = host.playback.positionMs();
        QTRY_VERIFY(host.playback.positionMs() > continued + 100);
        QVERIFY(QMetaObject::invokeMethod(pause, "clicked"));
        QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 25000);

        auto *tabs = visual(studio, "foliaStudioTabs");
        QVERIFY(tabs);
        for (int tab = 1; tab < 5; ++tab) {
            QVERIFY(QMetaObject::invokeMethod(tabs, "picked", Q_ARG(int, tab)));
            QTest::qWait(60);
        }
        auto *resetTab = visual(studio, "foliaStudioResetTab");
        QVERIFY(resetTab);
        QCOMPARE(resetTab->height(), tabs->height());
        QCOMPARE(resetTab->height(), qreal(32));
        auto *renderScale = visual(studio, "globalRenderScale");
        auto *antialias = visual(studio, "globalAntialias");
        QVERIFY(renderScale && antialias);
        QVERIFY(
            QMetaObject::invokeMethod(renderScale, "valueEdited", Q_ARG(QVariant, QVariant(0.75))));
        QTRY_COMPARE(configuration->values()["globalRenderScale"].toDouble(), 0.75);
        QVERIFY(
            QMetaObject::invokeMethod(antialias, "valueEdited", Q_ARG(QVariant, QVariant("on"))));
        QTRY_COMPARE(configuration->values()["globalAntialias"].toString(), QString("on"));
        QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 25000);
        live = nativeObject(preview->property("preview"));
        QVERIFY(live);
        previewStage = nativeObject(live->property("stage"));
        QVERIFY(previewStage && previewStage->property("qualityRasterBytes").toDouble() > 0);
        QVERIFY(QMetaObject::invokeMethod(resetTab, "clicked"));
        QTRY_COMPARE(configuration->values()["globalRenderScale"].toDouble(), 1.0);
        QTRY_COMPARE(configuration->values()["globalAntialias"].toString(), QString("auto"));
        QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 25000);
        QVERIFY(QMetaObject::invokeMethod(tabs, "picked", Q_ARG(int, 2)));
        auto *serif = visual(studio, "foliaFontStyleSerif");
        QVERIFY(serif);
        QVERIFY(QMetaObject::invokeMethod(serif, "clicked"));
        QTRY_COMPARE(configuration->values()["fontStyle"].toString(), QString("serif"));
        QTest::qWait(100);
        QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 25000);
        QVERIFY(QMetaObject::invokeMethod(resetTab, "clicked"));
        QTRY_COMPARE(configuration->values()["fontStyle"].toString(), QString("sans"));
        QVERIFY(configuration->patch({{"mode", "tempera"}, {"temperaLayerImageFrequency", 1.0}}));
        QTRY_VERIFY(!configuration->busy());
        QVERIFY(QMetaObject::invokeMethod(tabs, "picked", Q_ARG(int, 0)));
        QQuickItem *manageImages = nullptr;
        QTRY_VERIFY((manageImages = visual(studio, "tempera.imagesManage")));
        QTRY_VERIFY(manageImages->isEnabled());
        QVERIFY(QMetaObject::invokeMethod(manageImages, "clicked"));
        QPointer<EchoPluginImageDropArea> imageDrop;
        QTRY_VERIFY((imageDrop = qobject_cast<EchoPluginImageDropArea *>(
                         visual(window->contentItem(), "tempera.imagesDrop"))));
        QTRY_VERIFY(imageDrop->flags().testFlag(QQuickItem::ItemAcceptsDrops));
        QImage importedImage(16, 16, QImage::Format_RGBA8888);
        importedImage.fill(QColor("#479ace"));
        const auto importedPath = host.temporary.filePath("folia-studio-image.png");
        QVERIFY(importedImage.save(importedPath));
        QMimeData imageMime;
        imageMime.setUrls({QUrl::fromLocalFile(importedPath)});
        const auto dropPoint = imageDrop->mapToScene(imageDrop->boundingRect().center());
        QDragEnterEvent imageEnter(dropPoint, Qt::CopyAction, &imageMime, Qt::LeftButton,
                                   Qt::NoModifier);
        QCoreApplication::sendEvent(window, &imageEnter);
        QVERIFY(imageEnter.isAccepted());
        QTRY_VERIFY(imageDrop->containsDrag());
        QPointer<EchoPluginOperation> imageOperation;
        QList<QJSValue> imageOperations;
        connect(imageDrop, &EchoPluginImageDropArea::importStarted, this,
                [&](EchoPluginOperation *operation) {
                    imageOperation = operation;
                    imageOperations.append(host.engine.newQObject(operation));
                });
        QDropEvent imageEvent(dropPoint, Qt::CopyAction, &imageMime, Qt::LeftButton,
                              Qt::NoModifier);
        QCoreApplication::sendEvent(window, &imageEvent);
        QVERIFY(imageEvent.isAccepted());
        QTRY_VERIFY(imageOperation && imageOperation->finished());
        QCOMPARE(imageOperation->state(), EchoPluginOperation::Succeeded);
        auto *imageDone = visual(window->contentItem(), "tempera.imagesDone");
        QVERIFY(imageDone);
        QTRY_VERIFY(imageDone->isEnabled());
        QVERIFY(QMetaObject::invokeMethod(imageDone, "clicked"));
        QTRY_COMPARE(configuration->values()["temperaLayerImages"].toList().size(), 1);
        QTRY_VERIFY(imageDrop.isNull());
        QTRY_VERIFY_WITH_TIMEOUT(preview->property("renderReady").toBool(), 25000);
        QVERIFY(QMetaObject::invokeMethod(manageImages, "clicked"));
        QQuickItem *clearImages = nullptr;
        QTRY_VERIFY((clearImages = visual(window->contentItem(), "tempera.imagesClear")));
        QTRY_VERIFY(clearImages->isEnabled());
        QVERIFY(QMetaObject::invokeMethod(clearImages, "clicked"));
        imageDone = visual(window->contentItem(), "tempera.imagesDone");
        QVERIFY(imageDone);
        QTRY_VERIFY(imageDone->isEnabled());
        QVERIFY(QMetaObject::invokeMethod(imageDone, "clicked"));
        QTRY_COMPARE(configuration->values()["temperaLayerImages"].toList().size(), 0);
        QVERIFY(configuration->patch({{"mode", "metaphor"}}));
        QTRY_VERIFY(!configuration->busy());
        QVERIFY(QMetaObject::invokeMethod(tabs, "picked", Q_ARG(int, 4)));
        const auto hostThemeKey = host.theme.themeKey();
        const auto hostAccent = host.theme.accent();
        auto *filterSettings = visual(studio, "foliaLyricFilterSettings");
        auto *filterRule = visual(studio, "foliaLyricFilterRegex");
        QVERIFY(filterSettings && filterRule);
        const auto oldRule = configuration->values()["lyricFilterRegex"];
        QVERIFY(filterRule->setProperty("text", "["));
        QVERIFY(QMetaObject::invokeMethod(filterSettings, "commit"));
        QVERIFY(!filterSettings->property("errorMessage").toString().isEmpty());
        QCOMPARE(configuration->values()["lyricFilterRegex"], oldRule);
        QVERIFY(filterRule->setProperty("text", "^metadata$"));
        QVERIFY(QMetaObject::invokeMethod(filterSettings, "commit"));
        QTRY_COMPARE(configuration->values()["lyricFilterRegex"].toString(), QString("^metadata$"));
        QVERIFY(configuration->patch({{"lyricFilterRegex", oldRule}}));
        QTRY_VERIFY(!configuration->busy());
        auto *themeSettings = visual(studio, "foliaThemeSettings");
        auto *generate = visual(studio, "foliaThemeGenerate");
        QVERIFY(themeSettings && generate);
        QVERIFY(QMetaObject::invokeMethod(generate, "clicked"));
        QTRY_COMPARE(configuration->values()["themeMode"].toString(), QString("ai"));
        QTRY_VERIFY(!configuration->busy());
        QVERIFY(!configuration->values()["themeAi"].toMap().isEmpty());
        auto *editTheme = visual(studio, "foliaThemeEdit");
        QVERIFY(editTheme);
        QVERIFY(QMetaObject::invokeMethod(editTheme, "clicked"));
        QObject *editor = nullptr;
        QTRY_VERIFY((editor = nativeObject(themeSettings->property("_editor"))));
        QTRY_VERIFY(editor->property("opened").toBool());
        auto *importJson = visual(window->contentItem(), "foliaThemeJsonImport");
        QVERIFY(importJson);
        QVERIFY(QMetaObject::invokeMethod(importJson, "clicked"));
        QQuickItem *json = nullptr;
        QTRY_VERIFY((json = visual(window->contentItem(), "foliaThemeJson")));
        QVERIFY(json->setProperty("text", "{invalid"));
        auto *applyJson = visual(window->contentItem(), "foliaThemeJsonApply");
        QVERIFY(applyJson);
        const auto originalDraft = plainValue(editor->property("draft"));
        QVERIFY(QMetaObject::invokeMethod(applyJson, "clicked"));
        QVERIFY(!editor->property("errorMessage").toString().isEmpty());
        QCOMPARE(plainValue(editor->property("draft")), originalDraft);
        QVERIFY(QMetaObject::invokeMethod(editor, "edit", Q_ARG(QString, "name"),
                                          Q_ARG(QString, "原生主题验收")));
        QVERIFY(QMetaObject::invokeMethod(editor, "edit", Q_ARG(QString, "accentColor"),
                                          Q_ARG(QString, "#479ace")));
        auto *saveTheme = visual(window->contentItem(), "foliaThemeSave");
        QVERIFY(saveTheme);
        QPointer<QObject> retiredEditor = editor;
        QVERIFY(QMetaObject::invokeMethod(saveTheme, "clicked"));
        QTRY_VERIFY(retiredEditor.isNull());
        QTRY_COMPARE(configuration->values()["themeAi"].toMap()["dark"].toMap()["name"].toString(),
                     QString("原生主题验收"));
        QCOMPARE(
            configuration->values()["themeAi"].toMap()["dark"].toMap()["accentColor"].toString(),
            QString("#479ace"));
        auto *daylight = visual(studio, "foliaThemeDaylight");
        QVERIFY(daylight);
        QVERIFY(QMetaObject::invokeMethod(daylight, "clicked"));
        QTRY_VERIFY(configuration->values()["themeDaylight"].toBool());
        QCOMPARE(host.theme.themeKey(), hostThemeKey);
        QCOMPARE(host.theme.accent(), hostAccent);
        QVERIFY(configuration->patch({{"themeMode", "default"}, {"themeDaylight", false}}));
        QTRY_VERIFY(!configuration->busy());
        window->resize(820, 820);
        QTRY_VERIFY(!studio->property("wide").toBool());
        QTest::qWait(200);
        QVERIFY(window->grabWindow().save(captures + "/studio-narrow.png"));
        auto *bodyView = visual(studio, "foliaStudioBodyViewport");
        QVERIFY(bodyView);
        auto *flick = nativeObject(bodyView->property("contentItem"));
        QVERIFY(flick);
        QTRY_VERIFY(flick->property("contentHeight").toDouble() >
                    flick->property("height").toDouble());
        flick->setProperty("contentY", flick->property("contentHeight").toDouble() -
                                           flick->property("height").toDouble());
        QTest::qWait(150);
        qInfo() << "Studio narrow scroll" << flick->metaObject()->className()
                << flick->property("height") << flick->property("contentHeight")
                << flick->property("contentY") << studio->mapRectToScene(studio->boundingRect());
        QVERIFY(window->grabWindow().save(captures + "/studio-narrow-settings.png"));
        QTRY_VERIFY(!nativeObject(preview->property("preview")));
        flick->setProperty("contentY", 0);

        window->resize(1100, 820);
        QPointer<QObject> oldStudio = studio;
        auto *dialog = nativeObject(studio->property("dialog"));
        QVERIFY(dialog);
        QVERIFY(QMetaObject::invokeMethod(dialog, "close"));
        QTRY_VERIFY(oldStudio.isNull());
        QTRY_VERIFY(!host.runtime.context(installation)->ui()->state()["foliaStudioOpen"].toBool());
        QPointer<QObject> resumed;
        QElapsedTimer recoveryClock;
        recoveryClock.start();
        bool recoveryReported = false;
        QTRY_VERIFY_WITH_TIMEOUT(
            ([&] {
                resumed = currentRenderer();
                if (resumed && !recoveryReported && recoveryClock.elapsed() > 5000) {
                    recoveryReported = true;
                    qInfo() << "Studio main recovery" << resumed->property("errorString")
                            << plainValue(resumed->property("diagnostic"));
                }
                return resumed && resumed->property("renderReady").toBool();
            })(),
            25000);
        QVERIFY(host.playback.playing());
        qInfo() << "Studio first close and main restoration passed";
        // Open the same studio from the production skin settings entry; closing
        // that drawer must not revoke the activation-owned studio dialog.
        QVERIFY(QMetaObject::invokeMethod(playback, "openSkins"));
        QQuickItem *catalog = nullptr, *selectedCard = nullptr;
        QTRY_VERIFY((catalog = visual(window->contentItem(), "lyricSkinCatalog")));
        QTRY_VERIFY((selectedCard = visual(catalog, "pluginLyricSkinCard")));
        QVERIFY(QMetaObject::invokeMethod(selectedCard, "chosen"));
        QQuickItem *entryButton = nullptr;
        QTRY_VERIFY((entryButton = visual(window->contentItem(), "foliaOpenStyleStudio")));
        QVERIFY(QMetaObject::invokeMethod(entryButton, "clicked"));
        QTRY_VERIFY((studio = visual(window->contentItem(), "foliaStyleStudio")));
        QTRY_VERIFY(!visual(window->contentItem(), "foliaOpenStyleStudio"));
        preview = visual(studio, "foliaStudioPreview");
        QVERIFY(preview);
        qInfo() << "Studio settings-entry reopened";
        QTRY_VERIFY2_WITH_TIMEOUT(preview->property("renderReady").toBool(),
                                  qPrintable(preview->property("errorString").toString()), 25000);
        dialog = nativeObject(studio->property("dialog"));
        QVERIFY(dialog);
        oldStudio = studio;
        QVERIFY(QMetaObject::invokeMethod(dialog, "close"));
        QTRY_VERIFY(oldStudio.isNull());
        QVERIFY(host.playback.playing());
        host.playback.pause();
        QTRY_VERIFY(!host.playback.playing());
        QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
    }
    // An entirely transparent window must release the plugin drawing data.
    const auto memory = host.runtime.context(installation)->graphics()->memoryBudget();
    QPointer<QQuickItem> oldSkin = skin;
    window->setOpacity(0);
    QTRY_VERIFY(oldSkin.isNull());
    QTRY_COMPARE_WITH_TIMEOUT(memory->floatTextures.load(), 0, 10000);
    window->setOpacity(1);
    skin = nullptr;
    QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
    if (qEnvironmentVariable("FOLIA_TEST_MODES") == "metaphor") {
        // Page and stage loaders may replace objects while lyric preparation
        // restarts. Resolve the current production tree on each poll instead of
        // retaining raw pointers to a previous presentation or temporary renderer.
        auto currentRenderer = [&]() -> QObject * {
            auto *currentSkin = visual(window->contentItem(), "foliaPlaybackPage");
            if (!currentSkin)
                return nullptr;
            auto *loader = visual(currentSkin, "foliaDynamicPresentationHost");
            auto *dynamic = loader ? nativeObject(loader->property("item")) : nullptr;
            auto *stage = dynamic ? nativeObject(dynamic->property("stage")) : nullptr;
            return stage ? nativeObject(stage->property("renderer")) : nullptr;
        };
        QPointer<QObject> renderer;
        QTRY_VERIFY_WITH_TIMEOUT(
            (renderer = currentRenderer()) && renderer->property("renderReady").toBool(), 25000);
        QVERIFY(memory->floatTextures.load() > 0);
        QPointer<QObject> retiredView = renderer;
        window->hide();
        QTRY_VERIFY(retiredView.isNull());
        QTRY_COMPARE_WITH_TIMEOUT(memory->floatTextures.load(), 0, 10000);
        window->show();
        QVERIFY(QTest::qWaitForWindowExposed(window));
        QTRY_VERIFY_WITH_TIMEOUT(
            (renderer = currentRenderer()) && renderer->property("renderReady").toBool(), 25000);
        QTRY_VERIFY((skin = visual(window->contentItem(), "foliaPlaybackPage")));
    }
    for (const auto &warning : warnings)
        qWarning().noquote() << warning;
    QVERIFY2(warnings.isEmpty(), qPrintable(warnings.join('\n')));
    QPointer<QObject> retired = skin;
    host.runtime.setEnabled(installation, false);
    QTRY_VERIFY(retired.isNull());
}

QTEST_MAIN(FoliaHostTest)
#include "folia-host.moc"
