// Real host QML modules and ThemeStore, with isolated test preferences.
#include "GlyphRunCanvas_p.h"
#include "PluginRuntimeTestFixture.h"
#include "SettingsStore.h"
#include "ThemeStore.h"
#include "capsule-fixture.h"
#include "folia-handoff-fixture.h"
#include <QApplication>
#include <QDirIterator>
#include <QFileDialog>
#include <QImage>
#include <QLineEdit>
#include <QQmlContext>
#include <QQmlEngine>
#include <QTemporaryDir>
#include <QtQml/qqmlextensionplugin.h>
#include <QtQuickTest/quicktest.h>
#include <memory>
#ifdef Q_OS_MACOS
#include <mach/mach.h>
#endif
Q_IMPORT_QML_PLUGIN(EchoMusic_ThemesPlugin)

// Available even when a dedicated playback fixture owns the sole audio runtime.
class FoliaNativeProbe : public QObject {
  Q_OBJECT
  QElapsedTimer monotonic;

public:
  FoliaNativeProbe() { monotonic.start(); }
  Q_INVOKABLE qint64 monotonicMs() const { return monotonic.elapsed(); }
  Q_INVOKABLE QVariantMap memory() const {
    QVariantMap result{
        {"nativeGlyphBytes",
         qulonglong(EchoMusic::GlyphCanvas::Memory::total())},
        {"nativeGlyphPeak",
         qulonglong(EchoMusic::GlyphCanvas::Memory::highWater())}};
#ifdef Q_OS_MACOS
    task_vm_info_data_t info{};
    mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
    if (task_info(mach_task_self(), TASK_VM_INFO,
                  reinterpret_cast<task_info_t>(&info),
                  &count) == KERN_SUCCESS) {
      result.insert("residentBytes", qulonglong(info.resident_size));
      result.insert("footprintBytes", qulonglong(info.phys_footprint));
    }
#endif
    return result;
  }
};

// Test data enters the actual parser model and its public read-only SDK
// projection.
class FoliaLyricFixture : public QObject {
  Q_OBJECT
  Q_PROPERTY(int count READ count NOTIFY changed)
  Host &host;

public:
  explicit FoliaLyricFixture(Host &value) : host(value) {
    connect(host.playback.lyrics(), &QAbstractItemModel::modelReset, this,
            &FoliaLyricFixture::changed);
  }
  int count() const { return host.playback.lyrics()->rowCount(); }
  Q_INVOKABLE bool replaceRows(const QVariantList &rows) {
    return host.playback.lyrics()->replace(
        {{"lines", QJsonArray::fromVariantList(rows)}, {"offset_ms", 0}});
  }
signals:
  void changed();
};

// Only test code can pick these authored files. Production QML still goes
// through the public asynchronous picker and the actual isolated decoder
// process.
class FoliaAssetFixture : public QObject {
  Q_OBJECT
  Host &host;
  QString png, gif, font, svg, archive;
  QStringList pngBatch;
  QElapsedTimer monotonic;

public:
  explicit FoliaAssetFixture(Host &value) : host(value) {
    monotonic.start();
    png = host.temporary.filePath("authored-red.png");
    QImage image(16, 16, QImage::Format_RGBA8888);
    image.fill(Qt::red);
    if (!image.save(png))
      qFatal("Cannot create authored PNG fixture");
    for (int i = 0; i < 16; ++i) {
      const auto path = host.temporary.filePath(QString("pool-%1.png").arg(i));
      image.fill(QColor::fromHsv(i * 22, 255, 255));
      if (!image.save(path))
        qFatal("Cannot create authored image pool fixture");
      pngBatch.append(path);
    }
    svg = host.temporary.filePath("authored-gradient.svg");
    write(svg,
          QByteArray(
              "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='8'>"
              "<style>.paint{fill:url(#g)}</style><defs><linearGradient id='g'>"
              "<stop stop-color='#20a040'/><stop offset='1' "
              "stop-color='#208040'/>"
              "</linearGradient></defs><rect width='16' height='8' "
              "class='paint'/></svg>"));
    archive = host.temporary.filePath("authored-image-pool.zip");
    gif = host.temporary.filePath("authored-red-blue.gif");
    write(gif, QByteArray::fromHex(
                   "47494638396101000100800000ff00000000ff"
                   "21ff0b4e45545343415045322e300301000000"
                   "21f904000a0000002c0000000001000100000202440100"
                   "21f90400140000002c00000000010001000002024c01003b"));
    const QStringList candidates{
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf"};
    for (const auto &candidate : candidates)
      if (QFileInfo::exists(candidate)) {
        font = candidate;
        break;
      }
  }
  QFileDialog *picker() const {
    for (auto *widget : QApplication::topLevelWidgets())
      if (auto *dialog = qobject_cast<QFileDialog *>(widget);
          dialog && dialog->isVisible())
        return dialog;
    return nullptr;
  }
  Q_INVOKABLE bool pickerVisible() const { return picker(); }
  Q_INVOKABLE qint64 monotonicMs() const { return monotonic.elapsed(); }
  Q_INVOKABLE bool legacyProbe() const {
    return qEnvironmentVariable("FOLIA_GIF_MODE") == "legacy";
  }
  Q_INVOKABLE QVariantMap memory() const {
    // Test-only native allocation ledger; driver/Qt process memory is reported
    // separately below and is not covered by this bounded software ledger.
    QVariantMap result{
        {"nativeGlyphBytes",
         qulonglong(EchoMusic::GlyphCanvas::Memory::total())},
        {"nativeGlyphPeak",
         qulonglong(EchoMusic::GlyphCanvas::Memory::highWater())}};
#ifdef Q_OS_MACOS
    task_vm_info_data_t info{};
    mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
    if (task_info(mach_task_self(), TASK_VM_INFO,
                  reinterpret_cast<task_info_t>(&info),
                  &count) == KERN_SUCCESS) {
      result.insert("residentBytes", qulonglong(info.resident_size));
      result.insert("footprintBytes", qulonglong(info.phys_footprint));
    }
#endif
    return result;
  }
  Q_INVOKABLE bool accept(const QString &kind) {
    auto *dialog = picker();
    if (dialog && kind == "png-batch") {
      auto *entry = dialog->findChild<QLineEdit *>("fileNameEdit");
      if (!entry)
        return false;
      entry->setText('"' + pngBatch.join("\" \"") + '"');
      return QMetaObject::invokeMethod(dialog, "accept", Qt::DirectConnection);
    }
    const auto file = kind == "svg"       ? svg
                      : kind == "archive" ? archive
                      : kind == "png"     ? png
                      : kind == "gif"     ? gif
                      : kind == "font"    ? font
                      : kind == "large-gif"
                          ? qEnvironmentVariable("FOLIA_TEST_LARGE_GIF")
                          : QString{};
    if (!dialog || file.isEmpty())
      return false;
    // selectFile() can change directories asynchronously. An immediate accept
    // then navigates rather than finishing the first picker, although invoke
    // itself reports success. Enter the actual absolute file in the same real
    // widget as the existing multi-file path and require the picker to close.
    auto *entry = dialog->findChild<QLineEdit *>("fileNameEdit");
    if (!entry)
      return false;
    entry->setText('"' + file + '"');
    const QPointer<QFileDialog> guard(dialog);
    return QMetaObject::invokeMethod(dialog, "accept", Qt::DirectConnection) &&
           (!guard || !guard->isVisible());
  }
};

class FoliaQmlSetup : public QObject {
  Q_OBJECT
  std::unique_ptr<QTemporaryDir> directory;
  std::unique_ptr<EchoMusic::SettingsStore> settings;
  std::unique_ptr<EchoMusic::ThemeStore> theme;
  std::unique_ptr<Host> textHost;
  EchoMusic::EchoPluginText *textService = nullptr;
  EchoMusic::EchoPluginReadModel *lyricSource = nullptr;
  EchoMusic::EchoPluginContext *plugin = nullptr;
  std::unique_ptr<FoliaLyricFixture> lyricFixture;
  std::unique_ptr<FoliaAssetFixture> assetFixture;
  FoliaCapsuleFixture capsuleFixture;
  FoliaHandoffFixture handoffFixture;
  FoliaNativeProbe nativeProbe;
public slots:
  void applicationAvailable() {
    directory = std::make_unique<QTemporaryDir>();
    settings = std::make_unique<EchoMusic::SettingsStore>(
        directory->filePath("qml.ini"));
    theme = std::make_unique<EchoMusic::ThemeStore>(*settings);
    // Dedicated real playback suite owns the one native audio runtime itself.
    // Other suites keep their original idle text host and authored parser rows.
    if (qEnvironmentVariableIntValue("FOLIA_HANDOFF_ONLY") == 1 ||
        qEnvironmentVariableIntValue("FOLIA_CAPSULE_ONLY") == 1)
      return;
    textHost = std::make_unique<Host>();
    const auto testPackage = package(
        textHost->temporary.path(), "export function activate(ctx) {}\n",
        {"lifecycle", "graphics.rhi"}, {"graphics"});
    // Original preview covers must pass the real package-image permission
    // check. Copy them before import; never whitelist the repository's external
    // paths.
    QDir().mkpath(testPackage + "/preview");
    const QDir sourceFiles(
        QFileInfo(QString::fromUtf8(__FILE__)).absolutePath());
    for (const auto &name : {"sample-light.svg", "sample-rhythm.svg"}) {
      const auto source = sourceFiles.absoluteFilePath(
          QString("../../plugins/folia-lyrics-skin/qml/preview/") + name);
      if (!QFile::copy(source, testPackage + "/preview/" + name))
        qFatal("Cannot copy authored preview cover to actual package fixture");
    }
    // Only baked plugin shaders are imported into the real fixture package.
    // Production resolves pipeline paths against this package, not the QML URL.
    const auto gpuAssetRoot = qEnvironmentVariable("FOLIA_GPU_ASSET_ROOT");
    if (!gpuAssetRoot.isEmpty()) {
      const QDir gpuRoot(gpuAssetRoot);
      QDirIterator files(gpuAssetRoot, {"*.qsb"}, QDir::Files,
                         QDirIterator::Subdirectories);
      while (files.hasNext()) {
        const auto source = files.next();
        const auto destination =
            testPackage + "/" + gpuRoot.relativeFilePath(source);
        QDir().mkpath(QFileInfo(destination).absolutePath());
        if (!QFile::copy(source, destination))
          qFatal("Cannot copy baked plugin shader to actual package fixture");
      }
    }
    textHost->runtime.importDirectory(testPackage);
    QElapsedTimer deadline;
    deadline.start();
    while (deadline.elapsed() < 7000) {
      const auto installation =
          textHost->runtime.installationForId("test.runtime");
      if (!installation.isEmpty() &&
          textHost->runtime.state(installation) == PluginRuntime::Active) {
        plugin = textHost->runtime.context(installation);
        textService = plugin->text();
        lyricSource =
            textHost->runtime.context(installation)->player()->lyrics();
        break;
      }
      QTest::qWait(1);
    }
    if (!textService)
      qFatal("Actual text service fixture activation failed");
    lyricFixture = std::make_unique<FoliaLyricFixture>(*textHost);
    assetFixture = std::make_unique<FoliaAssetFixture>(*textHost);
    QVariantList lines;
    for (int i = 0; i < 80; ++i) {
      const auto text =
          QString::fromUtf8("海边的风吹过长街 The story continues %1 "
                            "👩‍👩‍👧‍👦")
              .arg(i);
      const QVariantMap word{
          {"text", text}, {"start_ms", i * 4000}, {"duration_ms", 4000}};
      lines.append(QVariantMap{{"text", text},
                               {"start_ms", i * 4000},
                               {"duration_ms", 4000},
                               {"words", QVariantList{word}}});
    }
    if (!lyricFixture->replaceRows(lines))
      qFatal("Actual lyric model fixture rejected authored rows");
  }
  void qmlEngineAvailable(QQmlEngine *engine) {
    theme->attachToEngine(*engine);
    engine->rootContext()->setContextProperty("foliaTestHandoffFixture",
                                              handoffFixture.object());
    engine->rootContext()->setContextProperty("foliaTestNativeProbe",
                                              &nativeProbe);
    engine->rootContext()->setContextProperty(
        "foliaTestCaptureDir",
        qEnvironmentVariable("FOLIA_CAPTURE_DIR", "build/folia-native-qml"));
    engine->rootContext()->setContextProperty("foliaTestCapsuleFixture",
                                              capsuleFixture.object());
    if (!textHost)
      return;
    engine->rootContext()->setContextProperty("foliaTestTextService",
                                              textService);
    engine->rootContext()->setContextProperty("foliaTestPlugin", plugin);
    engine->rootContext()->setContextProperty(
        "foliaTestPreviewCovers",
        QVariantList{QUrl::fromLocalFile(plugin->package().root +
                                         "/preview/sample-light.svg"),
                     QUrl::fromLocalFile(plugin->package().root +
                                         "/preview/sample-rhythm.svg")});
    engine->rootContext()->setContextProperty("foliaTestLyricSource",
                                              lyricSource);
    engine->rootContext()->setContextProperty("foliaTestLyricCount",
                                              lyricFixture->count());
    engine->rootContext()->setContextProperty("foliaTestLyricFixture",
                                              lyricFixture.get());
    engine->rootContext()->setContextProperty("foliaTestAssetFixture",
                                              assetFixture.get());
  }
  void cleanupTestCase() {
    // QuickTest destroys its application before the stack setup object.
    // Drain the actual host while its GUI dispatcher is still available.
    textService = nullptr;
    handoffFixture.close();
    plugin = nullptr;
    lyricSource = nullptr;
    lyricFixture.reset();
    assetFixture.reset();
    textHost.reset();
    theme.reset();
    settings.reset();
    directory.reset();
  }
};
int main(int argc, char **argv) {
  QApplication::setAttribute(Qt::AA_DontUseNativeDialogs);
  QApplication application(argc, argv);
  FoliaQmlSetup setup;
  return quick_test_main_with_setup(argc, argv, "folia_native_qml", nullptr,
                                    &setup);
}
#include "folia-qml.moc"
