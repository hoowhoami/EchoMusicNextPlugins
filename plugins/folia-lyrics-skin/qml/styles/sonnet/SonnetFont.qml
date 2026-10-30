import QtQuick

QtObject {
    required property font base
    property string familyStack: ""
    property font value
    function refresh(): void {
        const families = [];
        let token = "", quote = "", escaped = false;
        for (let index = 0; index < familyStack.length; ++index) {
            const char = familyStack[index];
            if (escaped) { token += char; escaped = false; }
            else if (char === "\\") escaped = true;
            else if (quote) { if (char === quote) quote = ""; else token += char; }
            else if (char === '"' || char === "'") quote = char;
            else if (char === ",") { if (token.trim()) families.push(token.trim()); token = ""; }
            else token += char;
        }
        if (token.trim()) families.push(token.trim());
        value = base;
        if (families.length) value.families = families;
        value.letterSpacing = 0;
        value.wordSpacing = 0;
        value.italic = false;
    }
    onBaseChanged: refresh()
    onFamilyStackChanged: refresh()
    Component.onCompleted: refresh()
}
