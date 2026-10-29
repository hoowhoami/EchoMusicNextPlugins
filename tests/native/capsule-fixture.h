#pragma once
#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include <QQmlPropertyMap>
#include <QSet>

// Created only by the dedicated capsule test. Other QML suites keep their
// original host count and timing baseline. No production API is mocked.
class FoliaCapsuleFixture {
  struct Active {
    Host host;
    QObject owner;
    EchoMusic::EchoPluginContext *scope = nullptr;
    std::unique_ptr<EchoMusic::EchoPluginViewContext> page;
    explicit Active(QQmlPropertyMap &state) {
      host.shell.attachPlayback(host.playback);
      host.runtime.importDirectory(
          package(host.temporary.path(), "export function activate(ctx) {}\n"));
      QElapsedTimer deadline;
      deadline.start();
      EchoMusic::EchoPluginContext *activation = nullptr;
      while (deadline.elapsed() < 7000) {
        const auto id = host.runtime.installationForId("test.runtime");
        if (!id.isEmpty() && host.runtime.state(id) == PluginRuntime::Active) {
          activation = host.runtime.context(id);
          break;
        }
        QTest::qWait(1);
      }
      if (!activation)
        qFatal("Capsule plugin activation failed");
      const auto wav = host.temporary.filePath("authored.wav");
      QByteArray bytes;
      QDataStream stream(&bytes, QIODevice::WriteOnly);
      stream.setByteOrder(QDataStream::LittleEndian);
      const quint32 samples = 8000 * 60;
      stream.writeRawData("RIFF", 4);
      stream << quint32(36 + samples * 2);
      stream.writeRawData("WAVEfmt ", 8);
      stream << quint32(16) << quint16(1) << quint16(1) << quint32(8000)
             << quint32(16000) << quint16(2) << quint16(16);
      stream.writeRawData("data", 4);
      stream << quint32(samples * 2);
      bytes.append(QByteArray(samples * 2, '\0'));
      write(wav, bytes);
      EchoMusic::PlaybackTracks tracks;
      QSet<QString> nativeKeys;
      for (int i = 0; i < 200; ++i) {
        EchoMusic::PlaybackTrack track;
        track.id = QString::number(i + 1);
        track.title = QString("Authored queue track %1").arg(i + 1);
        track.artist = "Capsule native fixture";
        track.durationMs = 60000;
        track.localPath =
            host.temporary.filePath(QString("track-%1.wav").arg(i));
        if (!QFile::link(wav, track.localPath) &&
            !QFile::copy(wav, track.localPath))
          qFatal("Cannot create PCM queue fixture");
        tracks.append(track);
        nativeKeys.insert(track.key());
      }
      if (tracks.size() != 200 || nativeKeys.size() != 200)
        qFatal("Capsule fixture must provide 200 distinct native queue keys");
      host.playback.setVolume(37);
      host.playback.playTracks(tracks, 100, "Authored queue", "queue:album:12");
      host.playback.pause();
      if (host.playback.queue()->rowCount() != 200 ||
          host.playback.queue()->currentIndex() != 100)
        qFatal("Capsule fixture lost its real 200-row/current-100 queue");
      // Match opening a lyrics page after selecting a real native queue. The
      // mainline SDK projection binds the current model at scope construction;
      // this fixture does not add active-queue rebinding to that public API.
      owner.setProperty("active", true);
      scope = activation->createPresentation(&owner, "lyricsPage");
      page = std::make_unique<EchoMusic::EchoPluginViewContext>(
          *scope, "lyricsPage", &owner);
      qInfo() << "CAPSULE_QUEUE_FACT nativeCount"
              << host.playback.queue()->rowCount() << "nativeCurrent"
              << host.playback.queue()->currentIndex() << "projectedCount"
              << page->player()->queue()->rowCount() << "projectedRow100"
              << page->player()->queue()->row(100);
      if (page->player()->queue()->rowCount() != 200 ||
          !page->player()->queue()->row(100).value("isCurrent").toBool())
        qFatal("Capsule page must project the real 200-row/current-100 queue");
      state.insert("active", true);
      state.insert("page", QVariant::fromValue(page.get()));
      state.insert("playback", QVariant::fromValue(&host.playback));
      const auto refresh = [this, &state] {
        state.insert("persistedVolume",
                     host.settings.value("playback/volume").toDouble());
      };
      QObject::connect(&host.playback, &EchoMusic::PlaybackService::changed,
                       &state, refresh);
      QObject::connect(&host.playback,
                       &EchoMusic::PlaybackService::positionChanged, &state,
                       refresh);
      refresh();
    }
  };
  std::unique_ptr<QQmlPropertyMap> stateStorage{QQmlPropertyMap::create()};
  QQmlPropertyMap &state = *stateStorage;
  std::unique_ptr<Active> active;

public:
  FoliaCapsuleFixture() {
    state.insert("enabled", false);
    state.insert("active", true);
    state.insert("page", QVariant());
    state.insert("playback", QVariant());
    state.insert("persistedVolume", 0.);
    state.insert("refresh", 0);
    QObject::connect(
        &state, &QQmlPropertyMap::valueChanged, &state,
        [this](const QString &key, const QVariant &value) {
          if (key == "enabled") {
            if (value.toBool() && !active)
              active = std::make_unique<Active>(state);
            else if (!value.toBool()) {
              state.insert("page", QVariant());
              state.insert("playback", QVariant());
              active.reset();
            }
          } else if (key == "refresh" && active)
            state.insert(
                "persistedVolume",
                active->host.settings.value("playback/volume").toDouble());
          else if (key == "active" && active)
            active->owner.setProperty("active", value.toBool());
        });
  }
  QQmlPropertyMap *object() { return &state; }
};
