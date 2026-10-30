import QtQuick
import QtTest
import "../../plugins/folia-lyrics-skin/qml/shared" as Shared

TestCase {
    id: test
    name: "FoliaLayerImageDraft"
    property var subject: null
    property var service: null
    property int commits: 0
    property bool acceptCommit: true
    Component {
        id: operationComponent
        QtObject {
            property int state: 1
            property var result: ({})
            property string errorMessage: ""
            signal completed
            function cancel() {
                state = 4;
                completed();
            }
            function succeed(value) {
                result = value;
                state = 2;
                completed();
            }
            function fail(message) {
                errorMessage = message;
                state = 3;
                completed();
            }
        }
    }
    Component {
        id: serviceComponent
        QtObject {
            id: fake
            property var operations: []
            property var calls: []
            property var lease: null
            property var lastImportOptions: null
            function operation(action, value) {
                calls = calls.concat([
                    {
                        action: action,
                        value: value
                    }
                ]);
                const result = operationComponent.createObject(fake);
                operations = operations.concat([result]);
                return result;
            }
            function list(collection) {
                return operation("list", collection);
            }
            function remove(handle) {
                return operation("remove", handle);
            }
            function importImages(collection, options) {
                lastImportOptions = options;
                return operation("add", collection);
            }
            function openImageArchive(paths) {
                calls = calls.concat([
                    {
                        action: "open",
                        value: paths
                    }
                ]);
                return lease;
            }
            function exportImageArchive(collection, entries, json, name) {
                return operation("export", {
                    collection: collection,
                    entries: entries,
                    json: json,
                    name: name
                });
            }
        }
    }
    Component {
        id: leaseComponent
        QtObject {
            id: lease
            property bool active: true
            property bool ready: false
            property string errorString: ""
            property var entries: [
                {
                    path: "images/a.png",
                    mimeType: "image/png"
                }
            ]
            property var jsonFiles: ({
                    "meta.json": {
                        kind: "folia-tempera-pool",
                        schemaVersion: 1
                    },
                    "pool.json": {
                        layerImages: [
                            {
                                id: "a",
                                scale: .4
                            }
                        ]
                    }
                })
            property bool rejected: false
            signal changed
            function dispose() {
                active = false;
                changed();
            }
            function importInto(collection, entries) {
                const op = service.operation("import", entries);
                if (rejected) {
                    op.fail("rejected");
                    return op;
                }
                ready = false;
                changed();
                return op;
            }
        }
    }
    Component {
        id: draftComponent
        Shared.LayerImageDraft {
            id: localDraft
            commitPatch: patch => {
                ++test.commits;
                if (test.acceptCommit) {
                    localDraft.entries = patch.temperaLayerImages;
                    localDraft.depth = patch.temperaLayerImageDepth;
                    localDraft.frequency = patch.temperaLayerImageFrequency;
                }
                return test.acceptCommit;
            }
        }
    }
    function init() {
        failOnWarning(/TypeError:|ReferenceError:|Binding loop/);
        commits = 0;
        acceptCommit = true;
        service = serviceComponent.createObject(test);
        subject = draftComponent.createObject(test, {
            service: service,
            entries: [
                {
                    id: "old",
                    name: "old.png",
                    align: "free",
                    verticalAlign: "bottom",
                    scale: .7,
                    opacity: 1
                }
            ],
            depth: "back",
            frequency: .3
        });
        verify(subject);
        service.operations[0].succeed({
            assets: [
                {
                    handle: "old",
                    name: "old.png",
                    mimeType: "image/png"
                }
            ]
        });
        subject.open();
    }
    function cleanup() {
        if (subject) {
            subject.destroy();
            subject = null;
        }
        wait(0);
        if (service) {
            service.destroy();
            service = null;
        }
    }
    function test_deferredDeleteAndCommitOnce() {
        subject.remove("old");
        compare(service.calls.length, 1);
        verify(subject.close());
        compare(commits, 1);
        tryVerify(() => service.calls.length >= 2);
        compare(service.calls[1].action, "remove");
        compare(service.calls[1].value, "old");
        verify(subject.busy);
        service.operations[1].succeed({});
        verify(!subject.busy);
        verify(subject.close());
        compare(commits, 1);
    }
    function test_failedCommitPreservesOldOriginal() {
        acceptCommit = false;
        subject.remove("old");
        verify(!subject.close());
        verify(subject.opened);
        compare(service.calls.length, 1);
        verify(subject.errorString.length > 0);
    }
    function test_writeGateAndOuterCancel() {
        subject.add();
        const operation = service.operations[1];
        verify(subject.busy);
        verify(!subject.close());
        subject.add();
        compare(service.calls.length, 2);
        subject.teardown();
        compare(operation.state, 4);
        compare(commits, 0);
    }
    function test_pickerUsesExplicitPartialAndOnlyRemainingCapacity() {
        subject.add();
        compare(service.lastImportOptions, {
            partial: true,
            maxCount: 15
        });
    }
    function test_partialResultReportsRejectedInputsAndKeepsTheGoodAsset() {
        subject.add();
        service.operations[1].succeed({
            assets: [
                {
                    handle: "good",
                    name: "good.png"
                }
            ],
            rejected: [
                {
                    name: "corrupt.png",
                    code: "AssetDecodeError",
                    message: "Invalid image"
                },
                {
                    name: "extra.png",
                    code: "QuotaExceeded",
                    message: "Image capacity reached"
                }
            ]
        });
        compare(subject.draft.images.map(image => image.id), ["old", "good"]);
        compare(subject.notice, "已添加 1 张，未添加 2 张。");
        compare(commits, 0, "draft does not publish settings before close");
    }
    function test_nativeDropOperationUsesTheSameWriteGate() {
        const incoming = operationComponent.createObject(service);
        subject.acceptDrop(incoming);
        verify(subject.busy);
        const overlap = operationComponent.createObject(service);
        subject.acceptDrop(overlap);
        compare(overlap.state, 4);
        incoming.succeed({
            assets: [
                {
                    handle: "drop",
                    name: "drop.png"
                }
            ],
            rejected: []
        });
        compare(subject.draft.images.map(image => image.id), ["old", "drop"]);
        compare(subject.notice, "已添加 1 张，未添加 0 张。");
        verify(!subject.busy);
        subject.teardown();
        const late = operationComponent.createObject(service);
        subject.acceptDrop(late);
        compare(late.state, 4);
    }
    function test_allRejectedImagesRemainVisibleAsAnError() {
        subject.add();
        service.operations[1].succeed({
            assets: [],
            rejected: [
                {
                    name: "broken.png",
                    code: "AssetDecodeError",
                    message: "Image could not be decoded"
                }
            ]
        });
        compare(subject.draft.images.map(image => image.id), ["old"]);
        compare(subject.notice, "已添加 0 张，未添加 1 张。");
        compare(subject.errorString, subject.notice);
    }
    function test_outerIdleCommitsOnce() {
        subject.setTuning({
            depth: "front",
            frequency: .75
        });
        subject.teardown();
        compare(commits, 1);
        subject.teardown();
        compare(commits, 1);
    }
    function test_archiveRejectionDisposesLease() {
        service.lease = leaseComponent.createObject(service, {
            ready: true,
            rejected: true
        });
        subject.importArchive("append");
        verify(!subject.busy);
        verify(!service.lease.active, "Rejected import must release its ready archive reservation");
        compare(subject.draft.images.length, 1);
    }
    function test_archiveOrderAndTuning() {
        service.lease = leaseComponent.createObject(service, {
            ready: true
        });
        subject.importArchive("replace");
        compare(service.calls[2].action, "import");
        verify(subject.busy);
        service.lease.active = false;
        service.lease.changed();
        service.operations[1].succeed({
            assets: [
                {
                    handle: "new",
                    name: "image",
                    entryPath: "images/a.png"
                }
            ]
        });
        compare(subject.draft.images.length, 1);
        compare(subject.draft.images[0].id, "new");
        compare(subject.draft.images[0].scale, .4);
        compare(subject.draft.depth, "back");
        compare(subject.draft.frequency, .3);
        compare(service.calls.filter(call => call.action === "remove").length, 0);
        verify(subject.close());
        tryVerify(() => service.calls.length >= 4);
        compare(service.calls[3].value, "old");
    }
    function test_droppedArchiveAppendsThroughTheSameLeaseGate() {
        const lease = leaseComponent.createObject(service, {
            ready: true
        });
        subject.acceptArchiveDrop(lease);
        verify(subject.busy);
        compare(service.calls[1].action, "import", "native grant does not open a second picker");
        service.operations[1].succeed({
            assets: [
                {
                    handle: "from-drop",
                    name: "Dropped",
                    entryPath: "images/a.png"
                }
            ]
        });
        compare(subject.draft.images.map(image => image.id), ["old", "from-drop"]);
        compare(subject.draft.images[1].scale, .4);
        compare(subject.notice, "已导入 1 张，未导入 0 张。");
        compare(lease.active, false);
        compare(commits, 0);
    }
    function test_overlappingAndLateArchiveDropsReleaseTheirLease() {
        subject.add();
        const lease = leaseComponent.createObject(service, {
            ready: true
        });
        subject.acceptArchiveDrop(lease);
        compare(lease.active, false);
        compare(service.calls.length, 2);
        subject.teardown();
        const late = leaseComponent.createObject(service, {
            ready: true
        });
        subject.acceptArchiveDrop(late);
        compare(late.active, false);
    }
    function test_fullPoolInspectsDroppedArchiveWithoutExtractingImages() {
        subject.draft = Object.assign({}, subject.draft, {
            images: Array.from({
                length: 16
            }, (_, index) => ({
                        id: "full" + index,
                        name: "image" + index,
                        align: "free",
                        verticalAlign: "bottom",
                        scale: .7,
                        opacity: 1
                    }))
        });
        const lease = leaseComponent.createObject(service, {
            ready: true
        });
        subject.acceptArchiveDrop(lease);
        compare(subject.draft.images.length, 16);
        compare(service.calls.length, 1, "full append never calls native archive extraction");
        compare(subject.notice, "图片池已满；未导入 1 张。");
        compare(lease.active, false);
        verify(!subject.busy);
        compare(commits, 0);
    }
}
