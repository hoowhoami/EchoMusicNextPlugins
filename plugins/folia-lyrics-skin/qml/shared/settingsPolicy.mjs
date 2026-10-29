// Folia a8da4437 SettingsPanel Reveal and custom-pack selection contracts.
const assetChoices = {
  cappellaAvatarSource: { collection: 'avatars' },
  cappellaEmojiPackSource: { collection: 'emojis' },
  monetPortraitSource: { collection: 'portrait' },
};
export function assetField(field, available) {
  const choice = assetChoices[field.key];
  if (!choice || !field.options) return field;
  return Object.assign({}, field, {
    options: field.options.map((option) =>
      option.value === 'custom'
        ? Object.assign({}, option, { disabled: available[choice.collection] !== true })
        : option
    ),
  });
}
export function unavailableSelection(patch, available) {
  for (const key of Object.keys(assetChoices)) {
    const choice = assetChoices[key];
    if (patch[key] === 'custom' && available[choice.collection] !== true)
      return { key, collection: choice.collection };
  }
  return null;
}
