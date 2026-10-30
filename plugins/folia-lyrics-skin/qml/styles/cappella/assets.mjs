// Asset order follows Folia a8da4437's Vite glob. Each directory retains its author's grant.
export const avatars = [
  'avatar10',
  'avatar11',
  'avatar12',
  'avatar13',
  'avatar14',
  'avatar15',
  'avatar16',
  'avatar17',
  'avatar2',
  'avatar3',
  'avatar4',
  'avatar5',
  'avatar6',
  'avatar8',
  'avatar9',
];
export const emojis = [
  'happy1',
  'love1',
  'normal1',
  'sleepy1',
  'sleepy2',
  'sleepy3',
  'vibe1',
  'vibe2',
  'vibe3',
];
export function customImages(value) {
  return Array.from(value || [])
    .slice(0, 128)
    .map((item, index) =>
      typeof item === 'string'
        ? { id: String(index), url: item, name: String(index) }
        : item && item.url !== undefined
          ? {
              id: String(item.id || index),
              url: String(item.url),
              name: String(item.name || index),
            }
          : null
    )
    .filter((item) => item && item.url.length > 0);
}
