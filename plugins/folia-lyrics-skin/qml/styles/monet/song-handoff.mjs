// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
const MONET_HANDOFF_TEXT_SWITCH = 0.5;
const monetTextShowsIncoming = (progress) => progress >= MONET_HANDOFF_TEXT_SWITCH;
const resolveMonetSongText = (shown, handoff, crossed) =>
  handoff && crossed
    ? {
        seed: handoff.seed,
        songTitle: handoff.songTitle,
        songArtist: handoff.songArtist,
        songAlbum: handoff.songAlbum,
        lines: handoff.lines,
        currentTime: handoff.currentTime,
        currentLineIndex: handoff.currentLineIndex,
        theme: handoff.theme,
        subtitleTheme: handoff.subtitleTheme,
      }
    : shown;
export { MONET_HANDOFF_TEXT_SWITCH, monetTextShowsIncoming, resolveMonetSongText };
