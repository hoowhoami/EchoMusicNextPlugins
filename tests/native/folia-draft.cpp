#include "AppearanceConfiguration.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QGuiApplication>
#include <QJsonDocument>
#include <QJsonObject>
#include <QQmlComponent>
#include <QQmlContext>
#include <QQmlEngine>
#include <QRegularExpression>
#include <QSignalSpy>
#include <QTemporaryDir>
#include <QtTest>
#include <memory>
#include <utility>

using EchoMusic::AppearanceConfiguration;

namespace {
const QString oldHandle =
    QStringLiteral("asset:11111111111111111111111111111111");
QVariantMap initialValues() {
  return {{"temperaLayerImages",
           QVariantList{QVariantMap{{"id", oldHandle},
                                    {"name", "Original"},
                                    {"align", "free"},
                                    {"verticalAlign", "bottom"},
                                    {"scale", .7},
                                    {"opacity", 1}}}},
          {"temperaLayerImageDepth", "back"},
          {"temperaLayerImageFrequency", .6}};
}
QVariantMap savedValues(const QString &path) {
  QFile file(path);
  if (!file.open(QIODevice::ReadOnly))
    return {};
  return QJsonDocument::fromJson(file.readAll()).object().toVariantMap();
}
} // namespace

// Only asset deletion is substituted. Configuration acceptance, the background
// QSaveFile writer, values publication and scope guard are production objects.
class DraftOperation final : public QObject {
  Q_OBJECT
  Q_PROPERTY(int state READ state CONSTANT)
  Q_PROPERTY(QVariantMap result READ result CONSTANT)
  Q_PROPERTY(QString errorMessage READ errorMessage CONSTANT)
public:
  DraftOperation(QVariantMap result, QObject *parent)
      : QObject(parent), m_result(std::move(result)) {
    QQmlEngine::setObjectOwnership(this, QQmlEngine::CppOwnership);
  }
  int state() const { return 2; }
  QVariantMap result() const { return m_result; }
  QString errorMessage() const { return {}; }
  Q_INVOKABLE void cancel() {}
signals:
  void completed();

private:
  QVariantMap m_result;
};

class DraftAssetService final : public QObject {
  Q_OBJECT
public:
  explicit DraftAssetService(AppearanceConfiguration &configuration)
      : m_configuration(configuration),
        m_assets{QVariantMap{{"handle", oldHandle}, {"name", "Original"}}} {}
  Q_INVOKABLE QObject *list(const QString &collection) {
    if (collection != "tempera.images")
      qFatal("Unexpected draft asset collection");
    ++listCalls;
    return new DraftOperation({{"assets", m_assets}}, this);
  }
  Q_INVOKABLE QObject *remove(const QString &handle) {
    const auto current = m_configuration.values();
    bool retained = false;
    for (const auto &entry : current.value("temperaLayerImages").toList())
      retained |= entry.toMap().value("id").toString() == handle;
    removedWhileUnpublished |= m_configuration.busy() || retained;
    removals.append(handle);
    for (qsizetype i = m_assets.size(); i-- > 0;)
      if (m_assets[i].toMap().value("handle").toString() == handle)
        m_assets.removeAt(i);
    emit removed(handle);
    return new DraftOperation({}, this);
  }
  QStringList removals;
  bool removedWhileUnpublished = false;
  int listCalls = 0;
signals:
  void removed(const QString &handle);

private:
  AppearanceConfiguration &m_configuration;
  QVariantList m_assets;
};

struct DraftFixture {
  QTemporaryDir temporary;
  QString file;
  bool guardActive = true;
  AppearanceConfiguration configuration;
  AppearanceConfiguration scopedConfiguration;
  DraftAssetService assets;
  QQmlEngine engine;
  std::unique_ptr<QObject> wrapper;
  QPointer<QObject> draft;
  QStringList warnings;

  explicit DraftFixture(bool blocked = false, bool destinationDirectory = false)
      : file(temporary.filePath("settings/config.json")),
        configuration(file, initialValues(), {}, nullptr),
        scopedConfiguration(
            configuration, [this] { return guardActive; }, nullptr),
        assets(configuration) {
    if (blocked) {
      QFile obstacle(temporary.filePath("settings"));
      if (!obstacle.open(QIODevice::WriteOnly) ||
          obstacle.write("obstruction") != 11)
        qFatal("Cannot create isolated QSaveFile failure fixture");
    }
    if (destinationDirectory && !QDir().mkpath(file))
      qFatal("Cannot create isolated QSaveFile destination-directory fixture");
    configuration.publish();
    engine.rootContext()->setContextProperty("draftConfiguration",
                                             &scopedConfiguration);
    engine.rootContext()->setContextProperty("draftAssetService", &assets);
    QObject::connect(&engine, &QQmlEngine::warnings, &engine,
                     [this](const QList<QQmlError> &errors) {
                       for (const auto &error : errors)
                         warnings.append(error.toString());
                     });
  }
  ~DraftFixture() {
    wrapper.reset();
    QObject::disconnect(&engine, nullptr, &engine, nullptr);
  }

  bool load() {
    const auto shared = qEnvironmentVariable(
        "FOLIA_DRAFT_SHARED_DIRECTORY",
        QStringLiteral(FOLIA_DRAFT_PLUGIN_ROOT
                       "/plugins/folia-lyrics-skin/qml/shared"));
    const auto import = QUrl::fromLocalFile(shared).toString();
    const auto qml = QStringLiteral(R"QML(
import QtQuick
import "%1" as Shared
Item {
    width: 320
    height: 200
    Shared.LayerImageDraft {
        objectName: "testedDraft"
        service: draftAssetService
        entries: draftConfiguration.values.temperaLayerImages
        depth: draftConfiguration.values.temperaLayerImageDepth
        frequency: draftConfiguration.values.temperaLayerImageFrequency
        commitPatch: patch => draftConfiguration.patch(patch)
        Component.onCompleted: {
            // The pre-fix component predates these inputs. All assertions and
            // the native writer stay identical, so RED measures premature
            // deletion rather than a missing-property error.
            if ("commitBusy" in this) {
                commitBusy = Qt.binding(() => draftConfiguration.busy)
                commitError = Qt.binding(() => draftConfiguration.errorMessage)
                commitActive = Qt.binding(() => draftConfiguration.active)
            }
        }
    }
}
)QML")
                         .arg(import);
    QQmlComponent component(&engine);
    component.setData(qml.toUtf8(),
                      QUrl::fromLocalFile(temporary.filePath("fixture.qml")));
    if (!component.isReady()) {
      warnings.append(component.errorString());
      return false;
    }
    wrapper.reset(component.create());
    if (!wrapper) {
      warnings.append(component.errorString());
      return false;
    }
    draft = wrapper->findChild<QObject *>("testedDraft");
    return draft;
  }
  bool edit() {
    return QMetaObject::invokeMethod(draft, "open", Qt::DirectConnection) &&
           QMetaObject::invokeMethod(draft, "clear", Qt::DirectConnection) &&
           QMetaObject::invokeMethod(
               draft, "setTuning", Qt::DirectConnection,
               Q_ARG(QVariant, QVariant(QVariantMap{{"depth", "front"},
                                                    {"frequency", .25}})));
  }
  bool close(bool &accepted) {
    return QMetaObject::invokeMethod(draft, "close", Qt::DirectConnection,
                                     Q_RETURN_ARG(bool, accepted));
  }
  bool published() const {
    const auto values = configuration.values();
    return values.value("temperaLayerImages").toList().isEmpty() &&
           values.value("temperaLayerImageDepth") == "front" &&
           values.value("temperaLayerImageFrequency").toDouble() == .25;
  }
};

class FoliaDraftTest final : public QObject {
  Q_OBJECT
private slots:
  void init() {
    QTest::failOnWarning(QRegularExpression(
        "invalid context|TypeError|ReferenceError|Binding loop",
        QRegularExpression::CaseInsensitiveOption));
  }

  void acceptedWriteWaitsForRealPublicationBeforeRemovingOriginal() {
    DraftFixture fixture;
    QVERIFY2(fixture.load(), qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.edit());
    QSignalSpy committed(fixture.draft, SIGNAL(committed(QVariant)));
    QSignalSpy published(&fixture.configuration,
                         &AppearanceConfiguration::changed);
    QVERIFY(committed.isValid());
    bool accepted = false;
    QVERIFY(fixture.close(accepted));
    QVERIFY(accepted);
    QVERIFY(fixture.configuration.busy());
    QCOMPARE(published.count(), 0);
    QCOMPARE(committed.count(), 0);
    QVERIFY(fixture.assets.removals.isEmpty());
    QCOMPARE(fixture.configuration.values(), initialValues());
    QTRY_VERIFY_WITH_TIMEOUT(!fixture.configuration.busy(), 5000);
    QTRY_COMPARE_WITH_TIMEOUT(committed.count(), 1, 5000);
    QTRY_COMPARE(fixture.assets.removals, QStringList{oldHandle});
    QVERIFY(fixture.published());
    QCOMPARE(savedValues(fixture.file), fixture.configuration.values());
    QVERIFY(!fixture.assets.removedWhileUnpublished);
    QVERIFY(!fixture.draft->property("opened").toBool());
    QVERIFY2(fixture.warnings.isEmpty(),
             qPrintable(fixture.warnings.join('\n')));
  }

  void nativePersistenceFailureRetainsOriginalAndRetriesAfterRepair_data() {
    QTest::addColumn<bool>("destinationDirectory");
    QTest::newRow("parent-is-file") << false;
    QTest::newRow("qsavefile-open-destination-is-directory") << true;
  }

  void nativePersistenceFailureRetainsOriginalAndRetriesAfterRepair() {
    QFETCH(bool, destinationDirectory);
    DraftFixture fixture(!destinationDirectory, destinationDirectory);
    QVERIFY2(fixture.load(), qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.edit());
    QSignalSpy committed(fixture.draft, SIGNAL(committed(QVariant)));
    bool accepted = false;
    QVERIFY(fixture.close(accepted));
    QVERIFY(accepted);
    QVERIFY(fixture.configuration.busy());
    QVERIFY(fixture.assets.removals.isEmpty());
    QTRY_VERIFY_WITH_TIMEOUT(!fixture.configuration.busy(), 5000);
    QTRY_VERIFY(!fixture.draft->property("busy").toBool());
    QVERIFY(!fixture.configuration.errorMessage().isEmpty());
    QCOMPARE(fixture.configuration.errorMessage(),
             destinationDirectory
                 ? QString("Cannot persist appearance configuration")
                 : QString("Cannot create appearance configuration directory"));
    QVERIFY(!fixture.draft->property("errorString").toString().isEmpty());
    QVERIFY(fixture.draft->property("opened").toBool());
    QCOMPARE(fixture.configuration.values(), initialValues());
    QVERIFY(!QFileInfo(fixture.file).isFile());
    QVERIFY(fixture.assets.removals.isEmpty());
    QCOMPARE(committed.count(), 0);
    if (destinationDirectory)
      QVERIFY(QDir().rmdir(fixture.file));
    else
      QVERIFY(QFile::remove(fixture.temporary.filePath("settings")));
    QVERIFY(QDir().mkpath(fixture.temporary.filePath("settings")));
    accepted = false;
    QVERIFY(fixture.close(accepted));
    QVERIFY(accepted);
    QVERIFY(fixture.configuration.busy());
    QVERIFY(fixture.assets.removals.isEmpty());
    QCOMPARE(committed.count(), 0);
    QTRY_COMPARE_WITH_TIMEOUT(committed.count(), 1, 5000);
    QTRY_COMPARE(fixture.assets.removals, QStringList{oldHandle});
    QVERIFY(fixture.published());
    QCOMPARE(savedValues(fixture.file), fixture.configuration.values());
    QVERIFY(!fixture.assets.removedWhileUnpublished);
    QVERIFY2(fixture.warnings.isEmpty(),
             qPrintable(fixture.warnings.join('\n')));
  }

  void
  pendingWrapperDestructionRetainsOriginalUntilNextPublishedSettingsLoad() {
    DraftFixture fixture;
    QVERIFY2(fixture.load(), qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.edit());
    QSignalSpy committed(fixture.draft, SIGNAL(committed(QVariant)));
    bool accepted = false;
    QVERIFY(fixture.close(accepted));
    QVERIFY(accepted);
    QVERIFY(fixture.configuration.busy());
    fixture.wrapper.reset();
    QVERIFY(fixture.draft.isNull());
    QVERIFY(fixture.assets.removals.isEmpty());
    QCOMPARE(committed.count(), 0);
    QTRY_VERIFY_WITH_TIMEOUT(!fixture.configuration.busy(), 5000);
    QVERIFY(fixture.published());
    QCOMPARE(savedValues(fixture.file), fixture.configuration.values());
    QTest::qWait(40);
    QVERIFY(fixture.assets.removals.isEmpty());
    QCOMPARE(committed.count(), 0);
    QVERIFY2(fixture.warnings.isEmpty(),
             qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.load());
    QTRY_COMPARE(fixture.assets.removals, QStringList{oldHandle});
    QVERIFY(!fixture.assets.removedWhileUnpublished);
    QCOMPARE(savedValues(fixture.file), fixture.configuration.values());
    QVERIFY2(fixture.warnings.isEmpty(),
             qPrintable(fixture.warnings.join('\n')));
  }

  void idleWrapperDestructionCommitsOnceAndDefersOrphanCleanup() {
    DraftFixture fixture;
    QVERIFY2(fixture.load(), qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.edit());
    QSignalSpy writes(&fixture.configuration,
                      &AppearanceConfiguration::busyChanged);
    QSignalSpy published(&fixture.configuration,
                         &AppearanceConfiguration::changed);
    fixture.wrapper.reset();
    QVERIFY(fixture.draft.isNull());
    QVERIFY(fixture.configuration.busy());
    QCOMPARE(writes.count(), 1);
    QCOMPARE(published.count(), 0);
    QVERIFY(fixture.assets.removals.isEmpty());
    QTRY_VERIFY_WITH_TIMEOUT(!fixture.configuration.busy(), 5000);
    QCOMPARE(published.count(), 1);
    QCOMPARE(writes.count(), 2);
    QVERIFY(fixture.published());
    QCOMPARE(savedValues(fixture.file), fixture.configuration.values());
    QTest::qWait(40);
    QVERIFY(fixture.assets.removals.isEmpty());
    QVERIFY2(fixture.warnings.isEmpty(),
             qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.load());
    QTRY_COMPARE(fixture.assets.removals, QStringList{oldHandle});
    QVERIFY(!fixture.assets.removedWhileUnpublished);
  }

  void idleWrapperDestructionCannotBypassRealScopeGuard() {
    DraftFixture fixture;
    QVERIFY2(fixture.load(), qPrintable(fixture.warnings.join('\n')));
    QVERIFY(fixture.edit());
    QSignalSpy writes(&fixture.configuration,
                      &AppearanceConfiguration::busyChanged);
    // The real AppearanceConfiguration proxy rechecks its guard inside
    // patch(), even if QML's previous active binding has not been refreshed.
    fixture.guardActive = false;
    QVERIFY(!fixture.scopedConfiguration.active());
    fixture.wrapper.reset();
    QVERIFY(fixture.draft.isNull());
    QCOMPARE(writes.count(), 0);
    QTest::qWait(40);
    QCOMPARE(fixture.configuration.values(), initialValues());
    QVERIFY(!fixture.configuration.busy());
    QVERIFY(!QFileInfo::exists(fixture.file));
    QVERIFY(fixture.assets.removals.isEmpty());
    QVERIFY2(fixture.warnings.isEmpty(),
             qPrintable(fixture.warnings.join('\n')));
  }
};

QTEST_MAIN(FoliaDraftTest)
#include "folia-draft.moc"
