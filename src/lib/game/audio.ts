let audioCtx: AudioContext | null = null;

/** 播放一声短音。on=false 时静默；音频不可用时静默失败。 */
export function beep(
  freq: number,
  dur = 0.1,
  type: OscillatorType = 'sine',
  gain = 0.15,
  on = true,
): void {
  if (!on) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx ?? new Ctor();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch {
    /* 音频不可用则忽略 */
  }
}

/** 收集音效：音高随连击上升 */
export function collectSound(combo: number, on: boolean): void {
  beep(500 + combo * 40, 0.1, 'sine', 0.18, on);
}

/** 结束音效：上行双音 */
export function finishChord(on: boolean): void {
  beep(660, 0.12, 'triangle', 0.12, on);
  setTimeout(() => beep(880, 0.2, 'triangle', 0.12, on), 110);
}
