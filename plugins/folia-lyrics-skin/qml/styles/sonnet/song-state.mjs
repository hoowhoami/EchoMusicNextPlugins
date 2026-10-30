// Keeps the exact source signature private in the Worker, including saved split changes.
import { getLyricsSignature, decideSongCommit, isInstrumentalConfirmed } from './song-handover.mjs';
export class SongReadiness {
  constructor() {
    this.initialized = false;
    this.committedSeed = undefined;
    this.committedSignature = '';
    this.isInstrumental = false;
    this.pending = null;
  }
  consider(seed, lines, wallMs) {
    const signature = getLyricsSignature(lines);
    const decision =
      !this.initialized && signature !== ''
        ? { action: 'commit', isInstrumental: false }
        : decideSongCommit({
            seed,
            committedSeed: this.committedSeed,
            lyricsSignature: signature,
            committedSignature: this.committedSignature,
            isCommittedInstrumental: this.isInstrumental,
          });
    if (decision.action === 'commit') {
      this.initialized = true;
      this.committedSeed = seed;
      this.committedSignature = signature;
      this.isInstrumental = false;
      this.pending = null;
    } else if (
      decision.action === 'watch' &&
      (!this.pending || this.pending.seed !== seed || this.pending.signature !== signature)
    )
      this.pending = { seed, signature, startedAt: wallMs, sawPlaybackReset: false };
    return decision;
  }
  watch(playbackTime, wallMs) {
    if (!this.pending) return { action: 'idle' };
    const pending = this.pending;
    if (playbackTime < 1) pending.sawPlaybackReset = true;
    if (
      !isInstrumentalConfirmed(
        {
          sawPlaybackReset: pending.sawPlaybackReset,
          playbackTime,
          elapsedMs: wallMs - pending.startedAt,
        },
        { instrumentalCommitSeconds: 2, readyGraceMs: 3000 }
      )
    )
      return { action: 'watch' };
    this.initialized = true;
    this.committedSeed = pending.seed;
    this.committedSignature = '';
    this.isInstrumental = true;
    this.pending = null;
    return { action: 'commit', isInstrumental: true };
  }
}
