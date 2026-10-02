import { PENTATONIC } from './constants';

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

/**
 * 收集音效：按五声音阶随收集序号递进（傅立叶 = 谐波 = 和声）。
 * count 为已收集总数（从 1 开始）。
 */
export function collectSound(count: number, on: boolean): void {
  beep(PENTATONIC[(count - 1) % PENTATONIC.length], 0.12, 'sine', 0.16, on);
}

/** 完美收集琶音：C 大三和弦上行（C4-E4-G4-C5） */
export function perfectArpeggio(on: boolean): void {
  if (!on) return;
  [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
    setTimeout(() => beep(f, 0.25, 'triangle', 0.12, true), i * 90);
  });
}

/** 普通结束音效：上行双音 */
export function finishChord(on: boolean): void {
  beep(660, 0.12, 'triangle', 0.12, on);
  setTimeout(() => beep(880, 0.2, 'triangle', 0.12, on), 110);
}
