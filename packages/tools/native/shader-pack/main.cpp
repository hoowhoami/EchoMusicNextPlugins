// Version-pinned build tool. QShader owns serialization and native binding maps.
#include <QtGui/rhi/qshader.h>
#include <QCoreApplication>
#include <QCryptographicHash>
#include <QDataStream>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSaveFile>
#include <algorithm>
#include <stdexcept>
#include <tuple>

static QByteArray read(const QString &path)
{
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly) || file.size() > 16 * 1024 * 1024)
        throw std::runtime_error("Cannot read bounded shader input");
    return file.readAll();
}
static void write(const QString &path, const QByteArray &bytes)
{
    QSaveFile file(path);
    if (!file.open(QIODevice::WriteOnly) || file.write(bytes) != bytes.size() || !file.commit())
        throw std::runtime_error("Cannot save shader output");
}
static QShader load(const QString &path)
{
    auto shader = QShader::fromSerialized(read(path));
    if (!shader.isValid())
        throw std::runtime_error("Invalid QSB input");
    return shader;
}
static QString name(QShader::Source source)
{
    switch (source) {
    case QShader::SpirvShader:
        return "spirv";
    case QShader::GlslShader:
        return "glsl";
    case QShader::HlslShader:
        return "hlsl";
    case QShader::MslShader:
        return "msl";
    case QShader::DxbcShader:
        return "dxbc";
    case QShader::DxilShader:
        return "dxil";
    case QShader::MetalLibShader:
        return "metallib";
    default:
        throw std::runtime_error("Unsupported shader backend");
    }
}
static bool native(QShader::Source source)
{
    return source == QShader::DxbcShader || source == QShader::DxilShader ||
           source == QShader::MetalLibShader;
}
static auto orderedKeys(const QShader &shader)
{
    auto keys = shader.availableShaders();
    std::sort(keys.begin(), keys.end(), [](const auto &a, const auto &b) {
        const auto tuple = [](const auto &k) {
            return std::tuple{int(k.source()), k.sourceVersion().version(),
                              int(k.sourceVersion().flags()), int(k.sourceVariant())};
        };
        return tuple(a) < tuple(b);
    });
    return keys;
}
static QString digest(const QByteArray &bytes)
{
    return QString::fromLatin1(QCryptographicHash::hash(bytes, QCryptographicHash::Sha256).toHex());
}
static QString fingerprint(const QShader &shader)
{
    QByteArray data;
    QDataStream stream(&data, QIODevice::WriteOnly);
    stream << int(shader.stage()) << shader.description().toJson();
    for (const auto &key : orderedKeys(shader)) {
        if (native(key.source()))
            continue;
        const auto code = shader.shader(key);
        stream << int(key.source()) << key.sourceVersion().version()
               << int(key.sourceVersion().flags()) << int(key.sourceVariant()) << code.entryPoint()
               << code.shader();
    }
    return digest(data);
}
static void copy(QShader &target, const QShaderKey &key, const QShader &source,
                 const QShaderKey &original, const QShaderCode &code)
{
    target.setShader(key, code);
    target.setResourceBindingMap(key, source.nativeResourceBindingMap(original));
    target.setSeparateToCombinedImageSamplerMappingList(
        key, source.separateToCombinedImageSamplerMappingList(original));
    target.setNativeShaderInfo(key, source.nativeShaderInfo(original));
}
static QShaderKey keyFrom(const QJsonObject &value)
{
    const auto source = value["source"].toString();
    QShader::Source type;
    if (source == "hlsl")
        type = QShader::HlslShader;
    else if (source == "msl")
        type = QShader::MslShader;
    else if (source == "spirv")
        type = QShader::SpirvShader;
    else
        throw std::runtime_error("Invalid input shader key");
    return {type,
            QShaderVersion(value["version"].toInt(), QShaderVersion::Flags(value["flags"].toInt())),
            QShader::Variant(value["variant"].toInt())};
}
int main(int argc, char **argv)
{
    QCoreApplication app(argc, argv);
    try {
        const auto args = app.arguments();
        if (QString::fromLatin1(qVersion()) != "6.12.0" || args.size() < 3)
            throw std::runtime_error("Requires Qt6.12.0 and inspect/extract/add/merge arguments");
        auto shader = load(args[2]);
        if (args[1] == "inspect" && args.size() == 3) {
            QJsonArray keys;
            for (const auto &key : orderedKeys(shader)) {
                const auto code = shader.shader(key);
                keys.append(QJsonObject{{"source", name(key.source())},
                                        {"version", key.sourceVersion().version()},
                                        {"flags", int(key.sourceVersion().flags())},
                                        {"variant", int(key.sourceVariant())},
                                        {"entryPoint", QString::fromUtf8(code.entryPoint())},
                                        {"sha256", digest(code.shader())}});
            }
            const QJsonObject result{{"qtVersion", QString::fromLatin1(qVersion())},
                                     {"fingerprint", fingerprint(shader)},
                                     {"stage", int(shader.stage())},
                                     {"shaders", keys}};
            const auto bytes = QJsonDocument(result).toJson(QJsonDocument::Compact);
            fwrite(bytes.constData(), 1, size_t(bytes.size()), stdout);
            return 0;
        }
        if (args[1] == "extract" && args.size() == 5) {
            const auto key = keyFrom(QJsonDocument::fromJson(args[3].toUtf8()).object());
            if (!shader.availableShaders().contains(key))
                throw std::runtime_error("Missing shader key");
            write(args[4], shader.shader(key).shader());
            return 0;
        }
        if (args[1] == "add" && args.size() == 5) {
            const auto doc = QJsonDocument::fromJson(read(args[3]));
            if (!doc.isArray() || doc.array().size() > 32)
                throw std::runtime_error("Invalid native additions");
            for (const auto &entry : doc.array()) {
                const auto value = entry.toObject();
                const auto original = keyFrom(value);
                if (!shader.availableShaders().contains(original))
                    throw std::runtime_error("Missing original shader key");
                auto key = original;
                const auto backend = value["backend"].toString();
                const auto data = read(value["file"].toString());
                if (backend == "dxbc" && original.source() == QShader::HlslShader &&
                    data.startsWith("DXBC"))
                    key.setSource(QShader::DxbcShader);
                else if (backend == "metallib" && original.source() == QShader::MslShader &&
                         data.startsWith("MTLB"))
                    key.setSource(QShader::MetalLibShader);
                else
                    throw std::runtime_error(
                        "Native data/header does not match its source backend");
                const auto code = QShaderCode(data, shader.shader(original).entryPoint());
                // Retain the text variant too. Metal entry points are often main0.
                copy(shader, key, shader, original, code);
            }
            write(args[4], shader.serialized());
            return 0;
        }
        if (args[1] == "merge" && args.size() >= 5) {
            const auto expected = fingerprint(shader);
            for (int i = 3; i < args.size() - 1; ++i) {
                const auto other = load(args[i]);
                if (fingerprint(other) != expected)
                    throw std::runtime_error(
                        "Native pack has different portable shader code/reflection");
                for (const auto &key : orderedKeys(other))
                    if (native(key.source()))
                        copy(shader, key, other, key, other.shader(key));
            }
            write(args.last(), shader.serialized());
            return 0;
        }
        throw std::runtime_error("Invalid shader-pack command arguments");
    } catch (const std::exception &error) {
        fprintf(stderr, "%s\n", error.what());
        return 1;
    }
}
