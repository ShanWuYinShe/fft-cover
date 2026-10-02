import { PENTATONIC } from './constants';

let audioCtx: AudioContext | null = null;
/** 全局音量（0/0.5/1 三态），由 App 切换并持久化 */
let volume = 1;

export function setVolume(v: number): void {
  volume = v;
  try {
    localStorage.setItem('fft-pointers-volume-v1', String(v));
  } catch {
    /* 忽略 */
  }
}

export function getVolume(): number {
  try {
    return Number(localStorage.getItem('fft-pointers-volume-v1') ?? '1') || 1;
  } catch {
    return 1;
  }
}

function vol(): number {
  return volume;
}

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
    g.gain.setValueAtTime(gain * vol(), audioCtx.currentTime);
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

/**
 * 自动拟合进度音：每跨过 20% 进度播放一个上行五声音阶音符，
 * 呼应"傅立叶逐项逼近"的过程。step 0..4。
 */
export function solveTick(step: number, on: boolean): void {
  const scale = [261.63, 329.63, 392.0, 523.25, 659.26];
  beep(scale[Math.min(step, scale.length - 1)], 0.18, 'triangle', 0.09, on);
}

/** 自动拟合完成音：高八度 C6 短音收尾 */
export function solveDone(on: boolean): void {
  beep(1046.5, 0.3, 'triangle', 0.12, on);
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
