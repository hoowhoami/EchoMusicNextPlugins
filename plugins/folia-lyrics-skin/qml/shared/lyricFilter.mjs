// EchoMusic folia-style 7506e1f3 bridge.html filter policy, applied only to this skin.
export const defaultPattern =
  '^([^：]*)：.*$|^([^:]*):.*$|^([^翻唱]*)翻唱.*$|^([^许可]*)许可.*$|^([^音乐人]*)音乐人.*$|^([^国风]*)国风.*$|^([^纯音乐]*)纯音乐.*$|^([^星曜计划]*)星曜计划.*$';
export function compile(pattern, enabled) {
  return enabled === false ? null : new RegExp(String(pattern || defaultPattern));
}
export function project(row, index, firstIndex, matcher, title, artist) {
  if (!row || row.filtered || !matcher) return row;
  const text = String(row.lineText || row.translation || '');
  matcher.lastIndex = 0;
  if (!text || !matcher.test(text)) return row;
  if (index === firstIndex)
    return Object.assign({}, row, {
      lineText:
        (String(title || '').trim() || '未知歌曲') +
        ' - ' +
        (String(artist || '').trim() || '未知歌手'),
      translation: '',
      romanization: '',
      words: [],
      alternateTexts: [],
      filtered: false,
    });
  return Object.assign({}, row, { filtered: true });
}
