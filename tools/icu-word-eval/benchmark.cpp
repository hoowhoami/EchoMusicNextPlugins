// Isolated ICU word-break probe; no player, audio output or application state.
#include <QCoreApplication>
#include <QCryptographicHash>
#include <QElapsedTimer>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QTextStream>
#include <QVariant>
#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <sys/resource.h>
#ifdef __APPLE__
#include <mach/mach.h>
#endif
#ifdef WORD_EVAL_ICU
#include <unicode/ubrk.h>
#include <unicode/uloc.h>
#include <unicode/udata.h>
#endif

static QJsonObject memory()
{
    rusage usage{};
    getrusage(RUSAGE_SELF, &usage);
    QJsonObject result{{"peak_rss_bytes", double(usage.ru_maxrss)},
                       {"cpu_ms", (usage.ru_utime.tv_sec + usage.ru_stime.tv_sec) * 1000.0 +
                                      (usage.ru_utime.tv_usec + usage.ru_stime.tv_usec) / 1000.0}};
#ifdef __APPLE__
    task_vm_info_data_t info{};
    mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
    if (task_info(mach_task_self(), TASK_VM_INFO, reinterpret_cast<task_info_t>(&info), &count) !=
        KERN_SUCCESS)
        qFatal("task_info failed");
    result.insert("rss_bytes", double(info.resident_size));
    result.insert("physical_footprint_bytes", double(info.phys_footprint));
#endif
    return result;
}

#ifdef WORD_EVAL_ICU
static QByteArray localeId(const QString &tag)
{
    if (tag.isEmpty())
        return {};
    UErrorCode error = U_ZERO_ERROR;
    int32_t parsed = 0;
    const QByteArray bytes = tag.toLatin1();
    const auto required = uloc_forLanguageTag(bytes.constData(), nullptr, 0, &parsed, &error);
    if ((U_FAILURE(error) && error != U_BUFFER_OVERFLOW_ERROR) || parsed != bytes.size())
        qFatal("Invalid language tag");
    QByteArray output(required + 1, '\0');
    error = U_ZERO_ERROR;
    const auto written =
        uloc_forLanguageTag(bytes.constData(), output.data(), output.size(), &parsed, &error);
    if (U_FAILURE(error) || written != required)
        qFatal("Locale conversion failed");
    output.resize(written);
    return output;
}

// Match EchoPluginText's UTF-16 slices and QVariant materialization. This does
// not include QtConcurrent dispatch or SDK/JS serialization overhead.
static QVariantList segment(const QStringList &texts, const QString &tag,
                            bool includeStatus = false)
{
    const auto locale = localeId(tag);
    UErrorCode status = U_ZERO_ERROR;
    auto *breaker =
        ubrk_open(UBRK_WORD, tag.isEmpty() ? nullptr : locale.constData(), nullptr, 0, &status);
    if (U_FAILURE(status) || !breaker)
        qFatal("Cannot initialize word breaker: %s", u_errorName(status));
    QVariantList lines;
    for (const auto &text : texts) {
        status = U_ZERO_ERROR;
        ubrk_setText(breaker, reinterpret_cast<const UChar *>(text.utf16()), text.size(), &status);
        if (U_FAILURE(status))
            qFatal("Cannot segment input: %s", u_errorName(status));
        QVariantList words;
        int32_t start = ubrk_first(breaker);
        for (int32_t end = ubrk_next(breaker); end != UBRK_DONE;
             start = end, end = ubrk_next(breaker)) {
            QVariantMap word{{"segment", text.mid(start, end - start)},
                             {"index", start},
                             {"isWordLike", ubrk_getRuleStatus(breaker) >= UBRK_WORD_NONE_LIMIT}};
            if (includeStatus)
                word.insert("status", ubrk_getRuleStatus(breaker));
            words.append(word);
        }
        lines.append(QVariant(words));
    }
    ubrk_close(breaker);
    return lines;
}
#endif

int main(int argc, char **argv)
{
    QElapsedTimer total;
    total.start();
    QCoreApplication app(argc, argv);
    if (argc < 3)
        qFatal("Expected corpus.json and verify|run|control");
    QFile input(QString::fromLocal8Bit(argv[1]));
    if (!input.open(QIODevice::ReadOnly))
        qFatal("Cannot open corpus");
    QJsonParseError error{};
    const auto corpus = QJsonDocument::fromJson(input.readAll(), &error).object();
    if (error.error != QJsonParseError::NoError)
        qFatal("Invalid corpus JSON");
    QStringList texts;
    for (const auto value : corpus["texts"].toArray())
        texts.append(value.toString());
    const QString mode = QString::fromLatin1(argv[2]);
    QJsonObject result{{"before", memory()}};
    const double readyMs = total.nsecsElapsed() / 1e6;
#ifdef WORD_EVAL_ICU
    if (mode == "verify") {
        UErrorCode fileStatus = U_ZERO_ERROR;
        udata_setFileAccess(UDATA_NO_FILES, &fileStatus);
        if (U_FAILURE(fileStatus))
            qFatal("Cannot isolate static ICU data");
        result.insert("static_data_only", true);
        QJsonArray results;
        qsizetype lines = 0, boundaries = 0;
        for (const auto locale : corpus["locales"].toArray()) {
            QCryptographicHash digest(QCryptographicHash::Sha256);
            for (const auto &text : texts) {
                const auto parts = segment({text}, locale.toString(), true);
                const auto words = parts.first().toList();
                QString joined;
                int cursor = 0;
                for (const auto &part : words) {
                    const auto word = part.toMap();
                    if (word["index"].toInt() != cursor)
                        qFatal("Noncontiguous UTF-16 offsets");
                    const auto token = word["segment"].toString();
                    cursor += token.size();
                    joined += token;
                    ++boundaries;
                }
                if (joined != text)
                    qFatal("Segmentation lost text");
                digest.addData(QJsonDocument::fromVariant(parts).toJson(QJsonDocument::Compact));
                digest.addData("\n");
                ++lines;
            }
            results.append(QJsonObject{{"locale", locale},
                                       {"sha256", QString::fromLatin1(digest.result().toHex())}});
        }
        result.insert("locales", results);
        result.insert("line_locale_cases", double(lines));
        result.insert("boundaries", double(boundaries));
    } else if (mode == "run") {
        QElapsedTimer timer;
        timer.start();
        {
            const auto first = segment({texts.first()}, "");
            Q_UNUSED(first);
        }
        result.insert("first_call_ms", timer.nsecsElapsed() / 1e6);
        result.insert("after_first", memory());
        QStringList mixed;
        for (int i = 0; i < 64; ++i)
            mixed.append(texts[i % texts.size()]);
        timer.restart();
        {
            const auto first = segment(mixed, "");
            Q_UNUSED(first);
        }
        result.insert("first_mixed64_ms", timer.nsecsElapsed() / 1e6);
        result.insert("after_dictionaries", memory());
        QJsonObject workloads;
        const QString fill = texts.join(" ");
        for (const int count : {1, 16, 64, -64}) {
            QStringList batch;
            if (count > 0) {
                for (int i = 0; i < count; ++i)
                    batch.append(texts[i % texts.size()]);
            } else {
                QString line;
                while (line.size() < 1024)
                    line += fill;
                for (int i = 0; i < 64; ++i)
                    batch.append(line.left(1024));
            }
            const int repeats = count > 0 ? 200 : 24;
            QList<double> durations;
            double tokens = 0;
            for (int i = 0; i < repeats; ++i) {
                timer.restart();
                {
                    const auto words = segment(batch, "");
                    for (const auto &line : words)
                        tokens += line.toList().size();
                }
                durations.append(timer.nsecsElapsed() / 1e6);
            }
            std::sort(durations.begin(), durations.end());
            qsizetype units = 0;
            for (const auto &line : batch)
                units += line.size();
            workloads.insert(count > 0 ? QString("mixed_%1").arg(count) : "limit_64",
                             QJsonObject{{"lines", batch.size()},
                                         {"utf16_units", double(units)},
                                         {"repeats", repeats},
                                         {"tokens", tokens / repeats},
                                         {"median_ms", durations[durations.size() / 2]},
                                         {"p95_ms", durations[int(durations.size() * .95)]}});
        }
        result.insert("workloads", workloads);
        QJsonArray cycles;
        QString stressLine;
        while (stressLine.size() < 1024)
            stressLine += fill;
        QStringList stressBatch;
        for (int i = 0; i < 64; ++i)
            stressBatch.append(stressLine.left(1024));
        for (int cycle = 0; cycle < 8; ++cycle) {
            {
                const auto parts = segment(stressBatch, "");
                Q_UNUSED(parts);
            }
            cycles.append(memory());
        }
        result.insert("stress_cycles", cycles);
        result.insert("after_stress", memory());
    }
#else
    Q_UNUSED(mode);
#endif
    result.insert("ready_ms", readyMs);
    result.insert("total_ms", total.nsecsElapsed() / 1e6);
    result.insert("final", memory());
    QTextStream(stdout) << QJsonDocument(result).toJson(QJsonDocument::Compact) << '\n';
}
