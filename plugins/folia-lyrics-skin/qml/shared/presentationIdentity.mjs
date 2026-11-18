// Folia a8da4437 buildVisualizerTheme: currentSongId, then geometry-${mode}.
// Keep the public decimal song id as text so qint64 identities never lose precision.
export function geometrySeed(track, mode) {
  if (track) {
    const songId = String(track.songId || '');
    if (/^[1-9][0-9]*$/.test(songId)) return songId;
    if (typeof track.id === 'string' && track.id) return track.id;
    if (typeof track.hash === 'string' && track.hash) return track.hash;
  }
  return 'geometry-' + (mode || 'classic');
}
