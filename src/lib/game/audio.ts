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
 * 收集音效：主音按五声音阶随收集序号递进，
 * 叠加低八度纯五度和声（更丰满）。count 为已收集总数（从 1 开始）。
 */
export function collectSound(count: number, on: boolean): void {
  const f = PENTATONIC[(count - 1) % PENTATONIC.length];
  beep(f, 0.12, 'sine', 0.14, on);
  beep(f / 1.5, 0.14, 'sine', 0.08, on);
}

let padOsc: OscillatorNode | null = null;
let padGain: GainNode | null = null;

/** 运行时低音持续音（C3），极低音量的氛围垫 */
export function startPad(on: boolean): void {
  if (!on || padOsc) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx ?? new Ctor();
    padOsc = audioCtx.createOscillator();
    padGain = audioCtx.createGain();
    padOsc.type = 'sine';
    padOsc.frequency.value = 130.81; // C3
    padGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    padGain.gain.exponentialRampToValueAtTime(0.035, audioCtx.currentTime + 0.8);
    padOsc.connect(padGain);
    padGain.connect(audioCtx.destination);
    padOsc.start();
  } catch {
    padOsc = null;
  }
}

/** 停止低音垫（淡出） */
export function stopPad(): void {
  try {
    if (padGain && audioCtx) {
      padGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
    }
    if (padOsc) {
      const o = padOsc;
      setTimeout(() => {
        try {
          o.stop();
        } catch {
          /* 已停止则忽略 */
        }
      }, 500);
    }
  } catch {
    /* 忽略 */
  }
  padOsc = null;
  padGain = null;
}

/** 成就解锁音：快速上行三连音 */
export function achvSound(on: boolean): void {
  if (!on) return;
  [523.25, 659.26, 783.99].forEach((f, i) => {
    setTimeout(() => beep(f, 0.12, 'triangle', 0.1, true), i * 70);
  });
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
