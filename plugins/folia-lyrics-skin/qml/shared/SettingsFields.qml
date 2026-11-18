pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import EchoMusic.Theme
import EchoMusic.Controls

ColumnLayout {
    id: root
    required property var fields
    required property var settings
    signal patchRequested(var patch)
    signal editStarted
    signal editCommitted
    spacing: 16
    function update(key: string, value: var): void {
        const patch = {};
        patch[key] = value;
        // The source sliders keep the other endpoint attached when crossing it.
        if (key === "partitaStaggerMin")
            patch.partitaStaggerMax = Math.max(value, settings.partitaStaggerMax);
        else if (key === "partitaStaggerMax")
            patch.partitaStaggerMin = Math.min(value, settings.partitaStaggerMin);
        patchRequested(patch);
    }
    Repeater {
        model: root.fields
        ColumnLayout {
            id: field
            required property var modelData
            Layout.fillWidth: true
            spacing: 8
            visible: !modelData.when || root.settings[modelData.when.key] === modelData.when.value
            enabled: !modelData.enabledWhen || root.settings[modelData.enabledWhen.key] === modelData.enabledWhen.value
            Label {
                Layout.fillWidth: true
                text: field.modelData.title
                color: Theme.floatingText
            }
            Loader {
                Layout.fillWidth: true
                active: field.visible
                sourceComponent: field.modelData.kind === "boolean" ? booleanEditor : field.modelData.kind === "select" ? selectEditor : field.modelData.kind === "color" ? colorEditor : field.modelData.kind === "checklist" ? checklistEditor : rangeEditor
            }
            Component {
                id: booleanEditor
                EchoSwitch {
                    objectName: field.modelData.key
                    colors: Theme.floating
                    checked: root.settings[field.modelData.key]
                    onToggled: root.update(field.modelData.key, checked)
                }
            }
            Component {
                id: selectEditor
                EchoSelect {
                    objectName: field.modelData.key
                    colors: Theme.floating
                    options: field.modelData.options
                    value: root.settings[field.modelData.key]
                    onValueEdited: nextValue => root.update(field.modelData.key, nextValue)
                }
            }
            Component {
                id: colorEditor
                EchoColorPicker {
                    objectName: field.modelData.key
                    value: root.settings[field.modelData.key]
                    onColorEdited: color => root.update(field.modelData.key, color)
                }
            }
            Component {
                id: checklistEditor
                ColumnLayout {
                    Repeater {
                        model: field.modelData.options
                        RowLayout {
                            id: option
                            required property var modelData
                            EchoCheckBox {
                                objectName: field.modelData.key + "-" + option.modelData.value
                                colors: Theme.floating
                                checked: (root.settings[field.modelData.key] || []).indexOf(option.modelData.value) >= 0
                                enabled: !checked || root.settings[field.modelData.key].length > (field.modelData.minimumCount === undefined ? 1 : field.modelData.minimumCount)
                                onToggled: {
                                    const values = Array.from(root.settings[field.modelData.key] || []);
                                    const index = values.indexOf(option.modelData.value);
                                    if (checked && index < 0)
                                        values.push(option.modelData.value);
                                    else if (!checked && index >= 0)
                                        values.splice(index, 1);
                                    root.update(field.modelData.key, values);
                                }
                            }
                            Label {
                                text: option.modelData.label
                                color: Theme.floatingText
                            }
                        }
                    }
                }
            }
            Component {
                id: rangeEditor
                SettingsSlider {
                    objectName: field.modelData.key
                    colors: Theme.floating
                    from: field.modelData.from
                    to: field.modelData.to
                    stepSize: field.modelData.step
                    showValue: true
                    value: root.settings[field.modelData.key]
                    onMoved: root.update(field.modelData.key, value)
                    onEditStarted: root.editStarted()
                    onEditCommitted: root.editCommitted()
                }
            }
        }
    }
}
