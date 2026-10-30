#pragma once
#include "EchoPluginViewContext.h"
#include "PluginRuntimeTestFixture.h"
#include "../../services/settings/SettingsKeys.h"
#include <QBuffer>
#include <QDirIterator>
#include <QImage>
#include <QQmlPropertyMap>
#include <algorithm>

// QA-only actual queue/PCM/embedded parser fixture. No replacement player/model/clock.
// Lazily allocated, so unrelated native suites retain their host and timing baseline.
class FoliaHandoffFixture {
  struct Active {
    Host host;
    QObject owner;
    EchoMusic::EchoPluginContext *scope = nullptr;
    std::unique_ptr<EchoMusic::EchoPluginViewContext> page;
    double originalVolume = 0;
    static QByteArray size28(quint32 value) {
      QByteArray bytes;
      for (int shift : {21, 14, 7, 0}) bytes.append(char((value >> shift) & 127));
      return bytes;
    }
    static QByteArray image(const QColor &color) {
      QImage pixels(192, 192, QImage::Format_RGBA8888); pixels.fill(color);
      QByteArray bytes; QBuffer buffer(&bytes); buffer.open(QIODevice::WriteOnly);
      if (!pixels.save(&buffer, "PNG")) qFatal("Cannot encode authored cover");
      return bytes;
    }
    static QByteArray wave(const QByteArray &lyrics, const QByteArray &cover, double frequency) {
      constexpr int rate = 16000, seconds = 40;
      QByteArray samples;
      QDataStream pcm(&samples, QIODevice::WriteOnly); pcm.setByteOrder(QDataStream::LittleEndian);
      for (int i = 0; i < rate * seconds; ++i) {
        double sample = std::sin(i * frequency * 2 * 3.141592653589793 / rate) * 1200;
        pcm << qint16(sample);
      }
      const auto frame = [](const char *name, const QByteArray &value) {
        return QByteArray(name, 4) + size28(value.size()) + QByteArray(2, char(0)) + value;
      };
      QByteArray frames = frame("USLT", QByteArray(1, char(3)) + "eng" + char(0) + lyrics);
      if (!cover.isEmpty()) frames += frame("APIC", QByteArray(1, char(3)) + QByteArray("image/png", 10) + char(3) + char(0) + cover);
      const auto tag = QByteArray("ID3\x04\0\0", 6) + size28(frames.size()) + frames;
      QByteArray body("WAVE"); QDataStream stream(&body, QIODevice::Append);
      stream.setByteOrder(QDataStream::LittleEndian);
      const auto chunk = [&](const char *name, const QByteArray &bytes) {
        stream.writeRawData(name, 4); stream << quint32(bytes.size());
        stream.writeRawData(bytes.data(), bytes.size()); if (bytes.size() % 2) stream << quint8(0);
      };
      QByteArray format; QDataStream fmt(&format, QIODevice::WriteOnly); fmt.setByteOrder(QDataStream::LittleEndian);
      fmt << quint16(1) << quint16(1) << quint32(rate) << quint32(rate * 2) << quint16(2) << quint16(16);
      chunk("fmt ", format); chunk("id3 ", tag); chunk("data", samples);
      QByteArray result("RIFF"); QDataStream header(&result, QIODevice::Append);
      header.setByteOrder(QDataStream::LittleEndian); header << quint32(body.size()); result += body; return result;
    }
    EchoMusic::PlaybackTrack track(const QString &label, const QColor &color, const QByteArray &embeddedCover, double frequency) {
      EchoMusic::PlaybackTrack track; track.id = label; track.title = label;
      track.artist = "Authored native handoff"; track.album = "Actual A/B presentation";
      track.durationMs = 40000; track.localPath = host.temporary.filePath(label + ".wav");
      const auto cover = host.temporary.filePath(label + ".png"); write(cover, image(color));
      track.cover = QUrl::fromLocalFile(cover).toString();
      QByteArray lyrics;
      for (int i = 0; i < 80; ++i)
        lyrics += QString("[00:%1.%2]%3 海边的风 office %4\n")
          .arg(i / 2, 2, 10, QLatin1Char('0')).arg(i % 2 ? 50 : 0, 2, 10, QLatin1Char('0'))
          .arg(label).arg(i).toUtf8();
      if (qEnvironmentVariableIntValue("FOLIA_HANDOFF_TTML") == 1) {
        lyrics = "<tt xmlns='http://www.w3.org/ns/ttml' xmlns:ttm='http://www.w3.org/ns/ttml#metadata'><body><div>";
        for (int i = 0; i < 80; ++i) {
          const auto begin = QString::number(i * .5, 'f', 3), end = QString::number((i + 1) * .5, 'f', 3);
          // TTML media-profile children use offsets relative to their paragraph.
          lyrics += QString("<p begin='%1s' end='%2s'><span begin='0s' dur='0.5s'>%3 海边的风 office %4</span><span ttm:role='x-bg'><span begin='0s' dur='0.5s'>%3 harmony 和声 %4</span></span></p>")
            .arg(begin, end, label).arg(i).toUtf8();
        }
        lyrics += "</div></body></tt>";
      }
      write(track.localPath, wave(lyrics, embeddedCover, frequency));
      host.settings.setValue(EchoMusic::SettingsKeys::Lyrics::SourcesPrefix +
        QString::fromLatin1(QCryptographicHash::hash(track.stableKey().toUtf8(), QCryptographicHash::Sha256).toHex()), "embedded");
      return track;
    }
    explicit Active(QQmlPropertyMap &state) {
      originalVolume = host.playback.volume(); host.playback.setVolume(0);
      host.shell.attachPlayback(host.playback);
      const auto testPackage = package(host.temporary.path(), "export function activate(ctx) {}\n",
                                       {"lifecycle", "graphics.rhi"}, {"graphics"});
      // RHI shader paths are package-relative; use the same actual baker output
      // as the QML under test, including in this separately owned audio process.
      const auto assetRoot = qEnvironmentVariable("FOLIA_GPU_ASSET_ROOT");
      if (!assetRoot.isEmpty()) {
        const QDir sourceRoot(assetRoot);
        QDirIterator shaders(assetRoot, {"*.qsb"}, QDir::Files, QDirIterator::Subdirectories);
        while (shaders.hasNext()) {
          const auto source = shaders.next();
          const auto destination = testPackage + '/' + sourceRoot.relativeFilePath(source);
          QDir().mkpath(QFileInfo(destination).absolutePath());
          if (!QFile::copy(source, destination)) qFatal("Cannot copy handoff fixture shader");
        }
      }
      host.runtime.importDirectory(testPackage);
      QElapsedTimer deadline; deadline.start();
      while (deadline.elapsed() < 7000) {
        const auto installation = host.runtime.installationForId("test.runtime");
        if (!installation.isEmpty() && host.runtime.state(installation) == PluginRuntime::Active) {
          owner.setProperty("active", true);
          scope = host.runtime.context(installation)->createPresentation(&owner, "lyricsPage");
          page = std::make_unique<EchoMusic::EchoPluginViewContext>(*scope, "lyricsPage", &owner);
          break;
        }
        QTest::qWait(1);
      }
      if (!page) qFatal("Actual handoff presentation did not activate");
      const auto a = track("Outgoing-A", QColor("#b83753"), {}, 220);
      auto b = track("Incoming-B", QColor("#30ad68"), image(QColor("#3264d8")), 330);
      // PlaybackService adopts embedded artwork only when the catalog cover is empty.
      b.cover.clear();
      state.insert("originalBcover", QUrl(b.cover));
      state.insert("plugin", QVariant::fromValue(scope)); state.insert("page", QVariant::fromValue(page.get()));
      const auto refresh = [this, &state] {
        state.insert("errorMessage", host.playback.errorMessage());
        state.insert("engineError", host.playback.engineInitializationError());
        state.insert("lyricState", host.playback.lyricState());
        state.insert("observed", QString("title=%1 playing=%2 loading=%3 position=%4 rows=%5 lyric=%6 lyricError=%7")
          .arg(host.playback.title()).arg(host.playback.playing()).arg(host.playback.loading())
          .arg(host.playback.positionMs()).arg(host.playback.lyrics()->rowCount())
          .arg(host.playback.lyricState(), host.playback.lyricSource()->errorMessage()));
      };
      QObject::connect(&host.playback, &EchoMusic::PlaybackService::changed, &state, refresh);
      QObject::connect(&host.playback, &EchoMusic::PlaybackService::engineInitializationChanged, &state, refresh);
      QObject::connect(host.playback.lyrics(), &EchoMusic::LyricModel::changed, &state, refresh);
      host.playback.transition()->setMode("fade"); host.playback.transition()->setFadeSeconds(2);
      host.playback.playTracks({a, b}, 0, "Actual authored handoff", "handoff-native-queue");
      refresh();
    }
    ~Active() {
      owner.setProperty("active", false);
      host.playback.stop(); host.playback.setVolume(originalVolume);
    }
  };
  std::unique_ptr<QQmlPropertyMap> storage{QQmlPropertyMap::create()};
  QQmlPropertyMap &state = *storage;
  std::unique_ptr<Active> active;
public:
  FoliaHandoffFixture() {
    state.insert("available", qEnvironmentVariableIntValue("FOLIA_HANDOFF_ONLY") == 1);
    state.insert("enabled", false); state.insert("plugin", QVariant()); state.insert("page", QVariant());
    state.insert("presented", true);
    state.insert("originalBcover", QUrl()); state.insert("errorMessage", QString());
    state.insert("engineError", QString()); state.insert("lyricState", QString());
    state.insert("observed", QString());
    QObject::connect(&state, &QQmlPropertyMap::valueChanged, &state, [this](const QString &key, const QVariant &value) {
      if (key == "presented") {
        if (active) active->owner.setProperty("active", value.toBool());
        return;
      }
      if (key != "enabled") return;
      if (value.toBool() && !active) {
        state.insert("presented", true);
        active = std::make_unique<Active>(state);
      }
      else if (!value.toBool()) close();
    });
  }
  void close() {
    state.insert("page", QVariant()); state.insert("plugin", QVariant()); active.reset();
  }
  QQmlPropertyMap *object() { return &state; }
};
